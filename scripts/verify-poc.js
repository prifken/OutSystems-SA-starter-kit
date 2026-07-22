#!/usr/bin/env node
/* ============================================================
   verify-poc.js — the reusable version of the ad-hoc Playwright
   scripts written by hand for every build during this kit's
   development. Screenshots every screen's default state, then
   clicks through every tab and every tagged interactive trigger
   and screenshots those too — one command instead of a fresh
   script each time.

   Usage: node verify-poc.js path/to/pocs/ford [output-dir]
   (output-dir defaults to <target>/_verify-output/)

   Convention this relies on: mark any button/element that opens
   a modal or slide-in panel with data-verify-open="short-name" —
   see resolveBtn / aiToggleBtn in the two examples for the pattern.
   Tabs need no tagging; os-tabs already renders [data-tab-target]
   buttons for every panel automatically.

   This catches: components rendering empty (script-placement bugs),
   a tab/panel that's broken, an interactive trigger that throws.
   It does NOT catch: whether the content is any good, whether copy
   is too dense, whether the layout looks right — you still have to
   look at the screenshots.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node verify-poc.js path/to/pocs/some-client [output-dir]");
  process.exit(1);
}
const targetDir = path.resolve(target);
const outDir = path.resolve(process.argv[3] || path.join(targetDir, "_verify-output"));
fs.mkdirSync(outDir, { recursive: true });

const htmlFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith(".html"));
if (htmlFiles.length === 0) {
  console.error(`No .html files found in ${targetDir}`);
  process.exit(1);
}

(async () => {
  // This container ships a pre-installed browser at a pinned path; if your
  // environment has Playwright's own browsers installed via
  // `npx playwright install`, you can drop the executablePath override.
  const launchOpts = fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {};
  const browser = await chromium.launch(launchOpts);
  let shotCount = 0;
  let errorCount = 0;

  for (const file of htmlFiles) {
    const name = file.replace(/\.html$/, "");
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Demo stub buttons call alert() for unwired actions — auto-dismiss
    // so the script doesn't hang waiting on a dialog no one will click.
    page.on("dialog", (d) => d.dismiss());
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => { if (msg.type() === "error") pageErrors.push(msg.text()); });

    await page.goto("file://" + path.join(targetDir, file));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, `${name}--default.png`) });
    shotCount++;
    console.log(`${file}: default state captured`);

    // Click every tab, screenshot each.
    const tabTargets = await page.$$eval("[data-tab-target]", (els) => els.map((e) => e.getAttribute("data-tab-target")));
    for (const key of tabTargets) {
      await page.click(`[data-tab-target="${key}"]`);
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `${name}--tab-${key}.png`) });
      shotCount++;
      console.log(`${file}: tab "${key}" captured`);
    }

    // Click every tagged interactive trigger, screenshot each, then close
    // it again before moving to the next one — otherwise an open modal's
    // full-screen overlay blocks every click after it. os-modal and
    // os-ai-sidebar both already expose a [data-action="close"] button
    // (see os-components.js) — reuse that convention rather than adding
    // a new one just for this script.
    const openTargets = await page.$$eval("[data-verify-open]", (els) => els.map((e) => e.getAttribute("data-verify-open")));
    for (const name2 of openTargets) {
      await page.click(`[data-verify-open="${name2}"]`);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `${name}--open-${name2}.png`) });
      shotCount++;
      console.log(`${file}: opened "${name2}" captured`);

      const closeBtn = await page.$('[data-action="close"]:visible');
      if (closeBtn) {
        await closeBtn.click();
        await page.waitForTimeout(200);
      } else {
        console.log(`${file}: no [data-action="close"] found for "${name2}" — if the next trigger's click fails, this is why.`);
      }
    }

    if (pageErrors.length) {
      errorCount += pageErrors.length;
      console.log(`${file}: ${pageErrors.length} JS error(s) during interaction:`);
      pageErrors.forEach((e) => console.log("    " + e));
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n${shotCount} screenshot(s) written to ${outDir}`);
  if (errorCount) {
    console.log(`${errorCount} JS error(s) detected — see above.`);
    process.exit(1);
  }
})();
