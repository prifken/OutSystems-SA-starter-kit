# Icon Set

Standalone copies of the icons used by `os-components.js`, for the rare case
you want to drop one directly into markup (e.g. inside an `<img>`, or copy
the raw `<svg>` markup into a one-off element) instead of going through the
JS icon helper.

**For anything inside a component**, you don't need these files — every
component and page script uses the inline `ICONS` map at the top of
`../os-components.js` (a plain JS object of SVG path strings), so there is
zero `fetch()` of these files at runtime. That's deliberate: `fetch()` of
local files is blocked by the browser under `file://` (no build step, no
local server, remember), so the icon set is inlined in JS instead of loaded
from this folder.

All icons: 24x24 viewBox, 2px stroke, `stroke="currentColor"` (inherits
text color), rounded caps/joins. Add new icons to both places if you need a
new one available inside components — this folder for reference/copy-paste,
and the `ICONS` object in `os-components.js` for actual component use.

Available: `ticket`, `user`, `clock`, `alert-triangle`, `check`, `search`,
`chevron-down`, `grid`, `settings`, `sparkles`. The JS `ICONS` map has a
larger set (about 20 icons) — check there first before adding a new SVG.
