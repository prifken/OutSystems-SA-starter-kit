# Brand Stress Test

The mechanical checks (`lint-poc.js`, `verify-poc.js`, `scan-secrets.js`)
prove the golden fixture still renders and behaves. They do not prove the
kit's actual rebrand workflow — "pull a real client's real logo and colors
and apply them" — still holds up. This is a separate, **agent-assisted**
step for that: it requires real web research and visual judgment, so it
can't be a deterministic script the way the others are.

**Never commit the output.** A rebrand always uses one specific real
company's actual trademarked logo and colors. Like `pocs/`, that output is
ephemeral — regenerated fresh each time this test runs, against a
*different* random company, and discarded afterward. See `.gitignore`
(`scripts/golden-fixture/_brand-stress-test/`). The randomness is
deliberate: a single fixed test company would only ever catch the bugs
that company's specific logo/colors happen to trigger. A fresh company
each run is what actually stress-tests the rebrand *rule*, not one
instance of it — this is the same failure mode that produced two of this
kit's real historical fixes (see "Field Feedback Loop" in CLAUDE.md: the
Ford POC and the Deca Dental Group POC each surfaced a rebrand bug that a
single canned example wouldn't have).

## Procedure (run via an agent — e.g. ask Claude Code to do this)

1. Pick a real, current Fortune 500 company where the golden fixture's
   use case (an ops/dispatch dashboard tracking status, exceptions, and
   documents) plausibly fits — doesn't have to be logistics specifically,
   but should make sense, not be a random mismatch (a beauty retailer
   doesn't need a "trailer temperature" gauge).
2. Copy `golden-fixture/`'s screens into
   `golden-fixture/_brand-stress-test/` (already gitignored), fixing the
   extra directory nesting: relative paths to `components/` need one more
   `../` than the originals, and `<os-sidebar-nav>` needs an explicit
   `powered-by-logo="../../../components/os_logo.png"` attribute — its
   default value assumes the original nesting depth and silently 404s
   without it (verify-poc.js's JS-error check catches this if you forget).
3. Research the company's **real** brand colors and logo, per CLAUDE.md's
   rebrand rule — from their own site's CSS where possible, not just a
   guess from their logo alone. Note whatever your research method
   actually reached (primary site vs. third-party corroboration) and say
   so plainly in your findings — don't present a lower-confidence source
   as if it were the primary one.
4. Write those colors into a `brand.css` in the stress-test folder,
   overriding `--color-primary`/`--color-primary-hover`/`--color-neutral-10`
   etc. — never edit `tokens.css` itself. Link `brand.css` after
   `tokens.css` on every screen.
5. Run `check-logo.js` against the downloaded logo file and follow its
   recommendation (direct placement / `logo-chip` / `show-brand-label`).
6. Run `lint-poc.js` and `verify-poc.js` against
   `golden-fixture/_brand-stress-test/` — both must pass clean, same bar
   as the golden fixture itself.
7. Look at the actual screenshots. Specifically check: is the primary
   button text still legible against the new `--color-primary`? A
   brand's most recognizable color is not automatically safe as an
   interactive-element color — see the finding below.
8. Delete `_brand-stress-test/` when done (or just leave it — it's
   gitignored either way and next run overwrites it with a new company).

## A finding from the first run of this test

First run used J.B. Hunt Transport Services (a real Fortune 500 freight
carrier — a natural fit for this fixture's dispatch/exception-tracking
use case). Two things surfaced that are worth carrying forward as
standing checks, not just one-off notes:

- **This session's network egress policy blocked fetching jbhunt.com,
  brandfetch.com, and wikipedia.org directly** (confirmed via
  `curl $HTTPS_PROXY/__agentproxy/status` — 403, organization policy, not
  a retry-able failure). Real logo download and direct site-CSS
  inspection weren't possible from this environment; only third-party
  color-aggregator sites (which happened to agree across four
  independent sources) were reachable via web search. **Run this test
  from an environment with fuller outbound web access when you actually
  need the logo-legibility half of the check** — an environment that
  can reach the target company's own domain, not just search results
  about it.
- **A brand's iconic color is not automatically a safe `--color-primary`.**
  J.B. Hunt's real, confirmed brand color is a bright yellow (`#FFDB00`).
  Piped directly into `--color-primary`, it produces white-on-yellow
  button text and a barely-visible focus ring — illegible the moment
  it's actually rendered, not obvious from the hex code alone. The
  working rebrand used the brand's black (`#000000`) as `--color-primary`
  instead, and left the yellow unused rather than forcing it somewhere
  it doesn't work. **Always render and look at a real screenshot of the
  primary button before accepting a rebrand — don't approve a color
  override from the hex values alone.**
