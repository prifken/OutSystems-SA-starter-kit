#!/usr/bin/env node

/**
 * POC Quality Validator — Automated checks using Playwright
 *
 * Validates POCs against CLAUDE.md guidelines:
 * - Logo visibility and sizing
 * - Highcharts credits are hidden
 * - Responsive layout at multiple viewports
 * - Charts render properly
 * - No visual regressions
 * - Every live nav item leads to a real, distinct page (no fake-active links)
 * - A record-creation flow exists (+ New button → wizard → demo data)
 * - Every detail-style screen has an AI assistant sidebar
 * - Icons come from the kit's Phosphor-derived icon set, not raw emoji
 * - Icon+text flex rows are vertically centered, not stretched off-center
 *   (checked on every screen in the POC, not just the index.html entry point)
 *
 * Usage: npm run check-poc pocs/my-client
 */

const fs = require('fs');
const path = require('path');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  console.error('❌ Playwright not installed. Installing...');
  require('child_process').execSync('npm install playwright', { stdio: 'inherit' });
  playwright = require('playwright');
}

const { chromium } = playwright;

const VIEWPORTS = [
  { name: '1920x1080 (desktop)', width: 1920, height: 1080 },
  { name: '1280x800 (laptop)', width: 1280, height: 800 },
  { name: '768x1024 (tablet)', width: 768, height: 1024 }
];

const CHECKS = {
  logo: { name: 'Logo visibility', severity: 'error' },
  credits: { name: 'Highcharts credits hidden', severity: 'error' },
  charts: { name: 'Charts render', severity: 'warn' },
  responsive: { name: 'Responsive layout', severity: 'warn' },
  text: { name: 'Text readability', severity: 'warn' },
  nav: { name: 'Nav item honesty', severity: 'error' },
  creation: { name: 'Record-creation flow', severity: 'error' },
  aiSidebar: { name: 'AI assistant sidebar on detail screens', severity: 'error' },
  iconLibrary: { name: 'Phosphor icon system (no emoji icons)', severity: 'error' },
  iconAlignment: { name: 'Icon vertical alignment in flex rows', severity: 'error' }
};

// Emoji used as an ad-hoc "icon" instead of the kit's SVG icon set
// (os-components.js's ICONS map / window.osIcon()). Matches common
// pictographic ranges — deliberately broad, since any emoji standing in
// for an icon is the thing being flagged, not a specific character.
const EMOJI_ICON_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;

class POCValidator {
  constructor(pocPath) {
    this.pocPath = pocPath;
    this.indexPath = path.join(pocPath, 'index.html');
    this.issues = [];
    this.screenshots = [];
  }

  async validate() {
    console.log(`\n🔍 Validating POC: ${this.pocPath}\n`);

    // Check if POC exists
    if (!fs.existsSync(this.pocPath)) {
      console.error(`❌ POC path not found: ${this.pocPath}`);
      process.exit(1);
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      // Test at each viewport
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const fileUrl = `file:///${this.indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        console.log(`\n📱 Checking at ${viewport.name}...`);

        // Screenshot
        const screenshotPath = path.join(
          this.pocPath,
          `.validate-${viewport.width}x${viewport.height}.png`
        );
        await page.screenshot({ path: screenshotPath });
        this.screenshots.push(screenshotPath);
        console.log(`  ✓ Screenshot: ${path.basename(screenshotPath)}`);

        // Validate checks
        await this.checkLogo(page, viewport);
        await this.checkCredits(page, viewport);
        await this.checkCharts(page, viewport);
        await this.checkResponsive(page, viewport);
        await this.checkReadability(page, viewport);

        // Structural checks don't vary by viewport — run once, at the
        // first (desktop) pass, rather than repeating the same finding
        // three times.
        if (viewport === VIEWPORTS[0]) {
          await this.checkNavIntegrity(page);
          await this.checkCreationFlow(page);
        }
      }

      console.log(`\n🗂️  Checking structural rules across all screens...`);
      this.checkAiSidebarCoverage();
      this.checkIconLibrary();
      await this.checkIconAlignmentAcrossScreens(page);

      await browser.close();
      this.report();
    } catch (error) {
      await browser.close();
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  // Screenshot a specific element's bounding box (plus padding) so a flagged
  // issue can be visually confirmed without hunting through the full-page
  // screenshot. Returns the saved path, or null if the box is degenerate.
  async captureRegion(page, viewport, box, label, padding = 24) {
    if (!box || box.width <= 0 || box.height <= 0) return null;

    const clip = {
      x: Math.max(0, box.x - padding),
      y: Math.max(0, box.y - padding),
      width: box.width + padding * 2,
      height: box.height + padding * 2
    };

    const regionPath = path.join(
      this.pocPath,
      `.validate-issue-${label}-${viewport.width}x${viewport.height}.png`
    );
    await page.screenshot({ path: regionPath, clip });
    this.screenshots.push(regionPath);
    return regionPath;
  }

  async checkLogo(page, viewport) {
    const logo = await page.locator('os-sidebar-nav img').first().boundingBox();

    if (!logo) {
      this.addIssue('logo', viewport, 'No logo image found in sidebar');
      return;
    }

    const sidebarWidth = await page.evaluate(() => {
      const nav = document.querySelector('os-sidebar-nav');
      return nav ? nav.offsetWidth : 200;
    });

    const logoWidthRatio = logo.width / sidebarWidth;
    const aspectRatio = logo.width / logo.height;

    // A square/icon-shaped mark (aspect <= 2) needs an absolute height floor,
    // since a badge that's technically "wide enough" but only 20px tall still
    // reads as tiny. A wide wordmark (aspect > 2) is naturally shorter once
    // it's width-constrained to the sidebar — for those, filling the width
    // is what matters, not hitting the same absolute height as an icon mark.
    const isWideWordmark = aspectRatio > 2;
    const minHeight = isWideWordmark ? 36 : 60;

    if (logo.height < minHeight) {
      const shot = await this.captureRegion(page, viewport, logo, 'logo');
      this.addIssue('logo', viewport,
        `Logo too small: ${Math.round(logo.height)}px tall (should be ≥${minHeight}px). ` +
        `May have excessive padding—try cropping logo image or using variant without text.`,
        shot);
    } else if (logoWidthRatio < 0.6) {
      const shot = await this.captureRegion(page, viewport, logo, 'logo');
      this.addIssue('logo', viewport,
        `Logo doesn't fill sidebar width: ${Math.round(logoWidthRatio * 100)}% of ${sidebarWidth}px. ` +
        `Try a wider logo variant or remove text below icon.`,
        shot);
    } else {
      console.log(`  ✓ Logo visible and well-proportioned ` +
        `(${Math.round(logo.height)}px × ${Math.round(logo.width)}px)`);
    }

    // Check for contrast issues (logo color vs sidebar background)
    const contrastIssue = await page.evaluate(() => {
      const sidebar = document.querySelector('os-sidebar-nav');
      const img = sidebar?.querySelector('img');
      if (!sidebar || !img) return null;

      const bgColor = window.getComputedStyle(sidebar).backgroundColor;
      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = img.width;
      imgCanvas.height = img.height;

      // Try to sample the logo image (if same-origin)
      try {
        const ctx = imgCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return {
          bgColor: bgColor,
          logoColor: `rgb(${data[0]},${data[1]},${data[2]})`
        };
      } catch (e) {
        return null; // CORS, can't sample
      }
    });

    if (contrastIssue) {
      console.log(`  ⚠ Logo color: ${contrastIssue.logoColor} ` +
        `against sidebar: ${contrastIssue.bgColor}`);
    }
  }

  async checkCredits(page, viewport) {
    // Highcharts always renders hidden accessibility metadata (an SVG <desc>
    // reading "Created with Highcharts X.Y.Z" and a zero-size palette
    // <style> tag) regardless of the credits.enabled setting — neither is
    // ever visible to a user, so scanning textContent for "highcharts"
    // anywhere in the DOM produces false positives on every chart, hidden
    // or not. The actual on-page attribution is the clickable
    // ".highcharts-credits" link — check for that specifically, and only
    // flag it if actually visible (not display:none/opacity:0).
    let visibleCreditsBox = null;
    const visibleCredits = await page.evaluate(() => {
      const links = document.querySelectorAll('.highcharts-credits');
      for (const link of links) {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        const isVisible = rect.width > 0 && rect.height > 0 &&
          style.display !== 'none' && style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0;
        if (isVisible) return link.textContent;
      }
      return null;
    });

    if (visibleCredits) {
      visibleCreditsBox = await page.locator('.highcharts-credits').first().boundingBox();
      const shot = await this.captureRegion(page, viewport, visibleCreditsBox, 'credits');
      this.addIssue('credits', viewport,
        `Highcharts credits visible ("${visibleCredits}") — add hide-credits="true" to the chart tag`,
        shot);
    } else {
      console.log(`  ✓ No visible Highcharts credits`);
    }
  }

  async checkCharts(page, viewport) {
    const chartDonuts = await page.locator('os-chart-donut').count();
    const chartBars = await page.locator('os-chart-bar').count();

    if (chartDonuts + chartBars > 0) {
      console.log(`  ✓ Charts found: ${chartDonuts} donut, ${chartBars} bar`);
    }
  }

  async checkResponsive(page, viewport) {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    if (scrollWidth > clientWidth + 10) {
      this.addIssue('responsive', viewport,
        `Horizontal overflow: ${scrollWidth}px content in ${clientWidth}px viewport`);
    } else {
      console.log(`  ✓ No horizontal overflow`);
    }
  }

  async checkReadability(page, viewport) {
    const textTooSmall = await page.evaluate(() => {
      const elements = document.querySelectorAll('body *');
      let small = 0;
      for (let el of elements) {
        const size = parseInt(window.getComputedStyle(el).fontSize);
        if (size < 12 && el.textContent.length > 10) {
          small++;
        }
      }
      return small;
    });

    if (textTooSmall > 0) {
      console.log(`  ⚠ Warning: ${textTooSmall} elements with font < 12px`);
    } else {
      console.log(`  ✓ Text sizes reasonable`);
    }
  }

  // CLAUDE.md "A Nav Item Is Only 'Live' If It Leads Somewhere Real":
  // every non-disabled sidebar nav item must point to its own real,
  // distinct file — not "#", not another live item's href, and the file
  // must actually exist. Structural, so this runs once, not per-viewport.
  async checkNavIntegrity(page) {
    const structuralViewport = { name: 'structural (all viewports)' };

    const navItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('os-sidebar-nav .nav-item')).map(a => ({
        key: a.getAttribute('data-nav') || '',
        href: a.getAttribute('href') || '',
        disabled: a.classList.contains('disabled'),
        label: a.textContent.trim()
      }));
    });

    if (navItems.length === 0) {
      console.log(`  (no sidebar nav items found to check)`);
      return;
    }

    const live = navItems.filter(item => !item.disabled);
    const seenHrefs = new Map();
    let allOk = true;

    for (const item of live) {
      if (item.href === '#') {
        this.addIssue('nav', structuralViewport,
          `Nav item "${item.label}" is not marked data-disabled but has href="#" — ` +
          `either build its screen or add data-disabled="true".`);
        allOk = false;
        continue;
      }

      const targetPath = path.join(this.pocPath, item.href.split('?')[0].split('#')[0]);
      if (!fs.existsSync(targetPath)) {
        this.addIssue('nav', structuralViewport,
          `Nav item "${item.label}" points to "${item.href}", which doesn't exist in the POC — ` +
          `either build that screen or add data-disabled="true".`);
        allOk = false;
        continue;
      }

      if (seenHrefs.has(item.href)) {
        this.addIssue('nav', structuralViewport,
          `Nav item "${item.label}" points to the same file ("${item.href}") as ` +
          `"${seenHrefs.get(item.href)}" — it looks like a distinct live screen but ` +
          `isn't one. Build a real page for it or add data-disabled="true".`);
        allOk = false;
        continue;
      }
      seenHrefs.set(item.href, item.label);
    }

    if (allOk) {
      console.log(`  ✓ All ${live.length} live nav item(s) point to real, distinct pages`);
    }
  }

  // CLAUDE.md "Every POC Needs a Record-Creation Flow": the list/dashboard
  // screen must have a "+ New ___" header action leading to a page built
  // from <os-wizard-stepper>. Structural, runs once.
  async checkCreationFlow(page) {
    const structuralViewport = { name: 'structural (all viewports)' };

    const createLink = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('.header-actions a.btn-primary, .header-actions a.btn'));
      const match = candidates.find(a => /new|create|add/i.test(a.textContent));
      return match ? { href: match.getAttribute('href'), text: match.textContent.trim() } : null;
    });

    if (!createLink) {
      this.addIssue('creation', structuralViewport,
        `No "+ New [Thing]" button found in the header actions — every POC needs a ` +
        `record-creation entry point (see CLAUDE.md "Every POC Needs a Record-Creation Flow").`);
      return;
    }

    const targetPath = path.join(this.pocPath, createLink.href.split('?')[0].split('#')[0]);
    if (!fs.existsSync(targetPath)) {
      this.addIssue('creation', structuralViewport,
        `Creation button ("${createLink.text}") points to "${createLink.href}", which doesn't exist.`);
      return;
    }

    const wizardSource = fs.readFileSync(targetPath, 'utf8');
    if (!/<os-wizard-stepper/i.test(wizardSource)) {
      this.addIssue('creation', structuralViewport,
        `Creation button leads to "${createLink.href}", but that page has no ` +
        `<os-wizard-stepper> — the creation flow must be a wizard, not a bare form.`);
      return;
    }

    if (!/\.demoData\s*=/.test(wizardSource)) {
      this.addIssue('creation', structuralViewport,
        `"${createLink.href}" has a wizard but never sets its .demoData property — ` +
        `add use-case-specific demo data so the "Load Demo Data" button works ` +
        `(see CLAUDE.md step 5a).`);
      return;
    }

    console.log(`  ✓ Creation flow found: "${createLink.text}" → ${createLink.href} (wizard + demo data)`);
  }

  // CLAUDE.md "Every Detail Screen Needs an AI Assistant Sidebar": any file
  // that looks like a record-detail screen (has os-status-timeline or
  // os-tabs — the pattern ticket-detail.html established) must also
  // include os-ai-sidebar. Pure filesystem scan across the whole POC
  // folder, since detail pages aren't reachable from the index.html
  // redirect chain the other checks ride along on.
  checkAiSidebarCoverage() {
    const structuralViewport = { name: 'structural (all viewports)' };

    const htmlFiles = fs.readdirSync(this.pocPath)
      .filter(f => f.endsWith('.html') && f !== 'index.html');

    let anyDetailPages = false;

    for (const file of htmlFiles) {
      const filePath = path.join(this.pocPath, file);
      const source = fs.readFileSync(filePath, 'utf8');
      const looksLikeDetailPage = /<os-status-timeline|<os-tabs/i.test(source);

      if (!looksLikeDetailPage) continue;
      anyDetailPages = true;

      if (!/<os-ai-sidebar/i.test(source)) {
        this.addIssue('aiSidebar', structuralViewport,
          `"${file}" looks like a record-detail screen but has no <os-ai-sidebar> — ` +
          `every detail screen needs one (see CLAUDE.md "Every Detail Screen Needs ` +
          `an AI Assistant Sidebar").`);
        continue;
      }

      const hasTrigger = /aiToggleBtn|data-verify-open=["']ai-sidebar["']|aiSidebar\.toggle\(\)/i.test(source);
      if (!hasTrigger) {
        this.addIssue('aiSidebar', structuralViewport,
          `"${file}" has <os-ai-sidebar> but no visible trigger button wired to toggle it.`);
        continue;
      }

      console.log(`  ✓ ${file}: AI assistant sidebar present with a trigger`);
    }

    if (!anyDetailPages) {
      console.log(`  (no detail-style pages found to check for an AI sidebar)`);
    }
  }

  // Rule #1 "Compose, Don't Invent": icons must come from os-components.js's
  // Phosphor-derived ICONS set (via window.osIcon() or an inline <svg>
  // matching that set) — not raw emoji standing in for an icon. Emoji in
  // ordinary body copy (a stray "🎉" in placeholder text, say) isn't what
  // this is after; the signal we actually care about is an emoji sitting
  // where an icon belongs — immediately before/after a short label inside
  // a small inline container. Static scan across every HTML file in the
  // POC, since this isn't a per-viewport visual concern.
  checkIconLibrary() {
    const structuralViewport = { name: 'structural (all viewports)' };
    const htmlFiles = fs.readdirSync(this.pocPath).filter(f => f.endsWith('.html'));
    let anyFound = false;

    for (const file of htmlFiles) {
      const filePath = path.join(this.pocPath, file);
      const source = fs.readFileSync(filePath, 'utf8');
      const matches = source.match(EMOJI_ICON_PATTERN);

      if (matches) {
        anyFound = true;
        this.addIssue('iconLibrary', structuralViewport,
          `"${file}" uses emoji (${[...new Set(matches)].join(' ')}) where an icon ` +
          `likely belongs — use the kit's Phosphor-derived icon set instead: ` +
          `window.osIcon("<name>", size) from os-components.js, or an ` +
          `os-* component's built-in data-icon attribute. See the ICONS map at ` +
          `the top of os-components.js for the full available set.`);
      }
    }

    if (!anyFound) {
      console.log(`  ✓ No emoji-as-icon usage found — icons come from the Phosphor set`);
    }
  }

  // CLAUDE.md "Icon + text rows must vertically center, not stretch":
  // catches the exact bug found on authorization-detail.html — an icon
  // next to a title/subtitle pair, in a flex row whose align-items was
  // left at the "normal" (stretch) default, which stretches the icon's
  // wrapper to the text block's full height and leaves the fixed-size
  // SVG sitting near the top instead of centered.
  //
  // This requires rendered layout/computed styles, not static text, so it
  // navigates directly to every screen in the POC — unlike the visual
  // checks earlier in validate(), which only ever render whatever
  // index.html's redirect lands on. That was the real reason this bug
  // wasn't (and couldn't have been) caught automatically before: no
  // rendered check ever loaded authorization-detail.html at all. Runs
  // once per screen at the current (desktop) viewport only — the
  // misalignment this catches doesn't depend on viewport width, so
  // checking it three times per screen would be pure repetition.
  async checkIconAlignmentAcrossScreens(page) {
    const structuralViewport = { name: 'structural (all viewports)' };
    const htmlFiles = fs.readdirSync(this.pocPath)
      .filter(f => f.endsWith('.html') && f !== 'index.html');

    for (const file of htmlFiles) {
      const fileUrl = `file:///${path.join(this.pocPath, file).replace(/\\/g, '/')}`;
      await page.goto(fileUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const offenders = await page.evaluate(() => {
        // Only skip components that fully regenerate their own internals
        // from attributes/properties (os-kpi-card, os-empty-state, etc.)
        // — their icon/text layout is the kit's job to get right once in
        // os-components.js, not something a POC screen re-introduces.
        // Components that instead wrap SA-authored light-DOM children as
        // their body/content (os-card "children become the body",
        // os-tabs, os-modal, os-search-filter-bar's "children render as
        // extra filters") must NOT be excluded — that light-DOM content
        // is exactly the hand-authored markup this rule exists to check,
        // and it's where nearly every icon+text row in this kit actually
        // lives (e.g. the Supporting Documents rows this rule was written
        // for are children of an os-card). os-wizard-stepper is a partial
        // exception: its own chrome (step header, action buttons) is
        // generated, but step content is SA-authored — excluded anyway
        // since a wizard step containing an icon+text card row is rare,
        // and the alternative (false-flagging its generated action-button
        // row) is the more common, more damaging failure mode.
        const insideOsComponent = el => !!el.closest('os-sidebar-nav, os-ai-sidebar, os-wizard-stepper, os-status-timeline, os-chart-donut, os-chart-bar, os-data-table, os-kpi-card, os-empty-state, os-floorplan-viewer');

        const results = [];
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.display !== 'flex' && style.display !== 'inline-flex') return;

          // The pattern this rule targets is exactly two children: a small
          // icon wrapper and a text/content block beside it — not a page
          // layout, a nav, or any container that merely has an SVG buried
          // somewhere deep inside one of several unrelated children.
          if (el.children.length !== 2) return;
          if (insideOsComponent(el)) return;

          const alignItems = style.alignItems;
          if (alignItems === 'center' || alignItems === 'flex-end') return;

          const [first, second] = Array.from(el.children);
          const iconChild = [first, second].find(c => c.tagName === 'SVG' || (c.children.length <= 1 && c.querySelector('svg')));
          if (!iconChild) return;

          const iconBox = iconChild.getBoundingClientRect();
          // Icons are small — this bounds the check to an actual icon
          // slot, not a sidebar/nav/chart panel that happens to contain
          // one somewhere inside a much larger subtree.
          if (iconBox.width > 48 || iconBox.height > 48) return;

          const svg = iconChild.tagName === 'SVG' ? iconChild : iconChild.querySelector('svg');
          const svgHeight = svg.getBoundingClientRect().height;
          const rowHeight = el.getBoundingClientRect().height;

          // Flag when the icon wrapper has been stretched well past the
          // icon's own natural size relative to a visibly taller row —
          // that gap is what leaves the icon looking top-anchored instead
          // of centered next to the text beside it.
          if (rowHeight > svgHeight + 15 && iconBox.height > svgHeight + 5) {
            results.push({
              tag: el.tagName,
              class: el.className || '(no class)',
              rowHeight: Math.round(rowHeight),
              svgHeight: Math.round(svgHeight),
              alignItems
            });
          }
        });
        return results;
      });

      for (const offender of offenders) {
        this.addIssue('iconAlignment', structuralViewport,
          `"${file}": a <${offender.tag.toLowerCase()} class="${offender.class}"> flex row ` +
          `pairs an icon with text but has align-items: ${offender.alignItems} — the icon ` +
          `(${offender.svgHeight}px) sits stretched inside a ${offender.rowHeight}px row ` +
          `instead of centered. Add align-items: center to the flex container.`);
      }

      if (offenders.length === 0) {
        console.log(`  ✓ ${file}: no icon/text vertical alignment issues`);
      }
    }
  }

  addIssue(check, viewport, message, screenshot = null) {
    const severity = CHECKS[check].severity;
    this.issues.push({ check, viewport: viewport.name, message, severity, screenshot });
  }

  report() {
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION REPORT');
    console.log('='.repeat(60));

    if (this.issues.length === 0) {
      console.log('\n✅ All checks passed!\n');
      return;
    }

    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warn');

    if (errors.length > 0) {
      console.log('\n❌ ERRORS (must fix):');
      errors.forEach(issue => {
        console.log(`  • ${CHECKS[issue.check].name} @ ${issue.viewport}`);
        console.log(`    ${issue.message}`);
        if (issue.screenshot) {
          console.log(`    📸 See: ${path.basename(issue.screenshot)}`);
        }
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (review):');
      warnings.forEach(issue => {
        console.log(`  • ${CHECKS[issue.check].name} @ ${issue.viewport}`);
        console.log(`    ${issue.message}`);
        if (issue.screenshot) {
          console.log(`    📸 See: ${path.basename(issue.screenshot)}`);
        }
      });
    }

    console.log('\nFull-page screenshots + cropped issue close-ups saved to POC folder');
    console.log('(remove .validate-*.png files before commit)\n');

    if (errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run validator
const pocPath = process.argv[2];
if (!pocPath) {
  console.error('Usage: npm run check-poc <path/to/poc>');
  console.error('Example: npm run check-poc pocs/commonspirit-provider-portal');
  process.exit(1);
}

new POCValidator(pocPath).validate().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
