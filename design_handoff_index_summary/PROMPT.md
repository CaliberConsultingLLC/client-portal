# Cursor prompt — Index Score Summary cards (Basin Report)

Paste this into Cursor with the two `.tsx` files from this folder open.

---

Implement the **Index Score Summary** strip at the top of the DWS Field Employee
Experience → **Benchmark → Basin Report** (the `dws` employee-experience
dashboard, chromeless field-redesign layout).

`IndexScoreSummary.tsx` in this folder is the design reference — a working
prototype of exactly the look and behavior I want. Bring in **only this
component**. Do not bring over any other prototype screens, options, or
experiments, and do not add anything that isn't in this file.

**Follow the existing dashboard's design system — do not introduce new tokens:**

- Reuse the shared score gradient. The prototype ships a copy of
  `makeGradientColor(60, 85)`, but in the codebase this already exists as
  `dwsScoreColor` in `src/app/employee-experience/dws/ee-report-kit.tsx`.
  **Delete the local copy and import the real one** (plus `isLightBand`), so the
  tiles match the tables and charts below them.
- Colors, radii (14px), the 1.5px borders, and the soft card shadow all come
  from the current redesign — keep them identical to the file. The selected /
  expanded tile border must be the tile's **own darker color** (`darken(fill)`),
  never the nav gold `#D7B35A`.
- Typography is inherited Montserrat; weights 700/800 as in the file.
- Green = up, red = down, from the DWS palette (`design-tokens.ts`).

**Layout & behavior (already implemented in the file — preserve it):**

- `Overall` tile is left-justified and ~20% larger than the index tiles.
- The indexes are justified to the **right**, so the last index sits on the far
  edge; the gap between Overall and the index group flexes with the count
  (works for 5–7 indexes; the live dashboard has 5).
- Each tile is a button that **expands / contracts** its two numbers beneath the
  score — `delta` (change vs prior, with + / −) and `diff` (vs org, with an
  up/down arrow), each with a tiny label. Tiles toggle **independently**.
- `delta` is `null` when there's no prior campaign → render `—`.

**Wiring real data:**

- Feed the report's real index model into the `overall` and `indexes` props as
  `IndexDatum { id, name, score, delta, diff }`. Map:
  - `score` → the index's current campaign score,
  - `delta` → change vs the selected prior campaign (`null` if none),
  - `diff` → the vs-organization difference the report already computes
    (see the `vs Org` / benchmark math in `ee-department-report.tsx`).
- Pass `scoreColor={dwsScoreColor}` (or the report's active scale) so the strip
  tracks the rest of the page.
- Mount it near the top of the Basin Report's center column, above the
  "Index and Statement Results" table. Keep it inside the chromeless layout —
  don't add its own rails, header, or page chrome.

**Do not:** add a details table, change the index set, restyle with a different
palette, or wire it to any global selection state — the tiles are
self-contained toggles.

Then show me the diff and where you mounted it.
