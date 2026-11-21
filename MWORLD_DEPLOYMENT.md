# MWorld Deployment & mAuth Integration Guide (Slate)

This document is an end-to-end operational runbook for an automated agent or engineer deploying **Slate** (`mworld-slate`) as a standalone MWorld app (or re-deploying it for a custom domain / business workspace) and integrating it cleanly with **mAuth**.

---

## 1. Architecture Overview

- **Framework:** Next.js 16 (App Router) compiled for Cloudflare Workers via `@opennextjs/cloudflare`.
- **Worker Entrypoint:** [`cloudflare-worker.ts`](./cloudflare-worker.ts) — exports the `SlateDB` Durable Object class and intercepts WebSocket upgrades for `/api/collab/:designId`, delegating all HTTP routes to `.open-next/worker.js`.
- **Storage & Realtime:** Single SQLite-backed Durable Object binding `SLATE_DB` (`class_name: "SlateDB"`). Schema initializes automatically on first request (no external DB migrations or third-party DB credentials needed).
- **Zero Paid LLM / AI Dependencies:** Canvas editing, photo filters, background removal, PPTX import/export, PDF/SVG/PNG export, charts, tables, and QR codes run locally.
- **Live Reference Deployment:** `https://slate.laflabs-tech.workers.dev`

---

## 2. Environment Variables & Secrets

Configure non-secret variables in [`wrangler.jsonc`](./wrangler.jsonc) (`vars`) or `.env` for local dev. Configure secrets with `wrangler secret put`.

| Variable | Required | Example | Purpose |
| :--- | :--- | :--- | :--- |
| `MAUTH_ENABLED` | Yes | `"true"` | Set `"true"` in production. Set `"false"` only for local dev bypass (`local-dev` workspace). |
| `MAUTH_API_URL` | Yes | `"https://api.mauth.mworld.cloud"` | Base URL for Native mAuth endpoints (`/mAuthGen`, `/mAuthUser/{token}`). |
| `MAUTH_VERIFY_URL` | Yes | `"https://api.mauth.mworld.cloud/mAuthAG/verifyToken"` | Endpoint for verifying `mAuthAgenticToken` headers/query params. |
| `APP_ORIGIN` | Yes | `"https://slate.laflabs-tech.workers.dev"` | Canonical public HTTPS origin of the deployed app (no trailing slash). Must match the domain users visit so mAuth redirects back to `<APP_ORIGIN>/auth`. |
| `MAUTH_APP_NAME` | Yes | `"Slate"` | App display name shown on the mAuth login screen (`options.app_name` on `/mAuthGen`). |
| `MAUTH_BI_ID` | Yes | `"bi-1c9dc4ca-012b-40c3-a44c-0cab72c20779Nov2026"` | **One static MWORLD `bi_id` per app** in format `bi-<uuid><MonYYYY>`. Sent identically in both `/mAuthGen` (`options.bi_id`) and `/mAuthUser/{token}` (`payload.bi_id`). **Generate once per app — never per request.** |
| `MAUTH_LOGO_URL` | Yes | `"https://slate.laflabs-tech.workers.dev/icon.svg"` | Publicly accessible HTTPS logo URL shown on the mAuth login screen (`options.logo_url` on `/mAuthGen`). |
| `SESSION_SECRET` | **Required Secret (Prod)** | *(32+ random bytes)* | HMAC-SHA256 signing key for the `slate_session` cookie. Set via `npx wrangler secret put SESSION_SECRET` (do **not** commit to `wrangler.jsonc`). |
| `UNSPLASH_ACCESS_KEY` | Optional | — | Optional live Unsplash search in `/api/stock` (falls back to built-in curated stock photos if unset). |
| `PEXELS_API_KEY` | Optional | — | Optional live Pexels search in `/api/stock`. |

### Generating a Static `MAUTH_BI_ID` for a New Standalone App

Each standalone app gets **one** static `bi_id` in the MWORLD format `bi-<uuid><MonYYYY>` (e.g. `bi-1c9dc4ca-012b-40c3-a44c-0cab72c20779Nov2026` for Slate):

```bash
node -e '
const crypto = require("node:crypto");
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const d = new Date();
console.log(`bi-${crypto.randomUUID()}${months[d.getUTCMonth()]}${d.getUTCFullYear()}`);
'
```

Store the generated value once in `wrangler.jsonc` (`vars.MAUTH_BI_ID`) and as `DEFAULT_MAUTH_BI_ID` in [`lib/mauth.ts`](./lib/mauth.ts). **Never generate a new random `bi_id` per request.**

---

## 3. How mAuth Works in This System

Slate supports **both** Native mAuth (interactive user login in browser) and Agentic mAuth (launch from MWorld host/agent). All URL/payload helpers live in [`lib/mauth.ts`](./lib/mauth.ts) and server auth orchestration lives in [`lib/auth.ts`](./lib/auth.ts).

### Flow A: Native mAuth (Browser User Login)

```text
Browser                    Slate Server (/api/auth/*)            mAuth API (api.mauth.mworld.cloud)
  |                                   |                                         |
  |-- POST /api/auth/link ----------->|                                         |
  |                                   |-- GET /mAuthGen?origin=...&type=native  |
  |                                   |   &options={app_name,bi_id,logo_url} -->|
  |                                   |<-- { success:true, mAuth:{auth_link} } -|
  |<-- { link: "https://accounts..." }|                                         |
  |                                                                             |
  |-- window.location.href = link (same window) ------------------------------->|
  |<-- Redirect to <origin>/auth?success=true&token=<TOKEN> --------------------|
  |                                                                             |
  |-- POST /api/auth/session -------->|                                         |
  |   Authorization: Bearer <TOKEN>   |-- GET /mAuthUser/<TOKEN>?payload=... -->|
  |   Body: { "token": "<TOKEN>" }    |   {origin,required_user_data,bi_id}     |
  |                                   |<-- { success:true, user_data:{...} } ---|
  |<-- 200 JSON + Set-Cookie:         |                                         |
  |    slate_session=<HMAC>; HttpOnly |                                         |
```

#### Step 1 — Generate Login Link: `GET /mAuthGen`

- **Endpoint:** `GET https://api.mauth.mworld.cloud/mAuthGen`
- **Query Parameters (all values MUST be URL-encoded via `encodeURIComponent`):**
  - `origin` *(required)*: App origin URL (e.g. `https://slate.laflabs-tech.workers.dev`).
  - `type` *(required)*: `"native"`.
  - `options` *(URL-encoded JSON)*: Contains `app_name`, `bi_id` (the app's static `MAUTH_BI_ID`), and `logo_url`.
    - Only include non-empty keys (never send empty strings, `null`, or `undefined` keys; omit `options` entirely if all are absent).
  - `prompt=select_account&force=true` *(optional)*: Added only when the user explicitly requests account switching (`POST /api/auth/link?fresh=1`).

**Slate App `options` JSON (URL-encoded into `?options=...`):**
```json
{
  "app_name": "Slate",
  "bi_id": "bi-1c9dc4ca-012b-40c3-a44c-0cab72c20779Nov2026",
  "logo_url": "https://slate.laflabs-tech.workers.dev/icon.svg"
}
```
Constructed URL:
```text
GET https://api.mauth.mworld.cloud/mAuthGen?origin=https%3A%2F%2Fslate.laflabs-tech.workers.dev&type=native&options=%7B%22app_name%22%3A%22Slate%22%2C%22bi_id%22%3A%22bi-1c9dc4ca-012b-40c3-a44c-0cab72c20779Nov2026%22%2C%22logo_url%22%3A%22https%3A%2F%2Fslate.laflabs-tech.workers.dev%2Ficon.svg%22%7D
```

**Expected mAuth Response:**
```json
{
  "success": true,
  "mAuth": {
    "auth_link": "https://accounts.mworld.cloud/e?a=..."
  }
}
```
Validation enforced by [`validateMAuthLink`](./lib/mauth.ts): `auth_link` must be a valid `https:` URL whose hostname ends with `mworld.cloud`.

---

#### Step 2 — Redirect in the Same Window

The client ([`components/auth-provider.tsx`](./components/auth-provider.tsx)) saves `window.location.origin` to `localStorage["mworld_origin"]` (and any deep-link path to `sessionStorage["slate_return_to"]`), calls `POST /api/auth/link`, and navigates **in the same window**:
```ts
window.location.href = data.link;
```
> Do **not** open `auth_link` in a popup or `<iframe>`.

---

#### Step 3 — Callback Page (`/auth`)

mAuth redirects back to:
```text
<APP_ORIGIN>/auth?success=true&token=<USER_AUTH_TOKEN>
```
[`app/auth/page.tsx`](./app/auth/page.tsx) handles this callback:
1. Guards execution with a `useRef` so verification runs **strictly once** (even under React StrictMode).
2. Stores the token in `localStorage` under `user_auth_token` (and `auth_token`).
3. Sends the token once to `POST /api/auth/session` with `credentials: "include"`, `Authorization: Bearer <TOKEN>`, `x-mworld-origin: <origin>`, and JSON body `{ "token": "<TOKEN>" }`.
4. On `200 OK`, replaces location with `/` (or saved `slate_return_to`). On error, redirects to `/login?auth=failed&reason=...`.

---

#### Step 4 — Verify Token & Fetch User: `GET /mAuthUser/{token}`

- **Endpoint:** `GET https://api.mauth.mworld.cloud/mAuthUser/<ENCODED_TOKEN>?payload=<ENCODED_JSON>`
- **Encoding:** Both `<token>` and `JSON.stringify(payload)` **MUST** be URL-encoded with `encodeURIComponent`.
- **Payload Fields:**
  - `origin` *(required)*: Same app origin used in `/mAuthGen`.
  - `required_user_data` *(required)*: `["fullName", "email", "phone"]`.
  - `bi_id` *(must match `/mAuthGen`)*: The **exact same static `MAUTH_BI_ID`** sent in `options.bi_id` on `/mAuthGen`.
  - **Do NOT include `app_name` or `logo_url` in `/mAuthUser` `payload`.**

**Slate App `payload` JSON:**
```json
{
  "origin": "https://slate.laflabs-tech.workers.dev",
  "required_user_data": ["fullName", "email", "phone"],
  "bi_id": "bi-1c9dc4ca-012b-40c3-a44c-0cab72c20779Nov2026"
}
```

**Expected mAuth Response (handled flexibly by [`extractMAuthUserIdentity`](./lib/mauth.ts)):**
```json
{
  "success": true,
  "user_data": {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+15551234567",
    "citizen_id": "cit-..."
  },
  "bi_data": {
    "bi_id": "bi-12345"
  }
}
```
*(Also supports user fields nested under `data`, `user`, or top-level; `bi_data` is optional.)*

**Session Persistence:**
- Server calls `/mAuthUser/{token}` **once** per login, mints an HMAC-SHA256 signed `HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000; Secure` cookie named `slate_session` ([`lib/session.ts`](./lib/session.ts)), and returns user info JSON.
- Subsequent API requests authenticate via the `slate_session` cookie without re-calling mAuth.

---

### Flow B: Agentic mAuth (MWorld Host / Agent Launch)

When an MWorld host or agent launches or calls Slate with an agentic token:
- Pass `mAuthAgenticToken` either in the HTTP header `mAuthAgenticToken: <TOKEN>` or as a query parameter `?mAuthAgenticToken=<TOKEN>` on the app URL.
- Slate verifies it via:
  ```text
  GET https://api.mauth.mworld.cloud/mAuthAG/verifyToken
  Headers:
    mAuthAgenticToken: <TOKEN>
  ```
- Expected response:
  ```json
  {
    "success": true,
    "data": {
      "bi_id": "bi-...",
      "from": "user"
    }
  }
  ```
  (`from` may be `"user"` or `"agent"`.)
- On `GET /api/auth/me`, Slate promotes the verified agentic identity into a signed `slate_session` cookie automatically.

---

### Workspace / Tenant Isolation Rules

Derived by [`tenantFromIdentity`](./lib/tenant.ts):
1. If a business `bi_id` is present (from `bi_data`, user object, agentic token, or configured `MAUTH_BI_ID`):
   - Tenant ID = `<bi_id>` (labeled **Team Workspace**).
2. Otherwise (standalone user without `bi_id`):
   - Tenant ID = `personal:<email.toLowerCase()>` (or `personal:<citizen_id>` if email is missing; labeled **Personal Studio**).
3. All designs, folders, media uploads, templates, and brand kits in `SlateDB` are scoped by this tenant ID (`bi_id` column). Shared designs (`view` / `comment` / `edit` / `template`) are explicitly authorized by [`resolveCollabAccess`](./lib/collab.ts).

---

## 4. Complete Slate HTTP & WebSocket API Reference

### Authentication APIs

| Method & Path | Auth Required | Request | Response |
| :--- | :--- | :--- | :--- |
| `POST /api/auth/link` | No | Optional query `?fresh=1` to force account picker. | `200 { "link": "https://accounts.mworld.cloud/..." }` |
| `POST /api/auth/session` | User mAuth token | Header `Authorization: Bearer <token>` and/or JSON `{ "token": "<token>" }`. Optional header `x-mworld-origin`. | `200 { authenticated, bi_id, person_key, display_name, email, entity_type, mauth_enabled }` + `Set-Cookie: slate_session=...` |
| `GET /api/auth/me` | Cookie or `mAuthAgenticToken` | Cookie `slate_session` or header/query `mAuthAgenticToken`. | `200 { authenticated, bi_id, person_key, display_name, email, entity_type, mauth_enabled }` (or `401`) |
| `POST /api/auth/logout` | No | — | `200 { "ok": true }` + clears `slate_session` cookie |

### Workspace & Design APIs

| Method & Path | Auth | Description |
| :--- | :--- | :--- |
| `GET /api/designs` | Required | List designs for current workspace (`?trashed=1`, `?folderId=...`, `?q=...`). |
| `POST /api/designs` | Required | Create a new design (blank, from template, or imported PPTX payload). |
| `GET /api/designs/[id]` | Required or Shared | Fetch full design document (enforces workspace ownership or share permissions). |
| `PATCH /api/designs/[id]` | Editor / Owner | Update design pages, title, dimensions, brand style, comments, versions, or trash state. |
| `DELETE /api/designs/[id]` | Owner | Permanently delete a design. |
| `GET /api/share/[id]` | Optional | Fetch shared design metadata & role (`view`, `comment`, `edit`, `template`) for `/share/[id]` or `/design/[id]`. |
| `PATCH /api/share/[id]` | Owner / Collaborator | Update share link access (`off`, `view`, `comment`, `edit`, `template`), invited collaborator list, or guest comments/edits per role. |
| `GET/POST/DELETE /api/folders` | Required | List, create, and delete workspace folders. |
| `GET/POST/DELETE /api/media` | Required | List, upload, and delete workspace images/custom fonts stored in `SlateDB`. |
| `GET/PUT /api/brand-kit` | Required | Read or update workspace brand colors, fonts, and logos. |
| `GET/POST/DELETE /api/templates` | Required | List built-in + team templates; save or delete team templates. |
| `GET/POST /api/stock` | Optional | Search curated stock photos (or Unsplash/Pexels if keys configured) and safely proxy allowed stock image URLs. |

### Realtime Collaboration WebSocket

| Protocol & Path | Auth | Description |
| :--- | :--- | :--- |
| `WSS /api/collab/[designId]` | Cookie (`slate_session`) or Public Share Link | Handled directly in [`cloudflare-worker.ts`](./cloudflare-worker.ts) before OpenNext. Checks design access in primary `SlateDB`, then upgrades into per-design room Durable Object `collab:<designId>` for live cursors, presence, and chunked/asset-stripped real-time page sync. |

---

## 5. Agent Deployment Runbook (Cloudflare Workers)

Execute these steps in order from the repository root:

### Step 1 — Prerequisites & Credentials
Ensure Node.js 20+ and Cloudflare credentials are available:
```bash
export CLOUDFLARE_API_TOKEN="<your-cloudflare-api-token>"
export CLOUDFLARE_ACCOUNT_ID="<your-cloudflare-account-id>"
```
*(Alternatively authenticate interactively via `npx wrangler login`.)*

Install dependencies:
```bash
npm ci
```

### Step 2 — Configure [`wrangler.jsonc`](./wrangler.jsonc)
Verify or update these fields for your target environment:
1. `"name"`: Cloudflare Worker name (e.g. `"slate"`).
2. `"vars.APP_ORIGIN"`: Exact final HTTPS URL where the worker will be served (no trailing slash), e.g. `"https://slate.<subdomain>.workers.dev"` or custom domain `"https://slate.mworld.cloud"`.
3. `"vars.MAUTH_ENABLED"`: `"true"`.
4. `"vars.MAUTH_API_URL"`: `"https://api.mauth.mworld.cloud"`.
5. `"vars.MAUTH_VERIFY_URL"`: `"https://api.mauth.mworld.cloud/mAuthAG/verifyToken"`.
6. `"vars.MAUTH_APP_NAME"`: `"Slate"` (or your app's name).
7. `"vars.MAUTH_BI_ID"`: One static MWORLD ID per app in format `bi-<uuid><MonYYYY>` (e.g. `"bi-1c9dc4ca-012b-40c3-a44c-0cab72c20779Nov2026"` for Slate). **Never generate per request.**
8. `"vars.MAUTH_LOGO_URL"`: `"<APP_ORIGIN>/icon.svg"` (or another public HTTPS logo URL).
9. Keep `"durable_objects"` (`SLATE_DB` → `SlateDB`) and `"migrations"` (`v1` `new_sqlite_classes: ["SlateDB"]`) intact.

### Step 3 — Set Production Secret
Set a strong random `SESSION_SECRET` on the Worker (one-time per Worker; do not hardcode in `wrangler.jsonc`):
```bash
openssl rand -hex 32 | npx wrangler secret put SESSION_SECRET
```
*(Important: Rotating `SESSION_SECRET` invalidates existing `slate_session` cookies, requiring users to sign in again.)*

### Step 4 — Verify Build & Tests Locally
```bash
npm test && npm run typecheck && npm run lint
```
All unit tests (including Native mAuth standalone & business tests in [`lib/slate.test.ts`](./lib/slate.test.ts)), TypeScript checks, and ESLint checks must exit `0`.

### Step 5 — Build OpenNext Bundle & Deploy
```bash
npm run cf:build
npx wrangler deploy
```
*(Or `npm run deploy`, which runs both in sequence.)*

> **Note:** During build you may see a Wrangler warning that `SlateDB` is not exported from the local dev stub. That is expected during `next build`; the real Worker entrypoint [`cloudflare-worker.ts`](./cloudflare-worker.ts) exports `SlateDB` for production Cloudflare deployment.

---

## 6. Post-Deployment Verification Checklist

Run these smoke checks against `<APP_ORIGIN>` immediately after deploy:

```bash
ORIGIN="https://slate.laflabs-tech.workers.dev"

# 1. Landing page serves 200 HTML
curl -sI "$ORIGIN/" | head -n 5

# 2. Public logo URL used in MAUTH_LOGO_URL serves 200 image/svg+xml
curl -sI "$ORIGIN/icon.svg" | head -n 5

# 3. /api/auth/link calls mAuthGen and returns a valid accounts.mworld.cloud URL
curl -s -X POST "$ORIGIN/api/auth/link"
# Expected: {"link":"https://accounts.mworld.cloud/e?a=..."}

# 4. /api/auth/session reaches mAuthUser cleanly without payload errors
curl -s -w "\nHTTP %{http_code}\n" -X POST "$ORIGIN/api/auth/session" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-smoke-token"}'
# Expected: {"error":"Invalid user access token"} + HTTP 401

# 5. Unauthenticated /api/auth/me rejects cleanly
curl -s -w "\nHTTP %{http_code}\n" "$ORIGIN/api/auth/me"
# Expected: {"error":"Sign in required"} + HTTP 401
```

---

## 7. Critical Rules & Gotchas (What the Deploying Agent Must Take Care Of)

1. **`APP_ORIGIN` must match the live browser origin:**
   - mAuth validates that the `origin` passed to `/mAuthGen` matches the `origin` passed to `/mAuthUser/{token}`, and redirects the browser to `<origin>/auth?success=true&token=...`.
   - If you deploy under a custom domain or different `*.workers.dev` subdomain, update **both** `APP_ORIGIN` and `MAUTH_LOGO_URL` in [`wrangler.jsonc`](./wrangler.jsonc) before deploying.
2. **Never send empty or undefined keys in mAuth JSON:**
   - On `/mAuthGen`: strip blank/undefined keys from `options`. If all three (`app_name`, `bi_id`, `logo_url`) are empty, omit `&options=...` completely.
   - On `/mAuthUser/{token}`: include `bi_id` **only** when non-empty and consistent with `/mAuthGen`. Never send `bi_id: ""`, `app_name`, or `logo_url` inside `payload`.
3. **Always URL-encode `origin`, `options`, `token`, and `payload`:**
   - Tokens can contain `/`, `+`, or `=`. Always use [`buildMAuthGenUrl`](./lib/mauth.ts) and [`buildMAuthUserUrl`](./lib/mauth.ts) instead of manual string concatenation.
4. **Call `/mAuthUser/{token}` strictly once per login:**
   - Do not re-verify the raw token on every page load or API request. Verify once in `/auth` → `POST /api/auth/session`, issue the `HttpOnly` `slate_session` cookie, and read the signed cookie on all subsequent requests.
5. **Same-window redirect only:**
   - Always navigate via `window.location.href = auth_link`. Do not use `window.open` popups or embedded iframes for mAuth login.
6. **Never trust client-supplied `bi_id`:**
   - `MAUTH_BI_ID` is read server-side from environment config only (never from browser query/body params on `/api/auth/link` or `/api/auth/session`) to prevent cross-tenant spoofing.
7. **HTTPS & `Secure` Cookies:**
   - In production (`NODE_ENV=production`), `slate_session` is set with `; Secure; HttpOnly; SameSite=Lax`. The app **must** be served over HTTPS (Cloudflare Workers enforces this by default).
8. **Publicly accessible `MAUTH_LOGO_URL`:**
   - The mAuth login UI fetches `logo_url` directly in the user's browser, so it must return `200 OK` without auth cookies (e.g. `<APP_ORIGIN>/icon.svg` or a public `branding.mworld.cloud` URL).
9. **WebSocket collaboration requires `SESSION_SECRET` consistency:**
   - Both the OpenNext server routes and the WebSocket upgrade handler in [`cloudflare-worker.ts`](./cloudflare-worker.ts) verify `slate_session` using `SESSION_SECRET`. Setting it via `wrangler secret put SESSION_SECRET` exposes it to both automatically.
10. **Durable Objects SQLite migration:**
    - On a brand-new Cloudflare Worker name, keep the `migrations` block (`new_sqlite_classes: ["SlateDB"]`) in [`wrangler.jsonc`](./wrangler.jsonc) so Cloudflare provisions the SQLite-backed Durable Object namespace automatically on first deploy.
