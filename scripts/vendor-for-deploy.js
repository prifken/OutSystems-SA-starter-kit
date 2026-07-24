#!/usr/bin/env node
/* ============================================================
   vendor-for-deploy.js — makes a POC folder self-contained so it
   can be deployed standalone to a static host (Netlify, GitHub
   Pages, S3, etc.) instead of only working from inside a full
   clone of this repo.

   Usage: node vendor-for-deploy.js path/to/pocs/some-client

   Why this exists: every screen normally links
   ../../components/tokens.css and ../../components/os-components.js —
   correct for local development, where the POC lives two levels
   under the shared components/ folder. Deploying just the POC's own
   folder (the normal Netlify drag-and-drop / "base directory" flow)
   uploads none of that shared folder, so those paths resolve outside
   the deployed site and everything 404s — CSS AND every custom
   element, since os-components.js itself fails to load too. This
   kit found that out the hard way against a real client build; see
   CLAUDE.md "Every Prototype Needs an index.html" for the full
   incident writeup and the manual checklist this script automates.

   What this does:
     1. Discovers every ../../components/<file> reference actually
        used across the POC's .html files (not a hardcoded filename
        list — a POC might reference os_logo.png, os_logo_reversed.png,
        an icon, or anything else in the shared folder) and copies
        each one, plus tokens.css and os-components.js unconditionally
        since those two are structural requirements even if some
        indirect reference to them isn't textually present.
     2. Rewrites every ../../components/... reference in the POC's
        own .html files to the local components/... path — one
        generic prefix replace, not a per-filename list.
     3. Adds an explicit powered-by-logo="components/os_logo.png" to
        any <os-sidebar-nav> tag that doesn't already set one —
        without it, the component's own default
        (../../components/os_logo.png) would still 404 standalone,
        and nothing in step 1's discovery would have caught it, since
        the default lives in os-components.js, not in this POC's own
        markup.
     4. Re-scans afterward and reports any ../../ reference still
        left in an attribute value — there shouldn't be any; if there
        is, it's pointing somewhere this script doesn't know how to
        vendor (e.g. a path outside components/) and needs a manual
        look before deploying. This deliberately only matches inside
        quoted attribute values (href=/src=/logo=/etc.), not any
        occurrence of "../../" in the file — a code comment that
        merely mentions the path in prose isn't a broken reference.

   This does NOT touch anything outside <target> — it never edits
   the shared components/ folder itself, only copies from it.
   Safe to re-run; copies overwrite, rewrites are idempotent (running
   it twice on an already-vendored folder is a no-op).
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node vendor-for-deploy.js path/to/pocs/some-client");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..");
const targetDir = path.resolve(target);
if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
  console.error(`Not a directory: ${targetDir}`);
  process.exit(1);
}

const htmlFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith(".html")).map((f) => path.join(targetDir, f));
if (htmlFiles.length === 0) {
  console.error(`No .html files found in ${targetDir}`);
  process.exit(1);
}

console.log(`Vendoring ${path.relative(repoRoot, targetDir)} for standalone deployment...\n`);

// --- Step 1: discover every ../../components/<file> actually referenced ---
const referencedFiles = new Set(["tokens.css", "os-components.js", "os_logo.png"]);
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const m of html.matchAll(/\.\.\/\.\.\/components\/([^"'\s?#]+)/g)) {
    referencedFiles.add(m[1]);
  }
}

const vendorDir = path.join(targetDir, "components");
fs.mkdirSync(vendorDir, { recursive: true });

for (const f of referencedFiles) {
  const src = path.join(repoRoot, "components", f);
  const dest = path.join(vendorDir, f);
  if (!fs.existsSync(src)) {
    console.log(`  SKIP: components/${f} not found in the shared library — check this reference by hand.`);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log(`  copied components/${f} -> ${path.relative(repoRoot, dest)}`);
}
// highcharts.js needs its license file alongside it, even though nothing
// in the POC's markup references HIGHCHARTS_LICENSE.txt by path.
if (referencedFiles.has("highcharts.js")) {
  const src = path.join(repoRoot, "components", "HIGHCHARTS_LICENSE.txt");
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(vendorDir, "HIGHCHARTS_LICENSE.txt"));
    console.log("  copied components/HIGHCHARTS_LICENSE.txt -> " + path.relative(repoRoot, path.join(vendorDir, "HIGHCHARTS_LICENSE.txt")));
  }
}

// --- Step 2 + 3: rewrite references in every .html file ---
console.log("");
let filesEdited = 0;
for (const file of htmlFiles) {
  const original = fs.readFileSync(file, "utf8");
  let html = original;

  // Generic prefix rewrite — covers every file discovered above (and
  // anything else under components/) in one pass, not a per-filename list.
  html = html.replace(/\.\.\/\.\.\/components\//g, "components/");

  // os-sidebar-nav defaults powered-by-logo to ../../components/os_logo.png
  // when the attribute isn't set — that default needs the same fix, and
  // it can't be caught by the rewrite above since the default lives in
  // os-components.js, not in this file's own markup.
  html = html.replace(/<os-sidebar-nav\b[^>]*>/g, (tag) => {
    if (tag.includes("powered-by-logo")) return tag;
    return tag.slice(0, -1) + ' powered-by-logo="components/os_logo.png">';
  });

  if (html !== original) {
    fs.writeFileSync(file, html);
    filesEdited++;
    console.log(`  rewrote ${path.relative(repoRoot, file)}`);
  }
}
if (filesEdited === 0) {
  console.log("  (no files needed rewriting — already vendored, or nothing referenced the shared path)");
}

// --- Step 4: self-check for anything left pointing outside this folder ---
// Matches only inside quoted attribute values (href=/src=/logo=/image=/
// powered-by-logo=/anything), not prose in a comment that merely mentions
// "../../" — a code comment describing the architecture isn't a broken
// reference.
console.log("\nSelf-check: scanning attribute values for remaining '../../' references...");
let remaining = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const matches = [...new Set([...html.matchAll(/=["']([^"']*\.\.\/\.\.\/[^"']*)["']/g)].map((m) => m[1]))];
  if (matches.length) {
    remaining += matches.length;
    console.log(`  WARN: ${path.relative(repoRoot, file)} still references: ${matches.join(", ")}`);
  }
}

if (remaining === 0) {
  console.log("  ok: no remaining '../../' references — this folder should work as a standalone static-host deploy.");
  console.log("\nNext: run `node lint-poc.js " + path.relative(process.cwd(), targetDir) + "` to confirm, then actually open the deployed URL and check the console — a vendored file that fails to copy correctly is still a silent break.");
} else {
  console.log(`\n${remaining} remaining reference(s) found above — these point outside this folder and will 404 on a standalone deploy. Vendor them by hand (they're not under components/, or this script's discovery missed them) before deploying.`);
  process.exit(1);
}
