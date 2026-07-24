## What changed and why

<!-- 1-3 sentences. If this came from field feedback, link the issue. -->

## Punch list

Full checklist for any PR touching `components/` (`tokens.css` or
`os-components.js`). If this PR doesn't touch `components/` — a docs fix,
a change scoped to one client's own `pocs/` folder, etc. — only the
**Process** section applies; strike the rest.

See `scripts/README.md` and `scripts/golden-fixture/README.md` for what
each script/fixture referenced below actually is.

### Automated — CI must be green (`.github/workflows/golden-fixture.yml`)

- [ ] 1. `lint-poc.js` passes: every `<os-*>` tag used is a real registered component
- [ ] 2. `tokens.css` is linked and `os-components.js` loads at the end of `<body>`
- [ ] 3. Every internal `href` resolves (or is intentionally `#`)
- [ ] 4. Sidebar nav markup is identical (mod `active`) across every screen touched
- [ ] 5. `verify-poc.js` passes: every screen/tab/modal/sidebar trigger opens with zero JS console errors
- [ ] 6. `scan-secrets.js` finds nothing in the diff

### Rule #1 — Compose, Don't Invent

- [ ] 7. Any new visual pattern was added to `os-components.js` + `tokens.css` first, then used — not invented inline in a screen file
- [ ] 8. Small/one-off needs were composed from existing Tier 2 primitives, not bespoke markup or an unnecessary new component
- [ ] 9. Any new component is added to CLAUDE.md's component table; any new primitive is added to the Primitives table
- [ ] 10. Any new icon was added to the shared `ICONS` map in `os-components.js`, not inlined ad hoc
- [ ] 11. New components render into light DOM (`this.innerHTML`), never `attachShadow`

### Visual review — look at the actual screenshots, not just exit codes

- [ ] 12. `verify-poc.js` screenshots were opened and reviewed by eye, not just checked for a zero exit code
- [ ] 13. The mobile breakpoint (sidebar collapses under 768px) still looks right on any touched screen
- [ ] 14. A throwaway `--color-primary` override doesn't break any touched component (quick spot check)

### Brand stress test — agent-assisted, see `scripts/golden-fixture/BRAND_STRESS_TEST.md`

- [ ] 15. A random real Fortune 500 company's real logo + colors were pulled from their actual site (not guessed) and applied via a `brand.css` override — `tokens.css` itself untouched
- [ ] 16. `check-logo.js` was run against the downloaded logo and its recommendation was followed
- [ ] 17. The rebranded fixture still passes `lint-poc.js` + `verify-poc.js`, unchanged
- [ ] 18. The primary button/focus-ring color was actually looked at in a screenshot for legibility — not accepted from the hex code alone (see the J.B. Hunt finding in `BRAND_STRESS_TEST.md` for why this is its own line item)

### Process

- [ ] 19. If this PR originated from a field-feedback issue, it's linked above
- [ ] 20. CLAUDE.md / README updated if this PR changes a documented rule, adds a component, or adds a primitive
