#!/usr/bin/env node
/* ============================================================
   check-logo.js — deterministic pre-check for the sidebar logo
   decision documented in CLAUDE.md ("Logo Placement").

   Usage: node check-logo.js path/to/logo.png

   What this answers (from pixel data, not a screenshot glance):
     - Does the artwork have its own opaque fill (a badge/oval/crest),
       or is most of it transparent (thin ink on nothing)?
     - Is the opaque ink dark or light?
   From that it recommends: default (direct on dark sidebar), or
   logo-chip="true" (needs a light background).

   What this does NOT answer, on purpose: whether the artwork contains
   legible company-name text. That's the one part of the CLAUDE.md
   decision process that stays a human/visual judgment call — this
   script says so explicitly rather than guessing.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node check-logo.js path/to/logo.png");
  process.exit(1);
}
if (!file.toLowerCase().endsWith(".png")) {
  console.error("This tool only reads PNG (needs a real alpha channel). SVGs and JPGs aren't supported — inspect those visually.");
  process.exit(1);
}

const buf = fs.readFileSync(path.resolve(file));
const png = PNG.sync.read(buf);
const { width, height, data } = png; // data is RGBA, 4 bytes/pixel

let opaqueCount = 0;
let minX = width, minY = height, maxX = 0, maxY = 0;
let lumaSum = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a > 200) {
      opaqueCount++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      lumaSum += 0.2126 * r + 0.7152 * g + 0.0722 * b; // relative luminance
    }
  }
}

if (opaqueCount === 0) {
  console.log("No opaque pixels found at all (alpha > 200 threshold) — this file may be fully transparent, or effectively invisible on ANY background. Inspect it directly.");
  process.exit(1);
}

const bboxW = maxX - minX + 1;
const bboxH = maxY - minY + 1;
const bboxArea = bboxW * bboxH;
const fillRatio = opaqueCount / bboxArea; // how much of the content's own bounding box is actually filled
const avgLuma = lumaSum / opaqueCount; // 0 (black) .. 255 (white)

console.log(`File: ${file}`);
console.log(`Image size: ${width}x${height}`);
console.log(`Opaque content bounding box: ${bboxW}x${bboxH} (${(100 * bboxArea / (width * height)).toFixed(0)}% of canvas)`);
console.log(`Fill ratio within that bounding box: ${(fillRatio * 100).toFixed(1)}%`);
console.log(`Average luminance of opaque pixels: ${avgLuma.toFixed(0)} / 255 (${avgLuma < 128 ? "dark ink" : "light ink"})`);
console.log("");

const FILL_THRESHOLD = 0.4; // above this, treat as a solid filled shape (badge/oval/crest) rather than thin line-art/text
if (fillRatio >= FILL_THRESHOLD) {
  console.log("VERDICT: Looks like a self-contained filled shape (a badge/oval/crest with its own background).");
  console.log("Recommendation: default behavior (no logo-chip) should read fine on the dark sidebar.");
} else if (avgLuma < 128) {
  console.log("VERDICT: Mostly transparent, and what's there is dark ink — this will likely disappear on the dark sidebar.");
  console.log("Recommendation: look for a reversed/white variant of this logo first. If none exists, use logo-chip=\"true\".");
} else {
  console.log("VERDICT: Mostly transparent, but the ink is light-colored.");
  console.log("Recommendation: default behavior (no logo-chip) should read fine directly on the dark sidebar.");
}

console.log("");
console.log("NOT checked by this script (judgment call — look at the image yourself):");
console.log("does the artwork contain legible text with the company name in it? If it's a bare icon/symbol with no name visible, set show-brand-label=\"true\" regardless of the verdict above.");
