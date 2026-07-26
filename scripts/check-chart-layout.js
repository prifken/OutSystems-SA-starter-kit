#!/usr/bin/env node
/* ============================================================
   check-chart-layout.js — mechanical checks for CLAUDE.md's "Rule:
   Dashboards Need a Chart, Not Just KPIs", covering both halves of
   that rule: the chart has to be PRESENT, and it has to actually be
   laid out well once it's there — not just technically present but
   rendered so small (relative to its own container) that it reads
   as an afterthought.

   Usage: node check-chart-layout.js path/to/pocs/some-client

   Why this exists: a KPI-row screen shipped without a chart at all
   would have been an obvious miss to catch by eye. A chart that IS
   present but rendered at a size that leaves most of its card empty
   is a subtler miss — this kit shipped exactly that bug once (a
   dashboard donut at its 160px default inside a card CSS Grid had
   stretched much taller, via the shared column-height behavior of
   grid-2-1), and it wasn't caught until a human actually looked at
   the screenshot. This script makes that specific check repeatable.

   What this checks, per screen:
     1. Presence: any screen with a KPI row (a grid-2/3/4/2-1/1-2
        container holding one or more <os-kpi-card>) must also have
        at least one <os-chart-donut>/<os-chart-bar> somewhere on the
        page — the mechanical half of "Dashboards Need a Chart."
     2. Fill ratio: for every chart found, compare its own rendered
        bounding box against its nearest ancestor .card's content box.
        A chart occupying less than MIN_FILL_RATIO of its card's area
        reads as "small relative to the box" — flag it.
     3. Overflow: a chart's bounding box extending past its card's
        edges reads as broken/clipped, not "well laid out" either
        direction.

   What this does NOT check: whether the chart TYPE is the right
   choice (donut vs. bar vs. none) for the actual data — that's a
   judgment call per CLAUDE.md's own guidance ("pick it from what the
   requirements actually support"), not something bounding boxes can
   verify. Look at the screenshot for that, same caveat as every
   other script here.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node check-chart-layout.js path/to/pocs/some-client");
  process.exit(1);
}
const targetDir = path.resolve(target);
const htmlFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith(".html"));
if (htmlFiles.length === 0) {
  console.error(`No .html files found in ${targetDir}`);
  process.exit(1);
}

const MIN_FILL_RATIO = 0.3; // chart area must be at least 30% of its card's content area

let failCount = 0;
const fail = (msg) => { console.log("  FAIL: " + msg); failCount++; };
const ok = (msg) => console.log("  ok:   " + msg);

(async () => {
  const launchOpts = fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {};
  const browser = await chromium.launch(launchOpts);

  for (const file of htmlFiles) {
    console.log(`\n${file}`);

    // A bare index.html redirect stub (see CLAUDE.md "Every Prototype
    // Needs an index.html") just bounces to the real first screen —
    // checking it would only re-report whatever that screen already
    // reports, under a different filename.
    const rawHtml = fs.readFileSync(path.join(targetDir, file), "utf8");
    if (file === "index.html" && /<meta[^>]*http-equiv=["']refresh["']/i.test(rawHtml)) {
      console.log("  ok:   index.html redirect stub — skipped (see the real target screen instead).");
      continue;
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("dialog", (d) => d.dismiss());
    await page.goto("file://" + path.join(targetDir, file));
    await page.waitForTimeout(300); // charts render via Highcharts synchronously (animation: false), 300ms is generous margin

    const hasKpiRow = await page.$$eval(
      ".grid-2 os-kpi-card, .grid-3 os-kpi-card, .grid-4 os-kpi-card, .grid-2-1 os-kpi-card, .grid-1-2 os-kpi-card",
      (els) => els.length > 0
    );
    const chartHandles = await page.$$("os-chart-donut, os-chart-bar");

    if (hasKpiRow && chartHandles.length === 0) {
      fail("This screen has a KPI row but no <os-chart-donut>/<os-chart-bar> anywhere — see CLAUDE.md \"Rule: Dashboards Need a Chart, Not Just KPIs.\"");
    } else if (hasKpiRow) {
      ok(`KPI row present, and ${chartHandles.length} chart(s) found on the page.`);
    } else if (chartHandles.length === 0) {
      ok("No KPI row and no chart on this screen — the chart rule doesn't apply here.");
    }

    for (let i = 0; i < chartHandles.length; i++) {
      const chart = chartHandles[i];
      const tagName = await chart.evaluate((el) => el.tagName.toLowerCase());
      const chartBox = await chart.boundingBox();
      if (!chartBox || chartBox.width === 0 || chartBox.height === 0) {
        fail(`${tagName} #${i + 1}: rendered with zero size — check highcharts.js is loaded before os-components.js (see CLAUDE.md "Charting: Highcharts, Not Hand-Rolled").`);
        continue;
      }

      const cardBox = await chart.evaluateHandle((el) => el.closest(".card"))
        .then((h) => h.asElement())
        .then((cardEl) => (cardEl ? cardEl.boundingBox() : null));

      if (!cardBox) {
        ok(`${tagName} #${i + 1}: rendered at ${Math.round(chartBox.width)}x${Math.round(chartBox.height)} (no ancestor .card found to compare against — skipping fill-ratio check).`);
        continue;
      }

      const chartArea = chartBox.width * chartBox.height;
      const cardArea = cardBox.width * cardBox.height;
      const fillRatio = chartArea / cardArea;

      const overflows =
        chartBox.x < cardBox.x - 1 ||
        chartBox.y < cardBox.y - 1 ||
        chartBox.x + chartBox.width > cardBox.x + cardBox.width + 1 ||
        chartBox.y + chartBox.height > cardBox.y + cardBox.height + 1;

      if (overflows) {
        fail(`${tagName} #${i + 1}: bounding box extends past its card's edges — looks clipped, not well laid out.`);
      } else if (fillRatio < MIN_FILL_RATIO) {
        fail(`${tagName} #${i + 1}: fills only ${(fillRatio * 100).toFixed(0)}% of its card's area (chart ${Math.round(chartBox.width)}x${Math.round(chartBox.height)} in a ${Math.round(cardBox.width)}x${Math.round(cardBox.height)} card) — reads as small relative to the box. Try a larger \`size\`/\`height\` attribute, or center it with padding rather than leaving it small in a corner.`);
      } else {
        ok(`${tagName} #${i + 1}: fills ${(fillRatio * 100).toFixed(0)}% of its card's area — proportioned well.`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n${failCount === 0 ? "PASS" : failCount + " check(s) FAILED"}`);
  process.exit(failCount === 0 ? 0 : 1);
})();
