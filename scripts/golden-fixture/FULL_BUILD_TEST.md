# Full-Build Test

The mechanical checks (`lint-poc.js`, `verify-poc.js`, `check-chart-layout.js`)
prove the *committed* `golden-fixture/` screens still render and behave.
They do not prove that building **fresh** from a transcript, today,
against the kit's *current* rules, still produces a good result — that's
a different, stronger claim, and it's the one this procedure tests. This
is the standard, repeatable way to stress-test the whole kit end to end,
combining a fresh build with `BRAND_STRESS_TEST.md`'s random-company
rebrand and the full QA battery in one pass.

**Never commit the output.** Like `BRAND_STRESS_TEST.md`, a full run of
this procedure produces disposable, ephemeral artifacts — a fresh build
in `pocs/` (already gitignored) and a real company's actual trademarked
logo/colors. Discard the build folder when done, or leave it; the next
run overwrites it with a different transcript and a different company.

## Procedure

1. **Pick a transcript.** Reuse `golden-fixture/transcript.md` (Harborline
   Logistics), or write a new fictional one in the same style —
   conversational, noisy, requirements mixed in among small talk, not a
   clean spec. The transcript is the input; it shouldn't hand you a
   ready-made component list.
2. **Build fresh, blind.** Create a new folder under `pocs/` (e.g.
   `pocs/_fresh-build-test/`) and build screens from the transcript
   *without* looking at `golden-fixture/`'s existing screens while you
   do it. The point is testing whether the current component library +
   `CLAUDE.md` rules independently produce a good decision-by-decision
   build, not confirming you can copy an existing answer. Include an
   `index.html` redirect stub (see the root `CLAUDE.md` rule) from the
   start.
3. **Verify the un-rebranded build first**, before touching any brand
   colors:
   ```
   cd scripts
   node lint-poc.js ../pocs/_fresh-build-test
   node verify-poc.js ../pocs/_fresh-build-test
   node check-chart-layout.js ../pocs/_fresh-build-test
   ```
   All three should pass clean. Look at the actual screenshots in
   `_verify-output/` — a clean exit code is not the same as a good
   build. Fix anything real before moving on to the rebrand; don't let
   brand colors mask a structural problem underneath them.
4. **Inject brand randomness.** Follow `BRAND_STRESS_TEST.md`'s
   procedure — pick a real, current Fortune 500 company where the
   transcript's use case plausibly fits, research real colors/logo,
   write a `brand.css`, run `check-logo.js` — but apply it to the fresh
   build from step 2, not to `golden-fixture/` itself. Use a *different*
   company than whatever the last run used; the randomness is the point
   (see `BRAND_STRESS_TEST.md`'s own reasoning for why a fixed company
   would only ever catch that company's specific bugs).
5. **Re-run the full battery against the rebranded build:**
   ```
   node lint-poc.js ../pocs/_fresh-build-test
   node verify-poc.js ../pocs/_fresh-build-test
   node check-chart-layout.js ../pocs/_fresh-build-test
   node scan-secrets.js
   ```
   Look at the screenshots again, specifically for button-text
   legibility against the new `--color-primary` (the J.B. Hunt finding
   in `BRAND_STRESS_TEST.md`) and any chart-layout regressions the new
   colors might have exposed.
6. **Report findings** — what passed, what needed fixing and why, and
   whether anything here should become a new mechanical check (the way
   `check-chart-layout.js` itself came out of exactly this kind of run)
   or a new `CLAUDE.md` rule.

## Findings from the first full run (2026-07-24)

Transcript: Harborline Logistics (existing). Company: Old Dominion
Freight Line (real Fortune 500 LTL freight carrier — a natural fit for
a dispatch/exceptions use case, and a different company than the J.B.
Hunt run already documented in `BRAND_STRESS_TEST.md`). Colors confirmed
via two independent sources (the site's own SVG icon fill, corroborated
by Brandfetch's aggregated data) after `odfl.com`'s compiled CSS
returned an empty response when fetched directly — the same network-
policy pattern `BRAND_STRESS_TEST.md` already documented, not a new
issue.

- **Guessing a Tier 2 primitive's markup from `CLAUDE.md`'s summary
  table alone, instead of reading the actual CSS first, produced wrong,
  invisibly-broken markup.** The fresh build's first pass at `.toggle`
  put the `toggle-switch` class directly on the `<input>` itself.
  The real CSS (`.toggle input { display: none; }` plus a *separate*
  sibling `.toggle-switch` element styled via an adjacent-sibling
  selector) meant that markup would have rendered no visible switch at
  all — the input is hidden by design, and nothing else was there to
  show. Caught by actually grepping `tokens.css` before finishing the
  screen, not by any script. **Standing lesson: `CLAUDE.md`'s primitives
  table is a pointer to the pattern, not the full contract — check the
  actual CSS selectors in `tokens.css` before composing a primitive
  you haven't used before, the same way you'd check a component's own
  comment block in `os-components.js`.**
- **HTML entities in a component property bit again, in this very
  build**, confirming Rule #3 is a real recurring mistake and not a
  one-off: `os-status-timeline`'s `items` array had `&mdash;` in a
  title string, which would have rendered as the literal text
  `&mdash;` instead of an em dash. Caught by review before running
  `verify-poc.js`, not by the script (nothing here mechanically checks
  for this yet — see "Ideas for further mechanization" below).
- **`check-chart-layout.js`'s fill-ratio threshold needed empirical
  tuning, not a guess.** A reconstruction of the original undersized-
  chart bug (a 160px-default donut in a `grid-2-1` card stretched to
  match a taller sibling) came out to a 25% fill ratio — the script's
  first threshold (20%) would have let it pass. Raised to 30% after
  confirming: (a) the known-bad case now fails at 25%, and (b) every
  already-good POC checked (the reference example's two stacked charts
  at 49%/61%, the WSFP POC's fixed dashboard at 59%) still passes
  comfortably above the new threshold. Documented here so a future
  threshold change has the reasoning to adjust from, not just a number.

## Ideas for further mechanization

Not built yet, but worth considering if they keep recurring:

- A lint-poc.js check for HTML entities (`&mdash;`, `&middot;`, etc.)
  appearing inside a `<script>` block's object/array literals — the
  Rule #3 mistake above. Risk: false positives on entities inside a
  raw `innerHTML` string a page builds itself (those are legitimate —
  see Rule #3's own distinction). Would need to specifically target
  values assigned to a known component property (`.items =`, `.data =`,
  `.insight =`, etc.), not any entity anywhere in a `<script>` tag.
- A primitive-markup structural check (e.g., confirm every `.toggle`
  has a `.toggle-switch` sibling, every `.meter` has both a
  `.meter-track` and `.meter-fill`) — the guessing-the-wrong-structure
  mistake above. Lower priority than the entity check since it's a
  narrower, rarer mistake once someone's actually hit it once.
