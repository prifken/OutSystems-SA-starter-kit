---
name: odc-app-builder
description: Guide driving OutSystems Mentor (via the outsystems MCP server) to build, style, and debug a real ODC application from a requirement document, and to run design/UX polish passes on an already-built ODC app. Use this skill whenever the user wants to build an ODC app with Mentor, fix an ODC screen's layout/styling, debug a Mentor-built app that "compiles clean but breaks live," or bring a Mentor-built app's visual design in line with an existing SA Starter Kit HTML prototype. Complements requirement-doc-builder: that skill produces the spec, this skill covers everything from handing the spec to Mentor through a live, polished app.
---

# ODC App Builder & Design QA

A skill for driving OutSystems Mentor through the build-and-polish phase of an
ODC application: turning a requirement document (see `requirement-doc-builder`)
into a working app, then iterating on layout, styling, and UX until it matches
the SA Starter Kit's design standard — all via the `outsystems` MCP server,
without opening ODC Studio directly.

## When to use this skill

- A requirement document exists (or a rough scope is agreed) and it's time to
  have Mentor actually build entities, screens, and logic.
- An existing Mentor-built ODC app needs a design/UX pass — colors, spacing,
  layout, component patterns — brought in line with a reference HTML prototype
  or the SA Starter Kit's own design language.
- A Mentor-built screen is throwing an error, showing blank data, or otherwise
  misbehaving in the browser despite Mentor reporting "zero errors."
- Multiple rounds of iterative build → publish → verify → fix are expected,
  not a single one-shot generation.

This skill assumes MCP tools `mentor_start`, `mentor_get_run`, `publish_start`,
`publish_status`, `app_create`, `context_screens`/`context_entities`, and
Playwright (or an equivalent headless browser) are available in the session.

## The confirm-first workflow (the single most important habit)

**Never send Mentor a "build this" prompt as your first message on a new
piece of scope.** Send a **review-first** prompt: describe the plan in
concrete detail, ask Mentor pointed technical questions about the ODC-native
way to do it, and explicitly tell it not to change anything yet. Only after
reading its response — and adjusting the plan if it flags a problem — send
the actual build prompt.

This isn't ceremony. Across a single day of building one MVP, this pattern
caught, before any code was written:
- A seed-data mechanism that would have silently duplicated records on every
  future publish (recommended one-shot action, got a real recurring Timer,
  caught before it shipped)
- A binary-image storage approach that doesn't exist in ODC's Site Property
  model (would have been a dead end after the fact)
- A Button-based tile design that can't render images at all
- A `DropdownSearch` vs `Dropdown` choice that only mattered once real data
  scale was considered

Template for the review message:

```
Before you make any changes, review and confirm/adjust this plan. Don't
build anything yet — just respond.

[Concrete description of entities/screens/logic/styling to add or change,
 with enough detail that Mentor can evaluate feasibility, not just intent.]

QUESTIONS FOR YOU: [specific ODC-pattern questions — e.g. "what's the right
widget for X", "should this be a static or server entity", "is there a
simpler ODC-native way to do Y"]. Please flag anything here that's a bad
fit for ODC patterns before I ask you to build it.
```

Only for genuinely trivial, single-line fixes (a typo, an obvious missing
CSS property with one correct answer) is it reasonable to skip straight to
a build prompt — and say so explicitly ("this one's simple enough to skip
review").

After every build response, actually read the summary for validation
warnings, caveats, and "one thing to verify" notes — Mentor is often
explicit about what it's unsure of. Publish, then go verify that exact
thing first.

## Verify in the browser — "zero errors" is not "it works"

A clean compile from Mentor's build step proves the model is internally
consistent. It does **not** prove the screen works for a real user. In one
day of building, three separate changes reported zero errors and still
broke on first live click-through: an auth wall that threw instead of
redirecting, a stale filter that made a submit button crash, and a stale
filter that made a review screen render every field blank.

After every publish:

1. Get the runtime URL (`env_app`, or construct it from `env_list` +
   the app name).
2. Drive the actual screen with a headless browser (Playwright). Fill in
   real inputs, click every button in the flow, not just the happy path's
   first step.
3. Capture `console` errors and `pageerror` events, not just visual
   screenshots — several bugs in this pattern only surface as a JS
   exception with no visible page change.
4. **Wait for async content to actually render before screenshotting.**
   Images bound to Binary Data attributes render via `blob:` URLs that
   need a moment to decode. A screenshot taken 200-300ms after a re-render
   can show images as missing that are, in fact, present and correctly
   loaded — confirmed by re-checking with a longer wait or inspecting
   `img.naturalWidth` directly via `page.evaluate`. Don't report a false
   regression because the screenshot fired too early.
5. If something looks broken, inspect the DOM directly (`page.evaluate`
   pulling `outerHTML`, computed styles, `naturalWidth`, etc.) before
   guessing at a fix — the fastest path to a correct fix is knowing exactly
   what's actually in the rendered page, not what you assume Mentor built.

## Known ODC pitfalls (update this list as you find more)

See `references/odc-pitfalls.md` for the full write-up of each. Summary:

| Symptom | Cause | Fix |
|---|---|---|
| Widget's `Style` property doesn't apply the color/background you set | `Style` takes a **CSS class name**, not a raw CSS declaration | Define a class in the theme StyleSheet, reference it by name; use `CustomStyle` only for genuine one-off inline CSS |
| Can't get a single app-wide image to persist | Site Properties don't support Binary Data | Use a singleton server entity with a Binary Data attribute instead |
| Image never renders inside a tile/button | `Button` widgets don't reliably render arbitrary child content | Use `List`/`ListItem` for any image+label selectable-tile pattern |
| Tile grid has wildly inconsistent row heights | Image width constrained but height left free-scaling per source aspect ratio | Fixed-size image box (e.g. 80×80) with `object-fit: contain`, plus a min-height label area |
| Gold/selected border never visible on a tile | Wizard auto-advances the instant the selection is made | Add a deliberate ~300-400ms delay between assigning the selection and firing the step-advance |
| A reference-data row silently disappears from a totals list when it has no entries | Aggregate is anchored on the transactional table, not the reference table | LEFT JOIN from the reference entity out to the transactional entity, `If(IsNull(Sum(...)),0,Sum(...))` for the zero-fill |
| Users can't click most of a "clickable" table row | Only one cell actually contains a link | Put a link filling every cell (or the whole row container), not just one column |
| A screen crashes or renders blank fields, but only in production/anonymous mode | A leftover `EntityAttribute = GetUserId()` filter — `GetUserId()` returns empty once the screen is Anonymous | Audit every aggregate and server action that filters by user identity the moment any screen in the app goes Anonymous; remove or replace with a real scoping key (e.g. the record's own Id) |
| "Can't resubmit" or "already done" locks stop working post-launch | Same anonymous-access root cause — there's no real per-user server state anymore | Track that specific piece of state client-side (`localStorage`) instead, and always pair it with a visible reset/clear control so the demo stays testable |

**The anonymous-access + stale-`UserId`-filter combination is the single
highest-value thing to check first** when a Mentor-built app is running
without a login flow (common for early demo/POC builds) and something
that used to work stops working, or data that should be there renders
blank. Grep every aggregate's filter and every server action's guard
clause for `GetUserId()` the moment a screen's `AnonymousAccess` flips to
`True`.

## Design system fidelity

If an SA Starter Kit HTML prototype already exists for this client
(`pocs/<client>/`, using `components/tokens.css` + a `brand.css` override),
treat it as the literal design spec for the ODC build, not just
inspiration:

- Pull the **exact** hex values, spacing scale (`--space-*`), border-radius,
  and shadow values out of `tokens.css`/`brand.css` — don't approximate.
- Match specific component patterns the prototype already solved: a
  tile-selection grid, a large centered quantity input, a locked
  read-only summary view. These exist in the HTML prototype because they
  were already found to work for this exact use case.
- After a styling pass, don't accept "it has the brand color now" as
  done — click through and compare side-by-side against the HTML
  prototype's actual rendered screens. A color change is not the same
  as design fidelity; layout, spacing, input sizing, and component
  patterns matter just as much and are easy to skip past.

## Placeholder data discipline

When a requirement calls for reference data (a plant list, a region list,
anything with real-world values) that doesn't exist anywhere in the
provided source documents:

1. Actually search for it first — don't assume it's missing without
   checking every doc, image filename, and related sibling-app
   screenshot available.
2. If it genuinely isn't documented anywhere, construct a clearly-labeled
   placeholder set grounded in whatever partial signal does exist (a
   naming-convention hint, a sibling app's example values) rather than
   inventing from nothing.
3. Flag it in the model itself (entity/action description text — "PLACEHOLDER
   DATA — replace with real master list"), not just in conversation, so a
   future person editing the app doesn't miss the constraint.
4. Never block the build waiting for real data that may not arrive soon —
   ship the correct architecture with placeholder values now, swap the
   values later.

## Self-critique checklist before calling a UI pass "done"

Run through this after every styling/layout pass, ideally with a fresh
screenshot in hand:

- [ ] Do same-type components (tiles, cards, list rows) render at
      **uniform size**, regardless of variable content like image aspect
      ratio or label length?
- [ ] Does every input's width match what it holds (a quantity field
      should not be as wide as a name field)?
- [ ] Is there a real max-width on the content column, or does everything
      stretch edge-to-edge on a wide viewport?
- [ ] Is card/form chrome exactly one level deep (no redundant nested
      borders)?
- [ ] Does every interactive element actually *look* interactive —
      cursor, hover state, consistent with what's clickable vs. static
      text? (A real `<a>` with default browser styling stripped and no
      hover treatment looks exactly like plain text — this is a common,
      easy-to-miss failure.)
- [ ] Does every screen have consistent navigation back to a home/dashboard
      screen — no dead ends?
- [ ] Did the fix actually get verified live (screenshot + DOM check),
      or only confirmed via a clean Mentor build summary?

## Reference

`references/odc-pitfalls.md` — full write-up of each pitfall above, with
more context on why it happens and what the correct ODC-native fix looks
like structurally.
