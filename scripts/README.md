# Maintainer / QA scripts

These are **not** part of the kit itself. Nothing here is required to build
or open any prototype — `components/` and any `pocs/`/`examples/` screen
stay zero-install, open-directly-in-a-browser, exactly as documented in the
root `CLAUDE.md`. This folder is tooling for whoever maintains the shared
component library and reviews new POCs before they're considered done.

## Setup (once)

```
cd scripts
npm install
```

## What's here

| Script | Replaces | Usage |
|---|---|---|
| `check-logo.js` | Eyeballing a screenshot to guess if a logo will be legible | `node check-logo.js path/to/logo.png` |
| `lint-poc.js` | Manually re-reading every screen for component/link/consistency drift | `node lint-poc.js path/to/pocs/some-client` |
| `verify-poc.js` | Hand-writing a fresh Playwright script per build to click through tabs/modals | `node verify-poc.js path/to/pocs/some-client` |
| `vendor-for-deploy.js` | Manually copying shared files + rewriting `../../` paths by hand before a standalone static-host deploy | `node vendor-for-deploy.js path/to/pocs/some-client` |
| `scan-secrets.js` | Hoping nobody commits a credential | `node scan-secrets.js` (defaults to whole repo) |

## Why these exist

Built after a real build session surfaced the same two mistakes twice:
guessing wrong about whether a logo would be legible on the dark sidebar
(once defaulting everything to a white chip it didn't need, once
misjudging a screenshot and having to pixel-sample the file by hand to
find out), and writing a bespoke visual-verification script from scratch
for every single build instead of having one reusable one. Both are
mechanically checkable — `check-logo.js` and `verify-poc.js` are that
mechanism. `lint-poc.js` and `scan-secrets.js` cover two more checks that
were previously "a human reads the file and remembers the rule."

None of these replace looking at the actual rendered screenshots and
using judgment about whether the *content* is good — they catch specific,
previously-observed failure modes, not general quality.

## `verify-poc.js` convention

For it to find your interactive triggers (anything that opens a modal or
slide-in panel), mark the trigger element with `data-verify-open="short-name"`.
Tabs need no tagging — `os-tabs` already renders `[data-tab-target]`
automatically. See `examples/os-ticketing/ticket-detail.html` or
`pocs/ford/supplier-detail.html` for the pattern in use.

## Deploying a POC standalone (Netlify, etc.)

A prototype's screens normally link the shared `../../components/tokens.css`
and `../../components/os-components.js` — correct for local development,
wrong for a static-host deploy that uploads only the POC's own folder
(`../../` resolves outside the deployed site, so *everything* 404s,
silently, including `os-components.js` itself — meaning no CSS and no
custom elements render at all). Before deploying a POC folder standalone:

```
node vendor-for-deploy.js path/to/pocs/some-client
node lint-poc.js path/to/pocs/some-client   # confirms via its own check
```

`vendor-for-deploy.js` discovers every `../../components/<file>` the POC
actually references (not a hardcoded list — it'll pick up a logo, an
icon, whatever's actually used), copies each into the POC's own
`components/` subfolder, rewrites every reference to the local path, and
fixes `os-sidebar-nav`'s `powered-by-logo` default the same way. Safe to
re-run — copies overwrite, rewrites are idempotent.

## Golden fixture (regression testing)

`golden-fixture/` is a committed, tracked prototype these scripts run
against on every PR that touches `components/` (see the CI workflow in
`.github/workflows/`). Unlike `pocs/`, it's not gitignored — it's the
thing that answers "did this library change break something?" See
`golden-fixture/README.md` for what it is and why it was built the way
it was.

## Wiring `scan-secrets.js` as a pre-commit gate (optional, not done automatically)

```
#!/bin/sh
node scripts/scan-secrets.js || exit 1
```
Save as `.git/hooks/pre-commit` and `chmod +x` it. Not installed by default —
whether to gate every commit on this is a decision, not something to do
silently on your behalf.
