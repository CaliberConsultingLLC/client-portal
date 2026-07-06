# Handoff: Index Score Summary cards (Basin Report)

## Overview
A high-level "here's your score for each index" strip for the **top of the DWS
Field Employee Experience → Benchmark → Basin Report**. It replaces the clunky
Power BI index band with a clean row of colored score tiles: **Overall** on the
left (larger), the indexes on the right, each tile clicking open to reveal its
change-vs-prior and vs-org numbers.

This is prototype **7a** from the design conversation — the only piece to bring
over. Nothing else from the prototype should come with it.

## About the design files
The files here are a **design reference**. `IndexScoreSummary.tsx` is written as
a real React/TypeScript component and is close to drop-in, but the task is to
**recreate it inside the existing `northstar-platform` app using that codebase's
established patterns** (the `ee-report-kit` helpers, `design-tokens.ts`, the
chromeless field-redesign layout) — not to ship it in isolation. Reuse the
shared score gradient and delta colors rather than the local copies bundled here
for portability.

## Fidelity
**High-fidelity.** Final colors, type, spacing, radii, and interaction are all
specified in the component. Recreate pixel-for-pixel using the codebase's
existing libraries; only swap the bundled color helpers for the real shared ones.

## The one screen / view
**Name:** Index Score Summary strip
**Purpose:** Give a leader an at-a-glance read of the overall index and each
index's score, then let them expand any tile for the change and org difference.

**Layout**
- A single horizontal flex row, `align-items: flex-start`, `gap: 16px`.
- `Overall` tile: left-justified, width **152px** (~20% larger than an index).
- A flexible spacer (`flex: 1`) creates the gap.
- The indexes: a right-hand flex group (`gap: 10px`) so the last index is flush
  to the right edge. The gap between the two groups grows/shrinks with the index
  count (5 in the live dashboard; supports up to ~7).

**Tile component**
- Card: `border-radius: 14px`, `1.5px` solid border, `overflow: hidden`,
  background = the score's gradient color.
- Border color: `#DDE2DD` when collapsed; when expanded, the tile's **own darker
  color** (`darken(fill, 0.64)`) — never the nav gold.
- Shadow: `0 1px 3px rgba(15,23,42,.08)` collapsed; `0 8px 18px rgba(15,23,42,.14)` expanded.
- Score block: index name (uppercase, 10px index / 11px overall, weight 800,
  `letter-spacing .05em`, `opacity .82`, color = `textOn(fill)`) above the score
  (28px index / 34px overall, weight 800, color = `textOn(fill)`).
- Expandable footer (white, `max-height` 0 → 52px index / 60px overall,
  `transition: max-height .34s cubic-bezier(.4,0,.2,1)`): two equal cells split
  by a `1px #EEF1EE` divider —
  - **delta**: change vs prior, `+ / −` signed, 16px/19px weight 800, colored by
    `deltaInk`; tiny 8px uppercase `#9AA6B2` label "delta". Renders `—` if null.
  - **diff**: vs org, up/down arrow + value, colored by `deltaInk`; label "diff".

**Colors / tokens**
- Score fill: shared gradient `makeGradientColor(60, 85)` — yellow `#D7B35A` →
  white → blue `#3F5F86` (this is `dwsScoreColor` in `ee-report-kit.tsx`).
- `textOn`: `#1C252A` on light fills, `#FFFFFF` on dark (`isLightBand` threshold).
- Delta ink: up `#1C5932`, down `#B63A2D`, neutral `#6E7E96` (DWS palette).
- Neutral border `#DDE2DD`; footer divider `#EEF1EE`; label `#9AA6B2`.
- Type: Montserrat (inherited), weights 700/800.

## Interactions & behavior
- Every tile is a `<button aria-expanded>`. Click toggles that tile's footer
  open/closed. **Tiles are independent** — any number can be open at once.
- Only `max-height`, `border-color`, and `box-shadow` transition; keep the
  `.34s` easing on the footer.
- No hover color change is required; the border/shadow shift on expand is the
  affordance.

## State management
- Local `open: Record<string, boolean>`, seeded from `defaultExpanded` (defaults
  to just the Overall tile). No global/report selection state — deliberately
  self-contained.

## Data
`IndexDatum { id, name, score (0–100), delta (number | null), diff (number) }`
- `score` → current-campaign index score.
- `delta` → change vs the selected prior campaign; `null` when no prior exists.
- `diff` → vs-organization difference (reuse the report's existing `vs Org` math
  in `ee-department-report.tsx`).
Pass `scoreColor={dwsScoreColor}` (or the report's active scale).

## Where it mounts
Near the top of the Basin Report's center column, above the "Index and Statement
Results" table, inside the chromeless field-redesign layout. It must NOT render
its own rails, page header, or details table.

## Assets
None. No icons or images.

## Files
- `PROMPT.md` — paste-into-Cursor prompt.
- `IndexScoreSummary.tsx` — the component (swap bundled color helpers for the
  real `ee-report-kit` imports).
- `IndexScoreSummary.demo.tsx` — example usage with the demo Permian numbers.
