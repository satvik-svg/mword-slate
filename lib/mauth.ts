export const DEFAULT_MAUTH_API_URL = "https://api.mauth.mworld.cloud";

export const DEFAULT_REQUIRED_USER_DATA = ["fullName", "email", "phone"] as const;

export type MAuthOptionsInput = {
  app_name?: string | null;
  bi_id?: string | null;
  logo_url?: string | null;
};

export type MAuthOptions = {
  app_name?: string;
  bi_id?: string;
  logo_url?: string;
};

export type MAuthUserPayload = {
  origin: string;
  required_user_data: string[];
  bi_id?: string;
};

function trimNonEmpty(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes optional Native mAuth branding/business options (`app_name`, `bi_id`, `logo_url`).
 * Empty, whitespace-only, and undefined fields are stripped. Returns `undefined` if none remain,
 * so callers omit the `options` query parameter completely.
 */
export function normalizeMAuthOptions(input?: MAuthOptionsInput | null): MAuthOptions | undefined {
  if (!input) return undefined;
  const options: MAuthOptions = {};
  const appName = trimNonEmpty(input.app_name);
  const biId = trimNonEmpty(input.bi_id);
  const logoUrl = trimNonEmpty(input.logo_url);
  if (appName) options.app_name = appName;
  if (biId) options.bi_id = biId;
  if (logoUrl) options.logo_url = logoUrl;
  return Object.keys(options).length > 0 ? options : undefined;
}

/**
 * Reads optional Native mAuth app metadata from environment variables.
 * Returns `undefined` when none are set (standalone apps).
 */
export function readMAuthOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): MAuthOptions | undefined {
  return normalizeMAuthOptions({
    app_name: env.MAUTH_APP_NAME,
    bi_id: env.MAUTH_BI_ID,
    logo_url: env.MAUTH_LOGO_URL,
  });
}

/**
 * Constructs `GET /mAuthGen?origin=<ENCODED>&type=native[&options=<ENCODED_JSON>]`.
 * Always URL-encodes `origin` and `options`, and omits `options` entirely when no non-empty fields are provided.
 */
export function buildMAuthGenUrl(params: {
  apiUrl?: string;
  origin: string;
  options?: MAuthOptionsInput | null;
  fresh?: boolean;
}): string {
  const base = (trimNonEmpty(params.apiUrl) || DEFAULT_MAUTH_API_URL).replace(/\/$/, "");
  const origin = trimNonEmpty(params.origin);
  if (!origin) {
    throw new Error("mAuth origin is required");
  }

  const queryParts: string[] = [
    `origin=${encodeURIComponent(origin)}`,
    `type=${encodeURIComponent("native")}`,
  ];

  const options = normalizeMAuthOptions(params.options);
  if (options) {
    queryParts.push(`options=${encodeURIComponent(JSON.stringify(options))}`);
  }

  if (params.fresh) {
    queryParts.push("prompt=select_account");
    queryParts.push("force=true");
  }

  return `${base}/mAuthGen?${queryParts.join("&")}`;
}

/**
 * Constructs the JSON `payload` for `GET /mAuthUser/{token}`.
 * Includes `bi_id` only when non-empty (matching what was sent to `/mAuthGen`).
 */
export function buildMAuthUserPayload(params: {
  origin: string;
  bi_id?: string | null;
  required_user_data?: readonly string[];
}): MAuthUserPayload {
  const origin = trimNonEmpty(params.origin);
  if (!origin) {
    throw new Error("mAuth origin is required");
  }

  const required = (params.required_user_data ?? DEFAULT_REQUIRED_USER_DATA)
    .map((field) => field.trim())
    .filter(Boolean);

  const payload: MAuthUserPayload = {
    origin,
    required_user_data: required.length > 0 ? required : [...DEFAULT_REQUIRED_USER_DATA],
  };

  const biId = trimNonEmpty(params.bi_id);
  if (biId) {
    payload.bi_id = biId;
  }

  return payload;
}

/**
 * Constructs `GET /mAuthUser/<ENCODED_TOKEN>?payload=<ENCODED_JSON>`.
 * Always URL-encodes `token` and `payload`, and never includes empty/undefined keys in JSON.
 */
export function buildMAuthUserUrl(params: {
  apiUrl?: string;
  token: string;
  origin: string;
  bi_id?: string | null;
  required_user_data?: readonly string[];
}): string {
  const base = (trimNonEmpty(params.apiUrl) || DEFAULT_MAUTH_API_URL).replace(/\/$/, "");
  const token = trimNonEmpty(params.token);
  if (!token) {
    throw new Error("mAuth token is required");
  }

  const payload = buildMAuthUserPayload({
    origin: params.origin,
    bi_id: params.bi_id,
    required_user_data: params.required_user_data,
  });

  return `${base}/mAuthUser/${encodeURIComponent(token)}?payload=${encodeURIComponent(JSON.stringify(payload))}`;
}

function pickString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function biIdFromUnknown(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return (
    pickString(record.bi_id) ||
    pickString(record.biId) ||
    pickString(record.business_id) ||
    pickString(record.businessId)
  );
}

export function extractBusinessId(value: unknown): string {
  const direct = biIdFromUnknown(value);
  if (direct) return direct;
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const lists = [record.businesses, record.bi_list, record.business_list];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const id = typeof item === "string" ? item.trim() : biIdFromUnknown(item);
      if (id) return id;
    }
  }
  return "";
}

export function validateMAuthLink(body: unknown): string {
  const link =
    body && typeof body === "object"
      ? pickString((body as { mAuth?: { auth_link?: unknown } }).mAuth?.auth_link)
      : "";
  if (!link) {
    throw new Error("mAuth did not return auth_link");
  }
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    throw new Error("mAuth did not return auth_link");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("mworld.cloud")) {
    throw new Error("mAuth did not return auth_link");
  }
  return parsed.toString();
}

export type ExtractedMAuthIdentity = {
  businessId: string;
  email: string;
  citizenId: string;
  fullName: string;
  phone: string;
};

/**
 * Extracts normalized identity fields from a `GET /mAuthUser/{token}` response.
 * Supports both standalone responses (no `bi_id`) and business responses (with `bi_data` / `bi_id`),
 * falling back to the app's configured `bi_id` when present.
 */
export function extractMAuthUserIdentity(
  body: unknown,
  configuredBiId?: string | null,
): ExtractedMAuthIdentity {
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const user =
    (record.user_data as Record<string, unknown> | undefined) ??
    (record.data as Record<string, unknown> | undefined) ??
    (record.user as Record<string, unknown> | undefined) ??
    record;

  const email = pickString(user.email);
  const citizenId =
    pickString(user.citizen_id) || pickString(user.citizenId) || pickString(user.id);
  const fullName =
    pickString(user.fullName) || pickString(user.full_name) || pickString(user.name);
  const phone = pickString(user.phone) || pickString(user.phoneNumber);
  const businessId =
    extractBusinessId(record.bi_data) ||
    extractBusinessId(user) ||
    extractBusinessId(record) ||
    trimNonEmpty(configuredBiId);

  return {
    businessId,
    email,
    citizenId,
    fullName,
    phone,
  };
}

