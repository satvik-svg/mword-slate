# Slate (`mworld-slate`)

**Slate** is MWorld’s all-in-one visual design studio — a Canva-class web app for presentations, social graphics, posters, edited photos, brand kits, and vector logos.

- **Worker & Project Name:** `mworld-slate`
- **Deploy URL:** `https://mworld-slate.laflabs-tech.workers.dev`
- **Zero LLM / Paid API Keys:** Every editor feature — including the Logo Generator, Photo Editor, in-browser Background Remover, PPTX Importer/Exporter, PDF/SVG/PNG Export, Charts, Tables, and QR Codes — runs 100% locally in the browser.

## Features

- **mAuth & Workspaces:** Native `Log in with mWorld` + `mAuthAgenticToken` launch support with signed `HttpOnly` session cookies and automatic Business (`bi_id`) / Personal (`personal:<email>`) workspace isolation.
- **Canvas Design Studio:** Multi-page artboards, smooth zoom/pan, magnetic alignment & snapping guides, 8-point resize & rotation, marquee multi-select, grouping, locking, layers panel, copy/paste styles, undo/redo, and keyboard shortcuts.
- **Rich Elements:** Google Fonts typography (with shadows, highlights, curved text), Shapes & Lines (solid & gradient fills), Images (filter presets, sliders, quick crop, frame masks, smart in-browser background removal), Recolorable SVG Icons, Freehand Draw, Editable Tables, Bar/Line/Pie/Donut Charts, and QR Codes.
- **Presentations (.pptx):** Import existing `.pptx` files into editable Slate slides, add speaker notes, run full-screen Present Mode, and export back to editable `.pptx` or multi-page PDF.
- **Built-in Logo Generator:** Instant procedural vector logo generator with industry keyword matching, style/mood controls, live mockups, 1-click Brand Kit save, Studio editing, and `.zip` Logo Pack download (SVG + multi-size PNGs).
- **Brand Kit & Team Templates:** Shared brand logos, palettes, and fonts with 1-click **Apply Brand Style**, plus Save as Team Template.
- **Sharing & Collaboration:** Role-based sharing (`view`, `comment`, `edit`, `template`), pinned `(x, y)` comments with replies, and Version History checkpoints.

## Local Development

```bash
npm install
npm run dev
```

For full Cloudflare Workers + Durable Object local preview:

```bash
npm run preview
```

## Deploy to Cloudflare Workers

```bash
npm run deploy
```

Data and uploaded media live in the SQLite-backed Durable Object `SlateDB`. Schema is initialized automatically on first request.
