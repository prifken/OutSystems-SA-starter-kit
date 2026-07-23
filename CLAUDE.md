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

Full implementation details and inline comments live in `os-components.js`
itself — read the top-of-file comment block for each component before
using it for the first time.

## How to Build a New Prototype

1. Copy `examples/os-ticketing/` to a new folder — e.g. `pocs/acme-corp/`
   (or wherever you keep client work; this kit doesn't prescribe a
   directory beyond `examples/`).
2. Keep the two `<link>`/`<script>` references pointed at
   `../../components/tokens.css` and `../../components/os-components.js`
   (adjust the relative path if your new folder is nested differently).
3. Swap the sidebar nav items, KPI labels, table columns/rows, and copy —
   leave the component tags alone.
4. If the client needs different brand colors, add a `<style>` block after
   the `tokens.css` link that overrides the relevant `--color-*` custom
   properties. Don't touch `tokens.css` itself for a one-off rebrand.
5. If you need a component that doesn't exist yet, add it to
   `os-components.js` + `tokens.css` first (following the pattern of an
   existing component), then use it. Don't build one-off markup in a
   screen file.
6. Open the HTML file directly in a browser. No build step, no server,
   no npm install.

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

## What This Kit Deliberately Does Not Have

- No ODC Studio / Mentor / OML generation — pure HTML/CSS/JS prototypes only
- No client registry, no CRM sync, no transcript processing
- No build tooling (npm, bundlers, TypeScript) — plain files, open in browser
- No CDN dependencies (charts, icon fonts) — the donut chart is hand-rolled
  SVG and icons are inlined as JS strings for exactly this reason
