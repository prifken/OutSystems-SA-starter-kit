# SA Starter Kit

A minimal, self-contained component library for building customer-facing
HTML prototypes fast — during early (0%→10%) sales conversations, when
speed and repeatability matter more than anything else.

This is deliberately small. There is no multi-agent orchestration here, no
Chief-of-Staff pattern, no client registry, no automation pipeline. Just a
component library and one worked example. If you need the fuller
OutSystems SA workspace this was distilled from (client registries,
transcript processing, ODC Mentor/OML generation, architecture diagrams),
that's a separate, much bigger toolkit — this kit is intentionally not that.

## What's Here

```
components/
  tokens.css          The ONE stylesheet. Design tokens (CSS custom
                       properties) + every component's visual style.
                       Nothing else in this kit defines CSS.
  os-components.js     Real custom elements (customElements.define),
                       rendered into light DOM (not Shadow DOM — see
                       "Why Light DOM" below). This is the ONE script.
  icons/                Reference copies of the SVG icon set as standalone
                       files. Components use an inline copy of these same
                       icons baked into os-components.js — see icons/README.md.
  os_logo.png           OutSystems logo, used in the example.
examples/
  os-ticketing/          A complete 3-screen reference app (IT support
                       ticketing) built entirely from the component
                       library. Copy this folder to start a new prototype.
README.md               Setup: open Claude Code in this directory.
```

## Why Light DOM (Not Shadow DOM)

Every component in `os-components.js` renders plain HTML directly into
itself (`this.innerHTML = ...`) rather than attaching a shadow root. This
means a page can override `--color-primary` (or any token in `tokens.css`)
from a `<style>` block and every component instantly picks up the change —
the same rebrand pattern SAs already use on plain HTML prototypes. Shadow
DOM would encapsulate styles and break that. If you're rebranding for a
client, override CSS custom properties in a `<style>` tag in the page
`<head>`, after the `tokens.css` link — no component code changes needed.

## Rule #1: Compose, Don't Invent

Never write a new component from scratch inside a screen file. If the
component you need already exists in `components/os-components.js`, use
it. If it doesn't exist yet, add it to the library first (with styles in
`tokens.css`), then use it from your screen. This is what keeps every
prototype you build looking and behaving consistently, and what makes it
possible for another SA to open your prototype and immediately recognize
every piece of it.

## Rule #2: Keep Typed Columns Typed

A column whose name implies a type — a `_count`, a date, an amount — must
only ever hold values of that type. Don't repurpose it to also carry
status semantics: no `"6 (pending)"`, no `"—"` for not-yet-known, no
`"AHJ conflict"` sitting in a count column. That's what the row's status
column/badge is for — it already renders the pending/processing/flagged
state next to the value. If a count isn't known yet, show the best real
number available (`0` if genuinely none yet), not placeholder text, and
let the status column explain why it might still change. Mixing a value's
type with its state makes the column impossible to sort, sum, or reason
about, and it's exactly the kind of thing that looks fine in a mockup and
breaks the moment someone wires it to a real API response.

## The Component Library

| Element | Purpose | Config |
|---|---|---|
| `<os-sidebar-nav>` | Fixed left nav, dark theme | attrs: `active`, `logo`, `brand`, `show-brand-label`, `logo-chip`, `powered-by-logo`, `home-href`; children: `<a data-nav data-icon data-disabled>` — set `data-disabled="true"` on any nav item that doesn't lead to a real screen in this prototype, so it renders grayed out and inert instead of a clickable dead link |
| `<os-kpi-card>` | Metric tile with optional trend | attrs: `label`, `value`, `variant`, `sub`, `trend`, `trend-value` |
| `<os-status-badge>` | Color-coded pill | attrs: `variant` (primary/success/warning/error/info/neutral), `label` |
| `<os-card>` | Container with optional header + action link | attrs: `heading`, `action-label`, `action-href`; children become the body |
| `<os-data-table>` | Sortless data table, optional row click-through | props: `columns`, `rows`; attrs: `row-href-template`, `clickable` |
| `<os-tabs>` | Tab bar + panels | children: `<div data-tab data-tab-label data-tab-badge>` |
| `<os-status-timeline>` | Vertical event/approval timeline | prop: `items` |
| `<os-ai-sidebar>` | Slide-in AI assistant panel | props: `insight`, `recommendations`, `activityLog`; methods: `open()`/`close()`/`toggle()` |
| `<os-modal>` | Confirm/cancel dialog | attrs: `modal-title`, `confirm-label`, `cancel-label`, `variant`; events: `os-modal-confirm`/`os-modal-cancel`; methods: `open()`/`close()` |
| `<os-wizard-stepper>` | Multi-step form flow | children: `<div data-step-label>`; attr: `submit-label`; hook: `beforeNext(stepIndex)`; events: `os-wizard-change`/`os-wizard-submit` |
| `<os-form-field>` | Label + input/select/textarea wrapper with validation states | attrs: `label`, `required`, `hint`, `error`, `success`; wraps a light-DOM control child |
| `<os-search-filter-bar>` | Search input + optional extra filters | attr: `placeholder`; event: `os-search`; children render as extra filters |
| `<os-empty-state>` | Placeholder for empty content | attrs: `icon`, `heading`, `text`, `action-label`, `action-href` |
| `<os-chart-donut>` | Pure-SVG donut chart, no chart library | prop: `data` ([{label,value,color}]); attrs: `center-label`, `center-sub`, `size` |
| `<os-floorplan-viewer>` | Image with overlaid pins/room boxes + synced room list, for any spatial human-in-the-loop review workflow | prop: `rooms` ([{id,label,status,x,y,w,h,sprinklers}], x/y/w/h/sprinkler coords as % of image size); attr: `image`; method: `selectRoom(id)`; event: `os-room-select` |

Full implementation details and inline comments live in `os-components.js`
itself — read the top-of-file comment block for each component before
using it for the first time.

## How to Build a New Prototype

1. Copy `examples/os-ticketing/` to a new folder — e.g. `pocs/acme-corp/`
   (or wherever you keep client work; this kit doesn't prescribe a
   directory beyond `examples/`). The copied folder already includes an
   `index.html` — see the rule below — keep it.
2. Keep the two `<link>`/`<script>` references pointed at
   `../../components/tokens.css` and `../../components/os-components.js`
   (adjust the relative path if your new folder is nested differently).
3. Swap the sidebar nav items, KPI labels, table columns/rows, and copy —
   leave the component tags alone.
4. Rebrand for the client — do this in parallel with step 1-3, not as an
   afterthought. Find the client's real website and pull two things from
   it, not just one:
   - **Logo** — download the actual logo asset (see "Logo Placement"
     below for the direct-placement vs. chip decision).
   - **Brand colors** — look at the actual color values the site uses
     for its header/nav and primary action color, not just what the
     logo alone looks like. A logo rendered on a white page tells you
     nothing about what background it was designed to sit on. Pull the
     real hex values out of the site's CSS (view page source / inspect
     the stylesheet — most site builders expose them as CSS custom
     properties) rather than eyeballing a screenshot.
   Put the result in a small `brand.css` file in the prototype's folder
   (or a `<style>` block after the `tokens.css` link) that overrides the
   relevant `--color-*` custom properties — `--color-neutral-10` for the
   sidebar background, `--color-primary`/`--color-primary-hover` for the
   accent color are the two that matter most. Don't touch `tokens.css`
   itself for a one-off rebrand, and don't guess at a color when the
   client's own site will tell you exactly what it is.

   Pulling a client's own public-facing logo and colors for an internal
   sales prototype is the intended, sanctioned use of this step — don't
   substitute a generic or hand-drawn placeholder out of trademark
   caution. If you're ever genuinely unsure whether a specific asset is
   appropriate to use, ask the user; don't silently downgrade to a
   placeholder instead of asking.
5. If you need a component that doesn't exist yet, add it to
   `os-components.js` + `tokens.css` first (following the pattern of an
   existing component), then use it. Don't build one-off markup in a
   screen file.
6. Open the HTML file directly in a browser. No build step, no server,
   no npm install. Before calling the rebrand done, actually look at the
   rendered page (or a screenshot of it) — a logo pulled or extracted
   from a client's site can fail silently (a truncated download, an
   encoding bug in a scraped SVG) and show up only as a broken image at
   render time, not as an error during the pull itself.

## Opening Files: Give Clickable Links, Not Bare Paths

When telling a user which HTML file to open (an example, a new prototype
screen, etc.), give a full `file:///` URI with forward slashes, built
dynamically from the repo's actual absolute path on disk — e.g.
`file:///C:/Users/you/path/to/repo/examples/os-ticketing/dashboard.html` —
rather than a bare relative path (`examples/os-ticketing/dashboard.html`)
or a raw OS-native path with backslashes (`C:\Users\...`). Most terminals
only auto-detect `file://` URIs with forward slashes as clickable
hyperlinks, so that's what gets a user to "one click, browser opens" —
the goal for this kit, since speed is the entire point. Do not hardcode
this into README.md, CLAUDE.md, or any other file committed to the repo —
the absolute path is specific to wherever a given person cloned or
downloaded it, so building it dynamically per-session is required for it
to work for anyone else.

## Every Prototype Needs an `index.html` Landing on the Dashboard

Every prototype folder (the `examples/os-ticketing/` reference example
included) must contain an `index.html` that lands the visitor on the
dashboard screen. Static hosts — Netlify, GitHub Pages, S3, etc. — serve
`index.html` by default at a site's root; without one, dragging a
prototype folder onto Netlify (or any equivalent one-click deploy) has no
defined entry point. This is a hard rule, not a per-client judgment call.

The simplest correct implementation is a redirect page, not a duplicate
copy of the dashboard screen (a copy drifts out of sync the moment the
real dashboard changes):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=dashboard.html">
<title>Redirecting…</title>
</head>
<body>
  <p>Redirecting to the <a href="dashboard.html">dashboard</a>…</p>
  <script>window.location.replace("dashboard.html");</script>
</body>
</html>
```

If your prototype's dashboard-equivalent screen has a different filename,
point the redirect at that file instead — the rule is "index.html lands
on whatever screen a fresh visitor should see first," not literally the
string `dashboard.html`.

**A deployable prototype must also be self-contained.** Every screen
normally links `../../components/tokens.css` and
`../../components/os-components.js` — correct for local development,
where the prototype lives two levels under the shared `components/`
folder. But a Netlify (or any static host) deploy typically uploads only
the prototype's own folder, not the rest of the repo — `../../` then
points outside the deployed site entirely, and every asset 404s (this
kit found out the hard way: it silently breaks *both* the CSS and every
custom element, since `os-components.js` itself 404s too). Before
deploying a prototype standalone:

1. Copy `components/tokens.css`, `components/os-components.js`, and
   `components/os_logo.png` into a `components/` subfolder inside the
   prototype's own folder.
2. Change every screen's `../../components/...` references to
   `components/...` (one level, not two).
3. `os-sidebar-nav`'s `powered-by-logo` attribute defaults to
   `../../components/os_logo.png` — it needs the same fix. Pass
   `powered-by-logo="components/os_logo.png"` explicitly on every
   `<os-sidebar-nav>` tag; don't rely on the default once the shared
   path no longer applies.
4. Verify before handing off the deploy: `curl` (or open directly) every
   asset path the deployed folder needs and confirm each one 200s —
   don't just eyeball the rendered page, since a missing CSS file can
   look "close enough" at a glance while a missing JS file silently
   breaks every `<os-*>` tag on the page.

## Script Placement — Read This Before Moving Anything

`os-components.js` is loaded at the **end of `<body>`**, not in `<head>`.
This is deliberate, not an oversight: several components
(`os-tabs`, `os-form-field`, `os-wizard-stepper`, `os-card`,
`os-sidebar-nav`) read their light-DOM children the moment they're
upgraded. If the script runs before the browser has finished parsing the
page's HTML, those children won't exist yet and the component will render
empty. Loading the script after all the markup guarantees the whole
document is already built before any component upgrades. Keep this
ordering in any new screen — script tag(s) go right before your own
page-specific `<script>` block, both near `</body>`.

## Logo Placement: Look at the Image, Don't Default to a Box Around It

The customer logo (top of sidebar) renders **directly on the dark
background by default — no white box, no added text.** Most real logos
already work fine as-is: a wordmark, or a self-contained badge like a
colored oval with the company name scripted inside it, reads clearly on
dark and already says what the company is. Boxing every logo in a white
chip "to be safe" adds visual clutter most logos don't need — don't do
that as a default.

**Before using a new logo, look at it and decide two things:**

1. **Does the artwork already contain the company's name as legible
   text?** (a wordmark, or a badge/oval/crest with the name inside it —
   e.g. Ford's blue oval has "Ford" scripted into it). If yes, do
   nothing — default behavior is correct. If the logo is a bare icon or
   abstract symbol with no legible name, set `show-brand-label="true"`
   so the `brand` attribute renders as a text label next to it — an icon
   alone doesn't tell anyone what it is.
2. **Does the logo have its own opaque background** (a badge/oval/crest
   shape with a fill), or is it a verified reversed/white variant made
   for dark backgrounds? If yes, default behavior is correct — it'll
   read fine directly on the sidebar. If it's a transparent PNG with
   dark or unknown-color ink and no background of its own, direct
   placement will make it disappear. That's the one real case for
   `logo-chip="true"` (wraps it in a white background) — but check
   whether the brand has a reversed/white variant first; reach for the
   chip only if one genuinely doesn't exist.

**Always confirm with an actual rendered screenshot before calling a
build done.** This is a judgment call about one specific image — there's
no CSS default that gets every logo right, so the real check is looking
at the render, not trusting a rule to have handled it.

The "Powered by OutSystems" footer badge is a narrower, separate case:
it's OutSystems' own known dark-ink asset, so `.powered-by img` applies
`filter: brightness(0) invert(1)` (tokens.css) to recolor it on the fly
rather than needing a per-logo decision — that one's safe to leave alone.

## Field Feedback Loop

SAs in the field don't file PRs against this repo directly — they hit
something while building a real client prototype (a missing component, a
confusing default, a rule that doesn't hold up) and need a low-friction way
to flag it without becoming a contributor to this codebase. The mechanism:

1. **SA files a GitHub issue** using the "Field Feedback" template (three
   buckets: what's working, what's not, or a suggested improvement — plus
   which client/POC surfaced it). No code, no PR, no git knowledge required.
2. **Maintainer triages the issue.** Not everything becomes a change — some
   feedback is client-specific and doesn't generalize, some is a duplicate
   of a known gap. Valid, generalizable feedback gets turned into an actual
   fix.
3. **The fix lands as a PR** the same way every other change in this repo
   does — at the library level (`components/`) or the process level
   (`CLAUDE.md`), never as a patch buried inside one client's POC folder.
   This is the same pattern that already produced two real fixes: the
   Ford POC surfacing two component bugs, and a Deca Dental Group POC
   surfacing the "pull real brand colors from the client's site" step
   above.

The POC folder itself is never the deliverable back to the team (see
`.gitignore` — `pocs/` isn't tracked). The issue, and the PR it produces,
is what the team actually reviews and benefits from.

## What This Kit Deliberately Does Not Have

- No ODC Studio / Mentor / OML generation — pure HTML/CSS/JS prototypes only
- No client registry, no CRM sync, no transcript processing
- No build tooling (npm, bundlers, TypeScript) — plain files, open in browser
- No CDN dependencies (charts, icon fonts) — the donut chart is hand-rolled
  SVG and icons are inlined as JS strings for exactly this reason
