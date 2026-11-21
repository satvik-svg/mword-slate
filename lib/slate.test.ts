import assert from "node:assert/strict";
import test from "node:test";
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
    "ppt/slideLayouts/slideLayout1.xml",
    `<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FAFAFA"/></a:solidFill></p:bgPr></p:bg><p:spTree/></p:cSld></p:sldLayout>`,
  );
  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/></Relationships>`,
  );
  zip.file(
    "ppt/notesSlides/notesSlide1.xml",
    `<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Speaker note text</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`,
  );
  zip.file(
    "ppt/slides/slide1.xml",
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="Card"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="609600" y="609600"/><a:ext cx="6096000" cy="3429000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 5000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="E6E6EA"/></a:solidFill><a:ln w="12700"><a:solidFill><a:schemeClr val="dk1"/></a:solidFill></a:ln></p:spPr></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="5486400" cy="1351161"/></a:xfrm><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/><a:p><a:pPr algn="l"><a:lnSpc><a:spcPct val="79000"/></a:lnSpc></a:pPr><a:r><a:rPr sz="5600" spc="-252"><a:solidFill><a:srgbClr val="1A1A1A"/></a:solidFill><a:latin typeface="Inter Tight SemiBold"/></a:rPr><a:t>Hello Slate</a:t></a:r></a:p></p:txBody></p:sp>
      <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="4" name="Table 1"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="914400" y="4572000"/><a:ext cx="5486400" cy="1200000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tr h="450000"><a:tc><a:txBody><a:p><a:r><a:rPr sz="1600"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:rPr><a:t>Input</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="E6E6EA"/></a:solidFill></a:tcPr></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Expected</a:t></a:r></a:p></a:txBody></a:tc></a:tr><a:tr h="450000"><a:tc><a:txBody><a:p><a:r><a:t>Valid</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Pass</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>
    </p:spTree></p:cSld></p:sld>`,
  );

  const buf = await zip.generateAsync({ type: "uint8array" });
  const result = await importPptxBuffer(buf, "Deck.pptx");

  assert.equal(result.title, "Deck");
  assert.equal(result.width, 1920);
  assert.equal(result.height, 1080);
  assert.equal(result.pages.length, 1);

  const slide = result.pages[0];
  assert.equal(slide.background, "#FAFAFA");
  assert.equal(slide.notes, "Speaker note text");

  const shape = slide.elements.find((e) => e.type === "shape");
  assert.ok(shape && shape.type === "shape");
  assert.equal(shape.fill, "#E6E6EA");
  assert.equal(shape.stroke, "#111114");
  assert.ok((shape.borderRadius ?? 0) > 0);

  const text = slide.elements.find((e) => e.type === "text");
  assert.ok(text && text.type === "text");
  assert.equal(text.fontFamily, "Inter Tight");
  assert.equal(text.fontWeight, 600);
  assert.equal(text.fontSize, 112);
  assert.equal(text.lineHeight, 0.95);
  assert.equal(text.letterSpacing, -5);

  const table = slide.elements.find((e) => e.type === "table");
  assert.ok(table && table.type === "table");
  assert.deepEqual(table.rows, [
    ["Input", "Expected"],
    ["Valid", "Pass"],
  ]);
});

import { applyStyleToPage, contrastRatio, isLightColor } from "./brand-style";
import type { DesignPage } from "./types";

test("Brand style keeps cards readable, preserves backgroundImage & transparent strokes, and maintains contrast", () => {
  const slide: DesignPage = {
    id: "pg_1",
    name: "Cover",
    background: "#FFFFFF",
    backgroundImage: "data:image/jpeg;base64,abc",
    elements: [
      {
        id: "card",
        type: "shape",
        shape: "rect",
        x: 100,
        y: 350,
        width: 1100,
        height: 450,
        rotation: 0,
        opacity: 1,
        fill: "#EAEAF0",
        stroke: "transparent",
        strokeWidth: 0,
        borderRadius: 12,
      },
      {
        id: "outline",
        type: "shape",
        shape: "rect",
        x: 1250,
        y: 100,
        width: 200,
        height: 80,
        rotation: 0,
        opacity: 1,
        fill: "transparent",
        stroke: "#333333",
        strokeWidth: 2,
      },
      {
        id: "badge",
        type: "shape",
        shape: "pill",
        x: 1250,
        y: 220,
        width: 140,
        height: 44,
        rotation: 0,
        opacity: 1,
        fill: "#7C3AED",
        stroke: "transparent",
        strokeWidth: 0,
      },
      {
        id: "title",
        type: "text",
        x: 150,
        y: 420,
        width: 950,
        height: 160,
        rotation: 0,
        opacity: 1,
        text: "React Native / Supabase Demo App",
        fontFamily: "Inter",
        fontSize: 72,
        fontWeight: 700,
        color: "#111114",
        align: "left",
        lineHeight: 1.05,
        letterSpacing: -1,
      },
    ],
  };

  const palette = ["#141417", "#2563EB", "#52525B", "#E4E4E7", "#FAFAFA"];
  const styled = applyStyleToPage(slide, {
    colors: palette,
    fonts: { heading: "Plus Jakarta Sans", body: "Inter" },
    applyColors: true,
    applyFonts: true,
    variant: 0,
    pageWidth: 1920,
    pageHeight: 1080,
  });

  // Background image preserved
  assert.equal(styled.backgroundImage, slide.backgroundImage);

  const card = styled.elements.find((e) => e.id === "card");
  const outline = styled.elements.find((e) => e.id === "outline");
  const badge = styled.elements.find((e) => e.id === "badge");
  const title = styled.elements.find((e) => e.id === "title");

  assert.ok(card && card.type === "shape");
  assert.ok(outline && outline.type === "shape");
  assert.ok(badge && badge.type === "shape");
  assert.ok(title && title.type === "text");

  // Container card remains a clean light surface (not painted neon accent)
  assert.equal(isLightColor(card.fill), true);
  // Transparent outline stays transparent
  assert.equal(outline.fill, "transparent");
  // Accent badge receives brand accent
  assert.equal(badge.fill, "#2563EB");
  // Title font updated & maintains strong contrast (>= 4.5) against its enclosing card
  assert.equal(title.fontFamily, "Plus Jakarta Sans");
  assert.ok(contrastRatio(card.fill, title.color) >= 4.5);

  // Fonts-only mode must not alter colors
  const fontsOnly = applyStyleToPage(slide, {
    colors: palette,
    fonts: { heading: "Fraunces", body: "DM Sans" },
    applyColors: false,
    applyFonts: true,
  });
  const fontsOnlyCard = fontsOnly.elements.find((e) => e.id === "card");
  const fontsOnlyTitle = fontsOnly.elements.find((e) => e.id === "title");
  assert.ok(fontsOnlyCard && fontsOnlyCard.type === "shape");
  assert.ok(fontsOnlyTitle && fontsOnlyTitle.type === "text");
  assert.equal(fontsOnlyCard.fill, "#EAEAF0");
  assert.equal(fontsOnlyTitle.fontFamily, "Fraunces");
});

import {
  cleanFontNameFromFile,
  fontFormatFromFile,
  googleFontStylesheetUrl,
} from "./custom-fonts";
import { buildSwatchChartShades } from "./brand-style";

test("Custom font helpers sanitize uploaded filenames and build Google Fonts CSS URLs", () => {
  assert.equal(cleanFontNameFromFile("Satoshi-Bold_2026.woff2"), "Satoshi Bold 2026");
  assert.equal(cleanFontNameFromFile("MyBrand.otf"), "MyBrand");
  assert.equal(fontFormatFromFile("MyBrand.woff2"), "woff2");
  assert.equal(fontFormatFromFile("MyBrand.otf"), "opentype");
  assert.equal(fontFormatFromFile("MyBrand.ttf"), "truetype");
  assert.ok(
    googleFontStylesheetUrl("Libre Baskerville").startsWith(
      "https://fonts.googleapis.com/css2?family=Libre+Baskerville:",
    ),
  );
});

test("Brand style keeps dark gradients dark on shuffle, recolors chart series, and applies subheading font", () => {
  const darkStory: DesignPage = {
    id: "pg_dark",
    name: "Story",
    background: "#0F172A",
    backgroundGradientTo: "#7C3AED",
    elements: [
      {
        id: "h1",
        type: "text",
        x: 80,
        y: 120,
        width: 900,
        height: 160,
        rotation: 0,
        opacity: 1,
        text: "BUILD BRANDS",
        fontFamily: "Inter",
        fontSize: 84,
        fontWeight: 800,
        color: "#FFFFFF",
        align: "center",
        lineHeight: 1.05,
        letterSpacing: -1,
      },
      {
        id: "sub",
        type: "text",
        x: 80,
        y: 300,
        width: 900,
        height: 60,
        rotation: 0,
        opacity: 1,
        text: "LIVE WORKSHOP",
        fontFamily: "Inter",
        fontSize: 26,
        fontWeight: 600,
        color: "#FDE047",
        align: "center",
        lineHeight: 1.2,
        letterSpacing: 2,
      },
      {
        id: "body",
        type: "text",
        x: 80,
        y: 400,
        width: 900,
        height: 90,
        rotation: 0,
        opacity: 1,
        text: "Join 1,200+ creators.",
        fontFamily: "Inter",
        fontSize: 18,
        fontWeight: 400,
        color: "#E2E8F0",
        align: "center",
        lineHeight: 1.4,
        letterSpacing: 0,
      },
      {
        id: "chart1",
        type: "chart",
        chartKind: "bar",
        title: "Overview",
        x: 120,
        y: 540,
        width: 800,
        height: 400,
        rotation: 0,
        opacity: 1,
        accentColor: "#4F46E5",
        textColor: "#FFFFFF",
        data: [
          { label: "Q1", value: 38, color: "#4F46E5" },
          { label: "Q2", value: 54, color: "#06B6D4" },
          { label: "Q3", value: 72, color: "#F43F5E" },
        ],
      },
    ],
  };

  const palette = ["#14261E", "#15803D", "#4D7C5D", "#E7F0EA", "#F9FBF9"];
  const styled = applyStyleToPage(darkStory, {
    colors: palette,
    fonts: { heading: "Space Grotesk", subheading: "Outfit", body: "DM Sans" },
    applyColors: true,
    applyFonts: true,
    variant: 1,
    pageWidth: 1080,
    pageHeight: 1920,
  });

  // Both gradient stops stay dark on variant 1 of a dark page
  assert.equal(isLightColor(styled.background), false);
  assert.ok(styled.backgroundGradientTo);
  assert.equal(isLightColor(styled.backgroundGradientTo), false);

  // Heading, subheading, and body fonts are applied to their matching tiers
  const h1 = styled.elements.find((e) => e.id === "h1");
  const sub = styled.elements.find((e) => e.id === "sub");
  const body = styled.elements.find((e) => e.id === "body");
  assert.ok(h1 && h1.type === "text" && h1.fontFamily === "Space Grotesk");
  assert.ok(sub && sub.type === "text" && sub.fontFamily === "Outfit");
  assert.ok(body && body.type === "text" && body.fontFamily === "DM Sans");

  // Chart bars adopt the brand palette instead of keeping old defaults
  const chart = styled.elements.find((e) => e.id === "chart1");
  assert.ok(chart && chart.type === "chart");
  assert.notEqual(chart.data[0].color, "#4F46E5");
  assert.notEqual(chart.data[1].color, "#06B6D4");
  assert.ok(contrastRatio(styled.background, chart.textColor) >= 4.5);

  const shades = buildSwatchChartShades("#2563EB", 4);
  assert.equal(shades.length, 4);
  assert.equal(shades[0], "#2563EB");
  assert.notEqual(shades[1], shades[0]);
});

import { buildPageSvgString } from "./exporter";
import { computeRotatedResize } from "./geometry";
import { extractReferencedCustomFonts, mergeGuestComments } from "./share-helpers";
import type { CustomFontItem, DesignComment } from "./types";

test("mergeGuestComments enforces append-only comment/reply merges and prevents tampering", () => {
  const existing: DesignComment[] = [
    {
      id: "cmt_1",
      pageId: "pg_1",
      x: 20,
      y: 30,
      authorName: "Owner",
      authorEmail: "owner@mworld.cloud",
      text: "Original thread",
      resolved: false,
      createdAt: 1000,
      replies: [
        {
          id: "rep_1",
          authorName: "Owner",
          authorEmail: "owner@mworld.cloud",
          text: "First reply",
          createdAt: 1001,
        },
      ],
    },
  ];

  // Guest attempts to delete existing thread, tamper text, tamper reply, resolve, and append a reply + new comment
  const incoming: DesignComment[] = [
    {
      id: "cmt_1",
      pageId: "pg_1",
      x: 99,
      y: 99,
      authorName: "Hacker",
      authorEmail: "evil@test.com",
      text: "Tampered text",
      resolved: true,
      createdAt: 9999,
      replies: [
        {
          id: "rep_1",
          authorName: "Hacker",
          authorEmail: "evil@test.com",
          text: "Tampered reply",
          createdAt: 9999,
        },
        {
          id: "rep_2",
          authorName: "Spoofed",
          authorEmail: "spoof@test.com",
          text: "Legit reply",
          createdAt: 2000,
        },
      ],
    },
    {
      id: "cmt_2",
      pageId: "pg_1",
      x: 150, // out of range -> clamped to 100
      y: -10, // out of range -> clamped to 0
      authorName: "Spoofed",
      authorEmail: "spoof@test.com",
      text: "New guest comment",
      resolved: true, // new comments always start unresolved
      createdAt: 2005,
      replies: [],
    },
  ];

  const merged = mergeGuestComments(existing, incoming, {
    name: "Alice Reviewer",
    email: "alice@mworld.cloud",
  });

  assert.equal(merged.length, 2);
  // Existing thread text, author, and original reply cannot be modified
  assert.equal(merged[0].text, "Original thread");
  assert.equal(merged[0].authorName, "Owner");
  assert.equal(merged[0].resolved, true);
  assert.equal(merged[0].replies.length, 2);
  assert.equal(merged[0].replies[0].text, "First reply");
  assert.equal(merged[0].replies[1].text, "Legit reply");
  assert.equal(merged[0].replies[1].authorName, "Alice Reviewer");
  assert.equal(merged[0].replies[1].authorEmail, "alice@mworld.cloud");

  // New comment is appended with clamped coords, actor identity, and resolved=false
  assert.equal(merged[1].id, "cmt_2");
  assert.equal(merged[1].x, 100);
  assert.equal(merged[1].y, 0);
  assert.equal(merged[1].resolved, false);
  assert.equal(merged[1].authorName, "Alice Reviewer");

  // Attempting to delete existing threads by submitting an empty array preserves them
  const preserved = mergeGuestComments(existing, [], { name: "Guest", email: "" });
  assert.equal(preserved.length, 1);
  assert.equal(preserved[0].id, "cmt_1");
});

test("extractReferencedCustomFonts returns only custom fonts used by text or table elements", () => {
  const fonts: CustomFontItem[] = [
    { id: "f1", name: "Satoshi", source: "upload", dataUrl: "data:font/woff2;base64,AA", format: "woff2", createdAt: 1 },
    { id: "f2", name: "Bricolage Grotesque", source: "google", createdAt: 2 },
    { id: "f3", name: "Unused Brand Font", source: "google", createdAt: 3 },
  ];
  const pages: DesignPage[] = [
    {
      id: "pg_1",
      name: "Slide 1",
      background: "#FFFFFF",
      elements: [
        {
          id: "t1",
          type: "text",
          x: 0,
          y: 0,
          width: 400,
          height: 80,
          rotation: 0,
          opacity: 1,
          text: "Headline",
          fontFamily: "Satoshi",
          fontSize: 48,
          fontWeight: 700,
          color: "#111114",
          align: "left",
          lineHeight: 1.2,
          letterSpacing: 0,
        },
        {
          id: "tb1",
          type: "table",
          x: 0,
          y: 100,
          width: 400,
          height: 200,
          rotation: 0,
          opacity: 1,
          rows: [["A", "B"]],
          headerBg: "#111114",
          headerColor: "#FFFFFF",
          cellBg: "#FFFFFF",
          cellColor: "#111114",
          borderColor: "#E2E8F0",
          fontSize: 16,
          fontFamily: "Bricolage Grotesque",
        },
      ],
    },
  ];

  const referenced = extractReferencedCustomFonts(pages, fonts);
  assert.deepEqual(
    referenced.map((f) => f.name),
    ["Satoshi", "Bricolage Grotesque"],
  );
});

test("computeRotatedResize pins opposite edge/corner accurately at 0°, 90°, and 45°", () => {
  // 0 degrees: dragging East by +50 increases width by 50 and keeps left edge pinned at x=100
  const r0 = computeRotatedResize({
    handle: "e",
    origX: 100,
    origY: 100,
    origW: 200,
    origH: 100,
    rotationDeg: 0,
    dx: 50,
    dy: 0,
  });
  assert.equal(Math.round(r0.width), 250);
  assert.equal(Math.round(r0.height), 100);
  assert.equal(Math.round(r0.x), 100);
  assert.equal(Math.round(r0.y), 100);

  // 90 degrees clockwise: local +x (East handle) points downward (+dy)
  // Dragging world dy = +40 should extend width by 40 while pinning the opposite West edge in world space
  const r90 = computeRotatedResize({
    handle: "e",
    origX: 100,
    origY: 100,
    origW: 200,
    origH: 100,
    rotationDeg: 90,
    dx: 0,
    dy: 40,
  });
  assert.equal(Math.round(r90.width), 240);
  assert.equal(Math.round(r90.height), 100);
  // Original center is (200, 150); local West edge is at world (200, 50)
  // New center should be (200, 170) so West edge stays at (200, 170 - 120) = (200, 50)
  const newCx = r90.x + r90.width / 2;
  const newCy = r90.y + r90.height / 2;
  assert.equal(Math.round(newCx), 200);
  assert.equal(Math.round(newCy), 170);

  // 45 degrees + aspect lock on SE corner: maintains aspect ratio 2:1
  const r45 = computeRotatedResize({
    handle: "se",
    origX: 100,
    origY: 100,
    origW: 200,
    origH: 100,
    rotationDeg: 45,
    dx: 70.71,
    dy: 70.71,
    lockAspect: true,
  });
  assert.ok(Math.abs(r45.width / r45.height - 2) < 0.02);
  assert.ok(r45.width > 290);
});

test("buildPageSvgString exports polygons, curved text, charts, tables, QR codes, image masks, and flip transforms", () => {
  const page: DesignPage = {
    id: "pg_svg",
    name: "Full Export",
    background: "#0F172A",
    backgroundGradientTo: "#1E293B",
    backgroundGradientAngle: 135,
    elements: [
      {
        id: "sh_star",
        type: "shape",
        shape: "star",
        x: 40,
        y: 40,
        width: 120,
        height: 120,
        rotation: 0,
        opacity: 1,
        fill: "#F59E0B",
        stroke: "#FFFFFF",
        strokeWidth: 2,
        flipX: true,
      },
      {
        id: "sh_blob",
        type: "shape",
        shape: "blob",
        x: 200,
        y: 40,
        width: 140,
        height: 120,
        rotation: 0,
        opacity: 1,
        fill: "#4F46E5",
        stroke: "transparent",
        strokeWidth: 0,
      },
      {
        id: "txt_curved",
        type: "text",
        x: 40,
        y: 200,
        width: 320,
        height: 90,
        rotation: 0,
        opacity: 1,
        text: "Curved Slate Title",
        fontFamily: "Inter",
        fontSize: 32,
        fontWeight: 700,
        color: "#FFFFFF",
        align: "center",
        lineHeight: 1.2,
        letterSpacing: 0,
        curve: 40,
      },
      {
        id: "tbl_1",
        type: "table",
        x: 400,
        y: 40,
        width: 360,
        height: 160,
        rotation: 0,
        opacity: 1,
        rows: [
          ["Metric", "Value"],
          ["ARR", "$2.4M"],
        ],
        headerBg: "#1E293B",
        headerColor: "#FFFFFF",
        cellBg: "#FFFFFF",
        cellColor: "#0F172A",
        borderColor: "#CBD5E1",
        fontSize: 16,
        fontFamily: "Inter",
      },
      {
        id: "ch_bar",
        type: "chart",
        chartKind: "bar",
        title: "Revenue",
        x: 400,
        y: 240,
        width: 360,
        height: 220,
        rotation: 0,
        opacity: 1,
        accentColor: "#2563EB",
        textColor: "#FFFFFF",
        showValues: true,
        data: [
          { label: "Q1", value: 40, color: "#2563EB" },
          { label: "Q2", value: 85, color: "#06B6D4" },
        ],
      },
      {
        id: "qr_1",
        type: "qrcode",
        x: 40,
        y: 340,
        width: 160,
        height: 160,
        rotation: 0,
        opacity: 1,
        value: "https://slate.laflabs-tech.workers.dev",
        fgColor: "#0F172A",
        bgColor: "#FFFFFF",
      },
      {
        id: "img_1",
        type: "image",
        x: 220,
        y: 340,
        width: 160,
        height: 120,
        rotation: 0,
        opacity: 1,
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        fit: "cover",
        borderRadius: 0,
        mask: "laptop",
        filters: { preset: "none", brightness: 100, contrast: 100, saturation: 100, blur: 0, hue: 0, vignette: 0 },
      },
    ],
  };

  const svg = buildPageSvgString(page, 960, 540, false);
  assert.ok(svg.startsWith("<svg "));
  assert.ok(svg.includes('<linearGradient id="bgGrad"'));
  assert.ok(svg.includes("<polygon points=")); // star shape
  assert.ok(svg.includes("scale(-1,1)")); // flipX transform
  assert.ok(svg.includes("<textPath")); // curved text
  assert.ok(svg.includes("Curved Slate Title"));
  assert.ok(svg.includes("Metric") && svg.includes("$2.4M")); // table cells
  assert.ok(svg.includes("Revenue") && svg.includes("Q2")); // chart title + labels
  assert.ok(svg.includes("<clipPath")); // laptop mask clip
  // Vector QR code emits dark module <rect> elements
  assert.ok(svg.includes('fill="#0F172A"'));
});

test("PPTX importer honors presentation slide order, parses native charts, and preserves image originalSrc", async () => {
  const zip = new JSZip();
  // presentation.xml explicitly orders rId2 (slide2) BEFORE rId1 (slide1)
  zip.file(
    "ppt/presentation.xml",
    `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`,
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/></Relationships>`,
  );
  zip.file(
    "ppt/slides/slide1.xml",
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="T1"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="500000" y="500000"/><a:ext cx="3000000" cy="800000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:t>Second In Deck</a:t></a:r></a:p></p:txBody></p:sp>
      <p:pic><p:nvPicPr><p:cNvPr id="3" name="Photo"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rIdImg"/></p:blipFill><p:spPr><a:xfrm><a:off x="500000" y="1500000"/><a:ext cx="2000000" cy="1500000"/></a:xfrm></p:spPr></p:pic>
    </p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`,
  );
  // Minimal 1x1 PNG bytes
  zip.file(
    "ppt/media/image1.png",
    Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")),
  );
  zip.file(
    "ppt/slides/slide2.xml",
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="T2"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="500000" y="500000"/><a:ext cx="3000000" cy="800000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:t>First In Deck</a:t></a:r></a:p></p:txBody></p:sp>
      <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="4" name="Chart 1"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="500000" y="1500000"/><a:ext cx="5000000" cy="3000000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rIdChart"/></a:graphicData></a:graphic></p:graphicFrame>
    </p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    "ppt/slides/_rels/slide2.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`,
  );
  zip.file(
    "ppt/charts/chart1.xml",
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:title><c:tx><c:rich><a:p><a:r><a:t>Quarterly Sales</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:barChart><c:ser><c:cat><c:strRef><c:strCache><c:pt idx="0"><c:v>Q1</c:v></c:pt><c:pt idx="1"><c:v>Q2</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>42</c:v></c:pt><c:pt idx="1"><c:v>88</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>`,
  );

  const buf = await zip.generateAsync({ type: "uint8array" });
  const imported = await importPptxBuffer(buf, "Ordered.pptx");

  assert.equal(imported.pages.length, 2);
  // Slide 2 appears FIRST because of <p:sldIdLst>
  const firstText = imported.pages[0].elements.find((e) => e.type === "text");
  assert.ok(firstText && firstText.type === "text");
  assert.equal(firstText.text, "First In Deck");

  // Native chart was imported on first slide
  const chart = imported.pages[0].elements.find((e) => e.type === "chart");
  assert.ok(chart && chart.type === "chart");
  assert.equal(chart.chartKind, "bar");
  assert.equal(chart.title, "Quarterly Sales");
  assert.equal(chart.data.length, 2);
  assert.equal(chart.data[0].label, "Q1");
  assert.equal(chart.data[0].value, 42);
  assert.equal(chart.data[1].label, "Q2");
  assert.equal(chart.data[1].value, 88);

  // Slide 1 appears SECOND, and its image preserves originalSrc
  const secondText = imported.pages[1].elements.find((e) => e.type === "text");
  assert.ok(secondText && secondText.type === "text");
  assert.equal(secondText.text, "Second In Deck");

  const img = imported.pages[1].elements.find((e) => e.type === "image");
  assert.ok(img && img.type === "image");
  assert.ok(img.src.startsWith("data:image/png;base64,"));
  assert.equal(img.originalSrc, img.src);
});

import {
  ASSET_REF_PREFIX,
  canRoleBroadcastComments,
  canRoleBroadcastDesign,
  chunkString,
  collabColorForSeed,
  hydratePageMedia,
  initialsFromName,
  resolveCollabAccess,
  stripPageMediaForSync,
} from "./collab";
import { parsePageRange } from "./exporter";
import {
  computeAlignElements,
  computeDistributeElements,
  computeGroupResize,
  computeGroupRotation,
  computeSpacingGuides,
  getSelectionBounds,
} from "./geometry";
import { DEFAULT_IMAGE_FILTERS, type CanvasElement, type ShapeElement } from "./types";

function makeRect(id: string, x: number, y: number, width: number, height: number, extra?: Partial<ShapeElement>): ShapeElement {
  return {
    id,
    type: "shape",
    shape: "rect",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    fill: "#2563EB",
    stroke: "transparent",
    strokeWidth: 0,
    ...extra,
  };
}

test("Multi-select bounding box computes group resize and group rotation accurately", () => {
  const els: CanvasElement[] = [
    makeRect("a", 100, 100, 100, 100),
    makeRect("b", 300, 100, 100, 100),
  ];
  const bounds = getSelectionBounds(els);
  assert.ok(bounds);
  assert.equal(bounds.x, 100);
  assert.equal(bounds.y, 100);
  assert.equal(bounds.width, 300);
  assert.equal(bounds.height, 100);

  // Double width from east handle: x stays 100, width becomes 600
  const resized = computeGroupResize({
    handle: "e",
    groupBounds: bounds,
    items: els.map((e) => ({ id: e.id, x: e.x, y: e.y, width: e.width, height: e.height })),
    dx: 300,
    dy: 0,
  });
  assert.equal(resized.bounds.width, 600);
  const aResized = resized.updates.find((u) => u.id === "a")!;
  const bResized = resized.updates.find((u) => u.id === "b")!;
  assert.equal(aResized.x, 100);
  assert.equal(aResized.width, 200);
  assert.equal(bResized.x, 500);
  assert.equal(bResized.width, 200);

  // Rotate 90deg around group center (250, 150)
  const rotated = computeGroupRotation({
    pivotX: bounds.cx,
    pivotY: bounds.cy,
    deltaDeg: 90,
    items: els.map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      rotation: e.rotation,
    })),
  });
  const aRot = rotated.find((r) => r.id === "a")!;
  const bRot = rotated.find((r) => r.id === "b")!;
  assert.equal(aRot.rotation, 90);
  assert.equal(bRot.rotation, 90);
  // Center of A was (150, 150) -> rotated 90deg CW around (250, 150) -> (250, 50) => x=200, y=0
  assert.equal(aRot.x, 200);
  assert.equal(aRot.y, 0);
  // Center of B was (350, 150) -> rotated 90deg CW around (250, 150) -> (250, 250) => x=200, y=200
  assert.equal(bRot.x, 200);
  assert.equal(bRot.y, 200);
});

test("Align aligns single elements to canvas and multi-selection to shared bounds; Distribute evens gaps", () => {
  const els: CanvasElement[] = [
    makeRect("a", 50, 100, 100, 80),
    makeRect("b", 180, 200, 100, 80),
    makeRect("c", 550, 300, 100, 80),
    makeRect("locked", 20, 20, 40, 40, { locked: true }),
  ];

  // Single selection -> aligns to canvas (1000 x 800)
  const singleCenter = computeAlignElements(els, ["a"], "centerX", 1000, 800);
  assert.equal(singleCenter.find((e) => e.id === "a")!.x, 450);

  // Multi selection -> aligns to shared bounding box (x: 50..650), skipping locked
  const multiRight = computeAlignElements(els, ["a", "b", "c", "locked"], "right", 1000, 800);
  assert.equal(multiRight.find((e) => e.id === "a")!.x, 550);
  assert.equal(multiRight.find((e) => e.id === "b")!.x, 550);
  assert.equal(multiRight.find((e) => e.id === "c")!.x, 550);
  assert.equal(multiRight.find((e) => e.id === "locked")!.x, 20);

  // Horizontal distribute: span 50..650 = 600, total width = 300, gap = 150 -> b moves to 300
  const distH = computeDistributeElements(els, ["a", "b", "c"], "h");
  assert.equal(distH.find((e) => e.id === "a")!.x, 50);
  assert.equal(distH.find((e) => e.id === "b")!.x, 300);
  assert.equal(distH.find((e) => e.id === "c")!.x, 550);

  // Vertical distribute: span 100..380 = 280, total height = 240, gap = 20 -> b stays at 200
  const distV = computeDistributeElements(els, ["a", "b", "c"], "v");
  assert.equal(distV.find((e) => e.id === "b")!.y, 200);
});

test("computeSpacingGuides reports exact gap distances to adjacent elements and canvas edges", () => {
  const leftEl = makeRect("left", 100, 100, 100, 100);
  const movingEl = makeRect("mid", 224, 100, 100, 100); // 24px gap from leftEl
  const rightEl = makeRect("right", 384, 100, 100, 100); // 60px gap from movingEl
  const all: CanvasElement[] = [leftEl, movingEl, rightEl];
  const guides = computeSpacingGuides(
    { x: 224, y: 100, width: 100, height: 100, cx: 274, cy: 150 },
    new Set(["mid"]),
    all,
    1000,
    800,
  );
  const hDists = guides
    .filter((g) => g.orientation === "h")
    .map((g) => g.distance)
    .sort((a, b) => a - b);
  assert.deepEqual(hDists, [24, 60]);
  // Top edge distance to canvas = 100px
  const topGuide = guides.find((g) => g.orientation === "v" && g.y1 === 0);
  assert.ok(topGuide);
  assert.equal(topGuide.distance, 100);
});

test("parsePageRange resolves single pages, reversed ranges, duplicates, and out-of-bounds indices", () => {
  assert.deepEqual(parsePageRange("1, 3-5, 4", 6), [0, 2, 3, 4]);
  assert.deepEqual(parsePageRange("5-3", 6), [2, 3, 4]);
  assert.deepEqual(parsePageRange("0, 2, 99", 4), [1]);
  assert.deepEqual(parsePageRange("", 4), [0, 1, 2, 3]);
  assert.deepEqual(parsePageRange("abc", 4), []);
});

test("Collab access control resolves workspace owners, invited emails, and share links", () => {
  const shareConfig = {
    linkAccess: "comment" as const,
    people: [
      { email: "editor@mworld.cloud", access: "edit" as const, addedAt: 1 },
      { email: "viewer@mworld.cloud", access: "view" as const, addedAt: 2 },
    ],
  };

  assert.equal(
    resolveCollabAccess({ designBiId: "biz_1", shareConfig, viewerBiId: "biz_1" }),
    "full",
  );
  assert.equal(
    resolveCollabAccess({
      designBiId: "biz_1",
      shareConfig,
      viewerBiId: "biz_2",
      viewerEmail: "EDITOR@mworld.cloud",
    }),
    "edit",
  );
  assert.equal(
    resolveCollabAccess({
      designBiId: "biz_1",
      shareConfig,
      viewerEmail: "guest@other.com",
    }),
    "comment",
  );
  assert.equal(
    resolveCollabAccess({
      designBiId: "biz_1",
      shareConfig: { linkAccess: "off", people: [] },
      viewerEmail: "guest@other.com",
    }),
    null,
  );

  assert.equal(canRoleBroadcastDesign("full"), true);
  assert.equal(canRoleBroadcastDesign("edit"), true);
  assert.equal(canRoleBroadcastDesign("comment"), false);
  assert.equal(canRoleBroadcastComments("comment"), true);
  assert.equal(canRoleBroadcastComments("view"), false);
  assert.equal(initialsFromName("Satvik Sharma"), "SS");
  assert.equal(initialsFromName("Slate"), "SL");
  assert.ok(collabColorForSeed("user_1").startsWith("#"));
});

test("buildPageSvgString preserves image frame cropZoom/cropOffset and rich text transform/stroke", () => {
  const page: DesignPage = {
    id: "pg_crop",
    name: "Crop & Text FX",
    background: "#FFFFFF",
    elements: [
      {
        id: "img_crop",
        type: "image",
        x: 40,
        y: 40,
        width: 300,
        height: 200,
        rotation: 0,
        opacity: 1,
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        fit: "cover",
        borderRadius: 16,
        mask: "none",
        cropZoom: 1.5,
        cropOffsetX: 25,
        cropOffsetY: -25,
        filters: {
          preset: "none",
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
          hue: 0,
          vignette: 0,
        },
      },
      {
        id: "txt_fx",
        type: "text",
        x: 40,
        y: 280,
        width: 400,
        height: 80,
        rotation: 0,
        opacity: 1,
        text: "hello slate",
        fontFamily: "Inter",
        fontSize: 40,
        fontWeight: 800,
        color: "#FFFFFF",
        align: "left",
        lineHeight: 1.2,
        letterSpacing: 2,
        textTransform: "uppercase",
        strokeColor: "#111114",
        strokeWidth: 3,
      },
    ],
  };

  const svg = buildPageSvgString(page, 800, 600, false);
  assert.ok(svg.includes("scale(1.5)"));
  assert.ok(svg.includes('clip-path="url(#imgClip_0)"'));
  assert.ok(svg.includes("HELLO SLATE"));
  assert.ok(svg.includes('stroke="#111114"'));
  assert.ok(svg.includes('stroke-width="3"'));
});

import { applyMagicWandErase, applyMaskBrushStroke } from "./photo-tools";
import { filterCuratedStock, isAllowedStockImageUrl } from "./stock-media";

test("Magic Eraser brush erases alpha smoothly and restores original RGBA pixels cleanly", () => {
  const w = 10;
  const h = 10;
  const original = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    original[i * 4] = 200;
    original[i * 4 + 1] = 100;
    original[i * 4 + 2] = 50;
    original[i * 4 + 3] = 255;
  }
  const current = new Uint8ClampedArray(original);

  // Hard erase across row y=5 from x=2 to x=7
  applyMaskBrushStroke({
    current,
    original,
    width: w,
    height: h,
    x0: 2,
    y0: 5,
    x1: 7,
    y1: 5,
    radius: 1.5,
    softness: 0,
    mode: "erase",
  });
  assert.equal(current[(5 * w + 5) * 4 + 3], 0);
  // Corner far from stroke stays untouched
  assert.equal(current[0 * 4 + 3], 255);

  // Restore around (5, 5)
  applyMaskBrushStroke({
    current,
    original,
    width: w,
    height: h,
    x0: 5,
    y0: 5,
    x1: 5,
    y1: 5,
    radius: 1.5,
    softness: 0,
    mode: "restore",
  });
  assert.equal(current[(5 * w + 5) * 4 + 3], 255);
  assert.equal(current[(5 * w + 5) * 4], 200);
});

test("Magic Wand flood-erases a trapped interior background pocket without crossing foreground walls", () => {
  const w = 9;
  const h = 9;
  // Dark foreground everywhere except a 3x3 white pocket in the center (3..5, 3..5)
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const inPocket = x >= 3 && x <= 5 && y >= 3 && y <= 5;
      buf[idx] = inPocket ? 250 : 20;
      buf[idx + 1] = inPocket ? 250 : 20;
      buf[idx + 2] = inPocket ? 250 : 20;
      buf[idx + 3] = 255;
    }
  }

  const erased = applyMagicWandErase({
    current: buf,
    width: w,
    height: h,
    startX: 4,
    startY: 4,
    tolerance: 25,
  });

  assert.equal(erased, 9);
  assert.equal(buf[(4 * w + 4) * 4 + 3], 0); // center pocket cleared
  assert.equal(buf[(2 * w + 4) * 4 + 3], 255); // surrounding dark wall preserved
});

test("Stock media filter and SSRF host allowlist work as expected", () => {
  const tech = filterCuratedStock("", "tech");
  assert.ok(tech.length >= 3);
  assert.ok(tech.every((p) => p.category === "tech"));

  const coffee = filterCuratedStock("coffee", "all");
  assert.ok(coffee.length >= 1);

  assert.equal(isAllowedStockImageUrl("https://images.unsplash.com/photo-123?w=800"), true);
  assert.equal(isAllowedStockImageUrl("https://images.pexels.com/photos/1/a.jpeg"), true);
  assert.equal(isAllowedStockImageUrl("http://images.unsplash.com/photo-123"), false);
  assert.equal(isAllowedStockImageUrl("https://169.254.169.254/latest/meta-data"), false);
  assert.equal(isAllowedStockImageUrl("https://user:pass@images.unsplash.com/a"), false);
  assert.equal(isAllowedStockImageUrl("https://evil.example.com/a.jpg"), false);
});

test("Collab sync strips large base64 images into compact refs, rehydrates from cache, and chunks big payloads", () => {
  const bigImg = `data:image/jpeg;base64,${"A".repeat(12_000)}`;
  const page: DesignPage = {
    id: "pg_sync_1",
    name: "Slide 1",
    background: "#FFFFFF",
    backgroundImage: bigImg,
    elements: [
      {
        id: "img_1",
        type: "image",
        x: 40,
        y: 50,
        width: 300,
        height: 200,
        rotation: 0,
        opacity: 1,
        src: bigImg,
        originalSrc: bigImg,
        fit: "cover",
        borderRadius: 0,
        mask: "none",
        filters: { ...DEFAULT_IMAGE_FILTERS },
      },
    ],
  };

  const senderCache = new Map<string, string>();
  const announced = new Set<string>();
  const first = stripPageMediaForSync(page, senderCache, announced);
  assert.equal(first.newAssets.length, 1);
  assert.ok(first.page.backgroundImage?.startsWith(ASSET_REF_PREFIX));
  const strippedEl = first.page.elements[0];
  assert.equal(strippedEl.type, "image");
  assert.ok(strippedEl.src.startsWith(ASSET_REF_PREFIX));
  assert.ok(JSON.stringify(first.page).length < 1_000);

  // Second broadcast with unchanged image emits zero newAssets
  const second = stripPageMediaForSync(page, senderCache, announced);
  assert.equal(second.newAssets.length, 0);

  // Cold receiver detects missing hash, then hydrates cleanly once asset arrives
  const receiverCache = new Map<string, string>();
  const cold = hydratePageMedia(first.page, receiverCache);
  assert.equal(cold.missingHashes.length, 1);

  receiverCache.set(first.newAssets[0].hash, first.newAssets[0].dataUrl);
  const warm = hydratePageMedia(first.page, receiverCache);
  assert.equal(warm.missingHashes.length, 0);
  assert.equal(warm.page.backgroundImage, bigImg);
  assert.equal(warm.page.elements[0].type === "image" ? warm.page.elements[0].src : "", bigImg);

  // Chunking splits oversized frames and reassembles identically
  const payload = "x".repeat(450_000);
  const parts = chunkString(payload, 180_000);
  assert.equal(parts.length, 3);
  assert.equal(parts.join(""), payload);
});




