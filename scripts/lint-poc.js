#!/usr/bin/env node
/* ============================================================
   lint-poc.js — mechanical checks for the rules in CLAUDE.md,
   run against every screen in a POC folder instead of a human
   re-reading each file and eyeballing consistency.

   Usage: node lint-poc.js path/to/pocs/ford

   Checks (each one traces to a specific CLAUDE.md rule):
     1. Every <os-xxx> tag used is actually defined in
        components/os-components.js — catches inventing a one-off
        tag instead of composing from the library.
     2. tokens.css is linked and os-components.js is loaded at the
        END of <body>, after all markup and before any inline
        <script> that touches a component — the "Script Placement"
        rule. A violation here means components render empty.
     3. Every internal href resolves to a real file (or is "#",
        which is allowed for decorative/unwired links).
     4. The <os-sidebar-nav> markup is identical across every screen
        in the folder except the `active` attribute — screens that
        drift here break "sidebar identical across all pages."

   This does NOT check copy quality, layout choices, or logo
   legibility — see check-logo.js for the logo case, and use your
   own judgment for content/design.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node lint-poc.js path/to/pocs/some-client");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..");
const componentsJsPath = path.join(repoRoot, "components", "os-components.js");
const componentsJs = fs.readFileSync(componentsJsPath, "utf8");

// Derive the canonical component list from the source of truth (the
// customElements.define calls) instead of hand-maintaining a second list
// that can drift out of sync.
const knownTags = new Set();
for (const m of componentsJs.matchAll(/customElements\.define\(\s*["']([\w-]+)["']/g)) {
  knownTags.add(m[1]);
}
if (knownTags.size === 0) {
  console.error("Could not find any customElements.define(...) calls in os-components.js — check the path/regex, something's wrong with this script, not your POC.");
  process.exit(1);
}

const targetDir = path.resolve(target);
const htmlFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith(".html")).map((f) => path.join(targetDir, f));
if (htmlFiles.length === 0) {
  console.error(`No .html files found in ${targetDir}`);
  process.exit(1);
}

let failCount = 0;
const fail = (msg) => { console.log("  FAIL: " + msg); failCount++; };
const ok = (msg) => console.log("  ok:   " + msg);

const sidebarBlocks = {}; // file -> normalized sidebar markup (for cross-file consistency check)

for (const file of htmlFiles) {
  const rel = path.relative(repoRoot, file);
  console.log(`\n${rel}`);
  const html = fs.readFileSync(file, "utf8");

  // --- Check 1: every <os-xxx> tag is a known component ---
  const usedTags = new Set();
  for (const m of html.matchAll(/<(os-[\w-]+)/g)) usedTags.add(m[1]);
  const unknown = [...usedTags].filter((t) => !knownTags.has(t));
  if (unknown.length) {
    fail(`Uses undefined custom element(s): ${unknown.join(", ")} — not in os-components.js. Add to the library first, or fix a typo.`);
  } else {
    ok(`All ${usedTags.size} custom element(s) used are registered components.`);
  }

  // --- Check 2: tokens.css linked, os-components.js at end of body ---
  // Exception: a bare index.html redirect stub (see CLAUDE.md "Every
  // Prototype Needs an index.html") intentionally has neither — it's
  // just a <meta refresh> to the real first screen, not a component
  // screen itself.
  const isRedirectStub = path.basename(file) === "index.html" && /<meta[^>]*http-equiv=["']refresh["']/i.test(html);
  if (isRedirectStub) {
    ok("index.html redirect stub — tokens.css/os-components.js checks don't apply.");
  } else if (!/href=["'][^"']*tokens\.css["']/.test(html)) {
    fail("No <link> to tokens.css found.");
  } else {
    ok("tokens.css is linked.");
  }
  const scriptTagMatch = html.match(/<script[^>]*src=["']([^"']*os-components\.js)["'][^>]*><\/script>/);
  if (isRedirectStub) {
    // already reported above; nothing else to check on this file
  } else if (!scriptTagMatch) {
    fail("No <script src=\".../os-components.js\"> found.");
  } else {
    const scriptIndex = html.indexOf(scriptTagMatch[0]);
    const bodyCloseIndex = html.lastIndexOf("</body>");
    const bodyOpenIndex = html.indexOf("<body");
    if (scriptIndex < bodyOpenIndex) {
      fail("os-components.js is loaded before <body> — must be at the END of body per the Script Placement rule.");
    } else {
      // Any inline <script> block after this one is fine (expected); any
      // OTHER <script src> for a real file before it is what we're
      // guarding against — check no markup-affecting content sits after it
      // besides script tags themselves.
      const afterScript = html.slice(scriptIndex + scriptTagMatch[0].length, bodyCloseIndex);
      const hasNonScriptMarkupAfter = /<(?!script|\/script)[a-zA-Z]/.test(afterScript.replace(/<script[\s\S]*?<\/script>/g, ""));
      if (hasNonScriptMarkupAfter) {
        fail("There's markup after the os-components.js script tag (besides inline <script> blocks) — it should be the last non-script thing before </body>.");
      } else {
        ok("os-components.js is correctly placed at the end of body.");
      }
    }
  }

  // --- Check 3: internal links resolve ---
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]);
  const badLinks = [];
  for (const href of hrefs) {
    if (href === "#" || /^https?:\/\//.test(href) || href.startsWith("mailto:")) continue;
    const targetPath = path.resolve(path.dirname(file), href.split("?")[0].split("#")[0]);
    if (!fs.existsSync(targetPath)) badLinks.push(href);
  }
  if (badLinks.length) {
    fail(`Broken internal link(s): ${badLinks.join(", ")}`);
  } else {
    ok(`All ${hrefs.length} href(s) resolve or are intentionally "#".`);
  }

  // --- Check 4 setup: capture sidebar markup for cross-file comparison ---
  const sidebarMatch = html.match(/<os-sidebar-nav\b[\s\S]*?<\/os-sidebar-nav>/);
  if (sidebarMatch) {
    const normalized = sidebarMatch[0].replace(/\bactive="[^"]*"/, 'active="__ACTIVE__"');
    sidebarBlocks[rel] = normalized;
  }
}

// --- Check 4: sidebar identical (modulo `active`) across the folder ---
console.log(`\nCross-file: sidebar consistency`);
const files = Object.keys(sidebarBlocks);
if (files.length < 2) {
  console.log("  (only one screen with a sidebar — nothing to compare)");
} else {
  const reference = sidebarBlocks[files[0]];
  const drifted = files.filter((f) => sidebarBlocks[f] !== reference);
  if (drifted.length) {
    fail(`Sidebar markup differs (beyond \`active\`) in: ${drifted.join(", ")} — compare against ${files[0]}.`);
  } else {
    ok(`Sidebar markup is identical (modulo \`active\`) across all ${files.length} screens.`);
  }
}

console.log(`\n${failCount === 0 ? "PASS" : failCount + " check(s) FAILED"}`);
process.exit(failCount === 0 ? 0 : 1);
