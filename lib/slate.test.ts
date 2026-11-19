import assert from "node:assert/strict";
import test from "node:test";
import {
  generateLogoConcepts,
  logoConceptToDesignPage,
  matchIconsForKeywords,
  renderLogoConceptSvg,
} from "./logo-generator";
import { magicResizePages } from "./resize";
import { readSessionToken, signSession } from "./session";
import { BUILTIN_TEMPLATES, instantiateTemplate } from "./templates";
import { isPersonalTenant, tenantFromIdentity } from "./tenant";

test("mAuth tenant derives business or personal workspace", () => {
  assert.equal(tenantFromIdentity({ biId: "biz_42", email: "a@b.com" }), "biz_42");
  assert.equal(isPersonalTenant("biz_42"), false);
  assert.equal(tenantFromIdentity({ email: "Alice@MWorld.Cloud" }), "personal:alice@mworld.cloud");
  assert.equal(isPersonalTenant("personal:alice@mworld.cloud"), true);
});

test("HMAC session signs, reads, and rejects tampered tokens", () => {
  const token = signSession({
    biId: "biz_1",
    personKey: "alice@mworld.cloud",
    displayName: "Alice",
    email: "alice@mworld.cloud",
    entityType: "user",
  });
  const claims = readSessionToken(token);
  assert.ok(claims);
  assert.equal(claims.biId, "biz_1");
  assert.equal(claims.email, "alice@mworld.cloud");
  assert.equal(readSessionToken(token + "x"), null);
});

test("Logo Generator creates 12 editable concepts and valid SVG output", () => {
  const icons = matchIconsForKeywords("coffee cafe", "Roast");
  assert.equal(icons[0], "coffee");

  const concepts = generateLogoConcepts({
    brandName: "Slate",
    tagline: "Design Studio",
    industry: "Creative Studio",
  });
  assert.equal(concepts.length, 12);

  const page = logoConceptToDesignPage(concepts[0]);
  assert.ok(page.elements.length >= 2);

  const svg = renderLogoConceptSvg(concepts[0], { transparent: true });
  assert.ok(svg.startsWith("<svg "));
  assert.ok(svg.includes("Slate"));
});

test("Magic Resize reflows elements proportionally across formats", () => {
  const tpl = BUILTIN_TEMPLATES[0];
  const pages = instantiateTemplate(tpl);
  const resized = magicResizePages(pages, tpl.width, tpl.height, 1080, 1920);
  assert.equal(resized.length, pages.length);
  assert.ok(resized[0].elements.length === pages[0].elements.length);
});

import JSZip from "jszip";
import { importPptxBuffer } from "./pptx-import";

test("Built-in templates instantiate with fresh element and page IDs", () => {
  for (const tpl of BUILTIN_TEMPLATES) {
    const a = instantiateTemplate(tpl);
    const b = instantiateTemplate(tpl);
    assert.ok(a.length >= 1);
    assert.notEqual(a[0].id, b[0].id);
    if (a[0].elements.length && b[0].elements.length) {
      assert.notEqual(a[0].elements[0].id, b[0].elements[0].id);
    }
  }
});

test("PPTX importer resolves slideLayout backgrounds, typography, borders, tables, and notes", async () => {
  const zip = new JSZip();
  zip.file(
    "ppt/presentation.xml",
    `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`,
  );
  zip.file(
    "ppt/theme/theme1.xml",
    `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:clrScheme name="Test"><a:dk1><a:srgbClr val="111114"/></a:dk1><a:lt1><a:srgbClr val="FAFAFA"/></a:lt1><a:accent1><a:srgbClr val="2563EB"/></a:accent1></a:clrScheme></a:themeElements></a:theme>`,
  );
  zip.file(
