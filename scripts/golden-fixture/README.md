# Golden Fixture

A committed, tracked prototype (unlike `pocs/`, which is gitignored) used
as a regression fixture for the component library. It exists to answer
two different questions with one artifact:

1. **Did a change to `components/` break anything?** Run `lint-poc.js`,
   `verify-poc.js`, and `scan-secrets.js` (from `scripts/`) against this
   folder — same as any other POC — and they should always pass. If a
   `tokens.css`/`os-components.js` edit breaks this fixture, it would
   have broken a real client build too.
2. **Does the library + CLAUDE.md's rules hold up against an unclear,
   conversational input, not just a clean spec?** `transcript.md` is a
   fictional discovery call (Harborline Logistics, a fictional regional
   freight company) written the way real ones sound — noisy, with the
   actual requirements mixed in among small talk — instead of a bulleted
   requirements list. The four screens here are what building from that
   transcript actually produced, decision by decision:

| Need in the transcript | Resolution | Why |
|---|---|---|
| Ops dashboard: on-time %, active loads, exceptions | `os-kpi-card` | Existing Tier 1 component, used as-is |
| At-a-glance status breakdown | `os-chart-donut` | Existing Tier 1 component |
| Search/filter the load list | `os-search-filter-bar` | Existing Tier 1 component |
| Load list, click into detail, "don't show a blank screen" on empty filters | `os-data-table` (`empty-text`) | Existing Tier 1 component already handles this |
| Checkpoint history per load | `os-status-timeline` | Existing Tier 1 component |
| Overview/Milestones/Documents per load | `os-tabs` | Existing Tier 1 component |
| "No documents yet" | `os-empty-state` | Existing Tier 1 component |
| New-load form with a review step before submit | `os-wizard-stepper` + `os-form-field` | Existing Tier 1 components |
| Quick accept/dispute-with-a-note on a flagged exception | `.alert-warning` + `.btn-success`/`.btn-error` + a plain `<textarea class="form-control">`, composed directly in `shipment-detail.html` | Dana's own words: "don't overbuild it" — this is a Tier 2 primitive composition, not a new component. See CLAUDE.md "Primitives." |
| Per-dispatcher notification toggles | `.toggle`/`.toggle-switch`/`.checkbox`, composed in `settings.html` | Same reasoning — three or four on/off switches don't need a bespoke component |
| Reefer temperature "like a fuel gauge, at a glance" | New Tier 2 primitive: `.meter`/`.meter-track`/`.meter-fill` added to `tokens.css` | This was the deliberately ambiguous one — it doesn't map to an existing component (no history to chart, unlike `os-chart-donut`) and isn't quite an existing primitive either. The call: a single current reading against a limit is a styling-only need (no interactivity, no JS), so it became a new CSS primitive rather than a new custom element or one-off inline SVG in the screen file — see the comment above `.meter` in `tokens.css`. |
| Live GPS map tracking | Not built — `data-disabled="true"` nav item pointing at `#` | Explicitly out of scope per CLAUDE.md's "What This Kit Deliberately Does Not Have" (real integration/live data). The existing sidebar-nav convention for an unbuilt destination applied directly — no need to fake a map. |

That last three rows are the actual test: given a need that isn't a clean
match for anything already documented, does the result stay disciplined
(extend the primitive layer, or correctly recognize a kit boundary)
instead of drifting into bespoke one-off markup or overbuilding a feature
nobody asked for.

## Running the checks

```
cd scripts
npm install   # once
node lint-poc.js golden-fixture
node verify-poc.js golden-fixture
node scan-secrets.js
```

All three should pass. `verify-poc.js` writes screenshots to
`golden-fixture/_verify-output/` (gitignored) — look at them after any
`components/` change, don't just trust a clean exit code, same caveat as
in `scripts/README.md`.

## Enforcement on PRs

`.github/pull_request_template.md` embeds the full 20-item punch list
this fixture and its checks feed into — that's what actually shows up
when an SA opens a PR against this repo. Items 1-6 are what
`.github/workflows/golden-fixture.yml` runs automatically; the rest
(Rule #1 conformance, visual review, the brand stress test, docs) are
things a reviewer confirms by eye. See `BRAND_STRESS_TEST.md` in this
folder for the brand-adaptation half specifically — it's agent-assisted,
not a script, and deliberately uses a different random real company each
time rather than one fixed example.

## Updating this fixture

If `components/` gains a new component or primitive and you want this
fixture to exercise it, edit the screens directly — there's no
regeneration step, this isn't re-derived from the transcript
automatically. `transcript.md` stays as the historical record of what
this fixture was originally built to prove; it doesn't need to change
just because the screens evolve.
