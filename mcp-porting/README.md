# Porting a Prototype's Web Component into a Real OutSystems Screen

This is the fourth path this kit didn't have until now: everything else in
this repo (`components/`, `examples/`, `pocs/`) targets a static HTML
prototype you open in a browser. This folder targets the opposite end of
"the prototype IS the real app" — actually building the *same* web
component into a live OutSystems Developer Cloud (ODC) screen via the
OutSystems Remote MCP, so the gap between "show the customer a concept"
and "build it in ODC" collapses instead of requiring a rewrite.

**This is not a reversal of `CLAUDE.md`'s Light DOM principle.** The HTML
prototypes in `components/` deliberately use Light DOM so a page's
`<style>` override cascades into every component for one-file rebrands —
that reasoning is specific to the "open a static file, override CSS
variables" use case. An ODC screen re-themes through the platform's own
Theme/CSS-variable system instead, and the confirmed porting mechanism
(below) requires Shadow DOM. Different rendering target, different
constraint — not a change of opinion about the prototype architecture.

**Source of this recipe:** `outsystems_solutions_architect/projects/builder-toolkit`
— a separate, much bigger SA workspace with its own proven component
library (`sa-card`, `sa-tabs`, `sa-table`, etc.) built against a shared
sandbox app called `SADemo`. Treat that project as **read-only
reference**, not a workspace — copy what you need into this kit (as this
folder does), don't edit files there. Its `docs/mcp-build-loop-learnings.md`
has the full incident history (labeled F1–F43) behind every rule below;
this doc only carries what's needed to port *this kit's* components,
not a duplicate of that log.

## The confirmed recipe

1. **Build and verify standalone first.** A plain `.js` file
   (`customElements.define(...)`) + a demo `.html` page, screenshotted in
   a real browser — *before* touching ODC at all. Cheap, and it catches
   component bugs before they're entangled with platform quirks. See
   `web-components/os-wizard-stepper-demo.html` for the pattern.
2. **Create a Script asset** in the target ODC app containing the exact
   same JS verbatim. Set `Public = false` — some tenant versions hard-fail
   the build (`OS-DPL-50205`) with `Public = true`, and there's no
   legitimate reason to leave it `true` for a component consumed by
   screens in the same app.
3. **Wire registration via the screen's `RequiredScripts` property** —
   *not* a JavaScript node on `OnInitialize`/`OnReady`. This injects a
   real `<script src="...">` into `<head>` before any widget mounts,
   guaranteeing `customElements.define` runs before the browser parses
   your custom-element tags. (Studio: Interface tab → Advanced →
   Required Scripts.)
4. **Render instances via the `AdvancedHtml` widget** — set `Tag` to the
   custom element's tag name, each attribute as an Extended Property.
   For slotted child content (this component's step fields, or any
   `<os-tabs>`-style panel content), nest widgets inside the
   `AdvancedHtml` widget with a `slot` attribute matching the component's
   `slot="step-<id>"` convention.

## Hard rules — don't rediscover these from scratch

- **Structured (JSON) attributes need a variable + `OnReady`, never a
  literal on the Extended Property.** A literal JSON value trips
  OutSystems' expression parser (it reads object keys as element/entity
  references). Give the Extended Property a safe static default
  (`"[]"`), then inject the real value via an `OnReady` JavaScript node:
  `document.querySelector('os-wizard-stepper').setAttribute('steps', json)`.
  `OnInitialize` is server-side and can't touch the DOM — using it here
  silently produces an empty attribute, not an error.
- **If the JSON is built from a real aggregate** (not a static literal),
  build it in that aggregate's **`On After Fetch`** event, and push it
  into the DOM attribute from **`On Render`**, not `OnReady` —
  `OnInitialize`/`OnReady` aren't guaranteed to run after the aggregate
  resolves, so the attribute lands empty even though nothing errors.
- **Keep the `OnReady`/`On Render` JS node small.** A large inline
  `JavaScript` node (roughly >3KB) can hard-fail the build with
  `OS-DPL-42202`, even though design-time validation only shows it as a
  performance warning. If a node needs bulky static content (icon
  markup, big lookup tables), move that content into the Script asset
  itself and pass a short token through the node instead.
- **`AnonymousAccess = true` before the first publish** on any new
  demo/test screen — otherwise the screen silently redirects to
  `/Login`, which looks exactly like "my component didn't render."
- **A `no_changes_detected: true` on a successful publish is not
  reliable proof either way.** Cross-check `env_app` (revision +
  `deploymentDateTime` should match the publish you just ran) before
  reporting a build as landed or as a no-op.
- **Start a fresh Mentor session (`app_key` only, no session token)**
  after any out-of-band change made directly in Studio, or after any
  forced publish outside the current session — a resumed session can
  silently republish its own stale cached OML and revert the Studio
  change. Don't rely on asking the same session to "re-check."
- **If a build fails and you ask Mentor to self-diagnose, treat the
  answer as a hypothesis, not a finding**, until confirmed by either a
  successful republish or reading the actual compiler output (Studio's
  own build log). A second identical failure after an "explained and
  fixed" turn means the explanation was wrong — get real diagnostic
  data next, don't ask for a third guess.
- **Bake every one of these rules into the actual build prompt**, not
  just this doc — a documented gotcha that isn't in the prompt text gets
  rediscovered from scratch, at real cost, the same way it did the first
  few times this recipe was proven out.

## Component catalog

| Component | Ported from | Attributes | Source |
|---|---|---|---|
| `os-wizard-stepper` | `components/os-components.js`'s `<os-wizard-stepper>` (Light DOM) | `steps` (JSON: `[{id,label}]`), `active`, `submit-label` (default `"Submit"`). Step content is slotted (`slot="step-<id>"`). Dispatches `os-wizard-change` (`detail: {id, index}`) and `os-wizard-submit`. Methods: `.next()`, `.prev()`, `.goTo(id)`. No `beforeNext` validation hook (see the file's own header comment for why) | `web-components/os-wizard-stepper.js` |
| `wsfp-proposal-wizard` | `pocs/wsfp-fire-sprinkler-designer/new-proposal.html`'s entire 3-step wizard (Domain-shaped — bakes in WSFP's specific fields: dropzone, Site Address, AHJ lookup, Sprinkler/Ceiling Type, Notes, Review) | No required attributes — fully self-contained, zero slots. Dispatches `wsfp-wizard-submit` (`detail: {address, ahj, sprinklerType, ceilingType, exposedBeams, notes, fileName}`) and `wsfp-wizard-processing-complete` after the self-contained processing-overlay animation. See the file's own header comment for why this exists as a second, more opinionated component instead of slotting native OutSystems widgets into `os-wizard-stepper` | `web-components/wsfp-proposal-wizard.js` |

Each `.js` file's own header comment is the authoritative spec — read it
before using or modifying.

## Reference sandbox app

`builder-toolkit`'s `SADemo` app (app key `65cde749-04e1-47b4-b147-8244ee3c8f17`,
tenant `peterrifkendemos-dev.outsystems.app`) is where this recipe was
proven, and it's also where this kit's own WSFP proposal screen
(`newproposal`, in the app's `WSFP` UiFlow) lives — see the client
project notes at
`outsystems_solutions_architect/clients/api-group/opportunities/wsfp-ai-fire-sprinkler-designer/`
for that build's context.
