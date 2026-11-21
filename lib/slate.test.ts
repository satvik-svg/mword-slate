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


