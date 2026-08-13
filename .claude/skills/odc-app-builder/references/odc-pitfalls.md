# ODC / Mentor Build Pitfalls — Detailed Reference

Each entry below was hit and fixed for real during a single-day MVP build
(WMHS Container Inventory). Consult this before assuming a bug is novel —
check whether it's actually one of these first.

## 1. `Style` property vs `CustomStyle`

**Symptom:** you set a widget's `Style` property to something like
`background-color: #02261D;` and the color never appears.

**Cause:** in ODC, a widget's `Style` property expects a **CSS class
name** (a class defined in the app's theme StyleSheet), not a raw CSS
declaration. A raw declaration silently does nothing useful there.

**Fix:** define the class in the theme (`.app-header { background-color:
#02261D; }`) and set `Style` to `"app-header"`. Reserve `CustomStyle` for
genuine one-off inline values that don't deserve a reusable class — e.g.
a single dimensional treatment like `max-width:260px; margin:0 auto;` on
one specific input.

## 2. Site Properties don't support Binary Data

**Symptom:** you want a single app-wide image (a logo) configurable
without a redeploy, so you reach for a Site Property — but there's no
way to actually store or bind image bytes to it.

**Cause:** ODC Site Properties support Text/Integer/Boolean/etc., not
Binary Data.

**Fix:** create a singleton-pattern server entity (one row, enforced by a
"get-or-create" server action) with a Binary Data attribute. Bind your
Image widget to that record's attribute instead. This is also more
flexible than a Site Property would have been, since it's editable from
a normal screen (e.g. an admin upload screen) rather than requiring
Service Center access.

## 3. Buttons can't reliably render child images

**Symptom:** you put an `Image` widget inside a `Button` widget's content
area to build a photo-tile selector, and the image never renders (or
renders wrong).

**Cause:** `Button` widgets are built for text/icon labels. Their content
area doesn't support arbitrary child layout the way a `List`/`ListItem`
or plain `Container` does.

**Fix:** use `List`/`ListItem` for any "image + label, click to select"
tile pattern. Put the `OnClick` handler on the `ListItem` itself (not a
button inside it).

## 4. Turning a List into a wrapping tile grid — and keeping it uniform

**Symptom 1:** a `List` widget renders as a tall vertical stack of
full-width rows, not a compact grid.

**Fix:** apply a CSS class to the `List` widget itself:
`display: flex; flex-wrap: wrap; gap: 8px;`, and give each tile container
inside the `ListItem` a `flex: 1 1 140px; min-width: 140px;` (or similar).
No structural widget change needed — it's pure CSS on the existing List.

**Symptom 2:** once wrapped into a grid, tiles are wildly inconsistent
heights — some 53px, some 164px, in the same row.

**Cause:** if the image is given a fixed **width** only, its rendered
height still scales freely with the source photo's native aspect ratio.
22 different product photos means 22 different heights.

**Fix:** give each tile a fixed-size image *box* (e.g. a container sized
80×80px, `display:flex; align-items:center; justify-content:center;
overflow:hidden;`) with the `Image` widget inside set to
`object-fit: contain`. Every photo now letterboxes into an identical
footprint regardless of its native proportions. Add a `min-height` on
the label area below it too, so multi-line labels don't add extra
variance.

**Symptom 3:** stray horizontal divider lines appear between rows of the
grid.

**Cause:** the `List` widget's default row-separator styling (border/
box-shadow on each `ListItem`) is still active — it was designed for the
vertical-stack case and doesn't get removed just by changing the layout
to a grid.

**Fix:** add a class that strips `border-bottom`, `border-top`, and
`box-shadow` from the list item, apply it alongside the grid class.

## 5. Selected-state styling is invisible on an auto-advancing wizard

**Symptom:** you build a gold-border-plus-checkmark "selected" style for
a tile, it's correctly wired to the selection variable, but a user never
actually sees it — the wizard jumps to the next step the instant they
click.

**Cause:** the selection assignment and the step-advance both fire
synchronously in the same action, so the browser paints the "selected"
state and immediately unmounts it in the same frame (or close enough to
look identical to never rendering at all).

**Fix:** split the two effects. Assign the selection variable (and let it
render) first; then use a short `setTimeout` (300-400ms is enough to
register as "I saw that happen" without feeling laggy) before calling the
actual step-advance action. Keep the delay short — this is a "one-finger,
fast" flow, not a place for ceremony.

## 6. Zero-fill totals: LEFT JOIN, not a plain aggregate

**Symptom:** a "totals by category" list is missing rows for any category
that has zero entries this session — it should show `0`, not disappear
entirely.

**Cause:** a plain aggregate over the transactional table (entries) only
ever produces rows for categories that actually have entries. Categories
with none never appear, because there's no row to aggregate.

**Fix:** anchor the aggregate on the **reference** entity (the full list
of possible categories) and LEFT JOIN out to the transactional entity,
filtered to the current scope (e.g. session ID). Use a calculated
attribute: `If(IsNull(Sum(Entries.Quantity)), 0, Sum(Entries.Quantity))`.
If the reference entity itself needs filtering (e.g. `ActiveFlag = True`),
filter it **before** the join, not after — filtering after the join can
eliminate the very zero-rows you're trying to preserve.

## 7. A "clickable" table row that isn't actually clickable

**Symptom:** a history/list table is meant to let users click any row to
open a detail screen, but only one specific word in one column actually
responds to clicks — the rest of the row does nothing, and users
naturally try clicking elsewhere first and conclude the feature is
broken.

**Cause:** only one cell had an actual `<a>`/`ILink` in it; the rest of
the row was plain text with no click handler at all, and that one link
had no distinguishing hover/cursor styling anyway, so it didn't even look
different from the static cells around it.

**Fix:** put a link filling **every** cell (or wrap the whole row), all
pointing to the same destination. Add `cursor: pointer` and a subtle
hover background tint at the row level so the whole row visibly responds
to a mouse hovering over any part of it, not just one column.

## 8. The anonymous-access + stale-`UserId`-filter trap

**Symptom:** a screen or server action that used to work — showing a
user's own data, or blocking a duplicate submission — starts either
returning nothing (blank fields, "not found" errors) or letting through
actions that should have been blocked, right around the time the app
was made accessible without login.

**Cause:** almost every "this belongs to the current user" check in a
freshly-scaffolded app takes the form `SomeEntity.UserId =
GetUserId()`. The moment a screen's `AnonymousAccess` is set to `True`
(common for early demo/POC builds so testers don't need real accounts),
`GetUserId()` returns an empty string for every visitor. Any filter
built on it now compares against an empty value that nothing matches —
so a fetch returns zero rows (blank display), or a guard clause that was
meant to say "reject if this isn't yours" instead rejects everything,
including legitimate access.

This is not a one-time fix — it's a **class** of bug. In one day's build
it hit three separate, unrelated features (a review-summary display, a
submit action, and — after being fixed once — was still lurking in a
second submit-adjacent action) before being fully swept.

**Fix:**
1. The moment any screen in the app has `AnonymousAccess = True`, grep
   every aggregate filter and every server action's guard/If-condition in
   that app for `GetUserId()`.
2. For read/display purposes, replace the ownership filter with scoping
   by whatever the screen's actual input parameter already is (e.g. a
   `SessionId` passed in the URL) — that's a sufficient and correct scope
   once there's no real user identity to check against.
3. For write guards that used to mean "only the owner can do this,"
   decide what the check should now mean. Often it degrades to "does this
   record exist and is it in the right state" (e.g. still `Draft`, not
   already `Submitted`) — keep that half of the check, drop the identity
   half.
4. For state that genuinely needs to persist "for this user" without a
   real login (e.g. "don't let this browser submit twice this month"),
   move that specific piece of state to browser-local storage
   (`localStorage`) instead of server-side user identity. Pair it with a
   visible reset control (a "Reset Demo" button) so the app stays fully
   testable by one person across multiple runs without needing to clear
   browser storage manually or open an incognito window every time.

## 9. Verifying is not the same as trusting the build summary

Mentor reporting "zero errors" describes the model's internal
consistency — it does not describe runtime behavior. Every pitfall above
except #6 was a case where Mentor's build completed cleanly and the bug
only appeared on an actual click-through in a real (or headless) browser.
Budget time for a genuine verification pass after every publish; don't
treat a clean build summary as equivalent to "done."
