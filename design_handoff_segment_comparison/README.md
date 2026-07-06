# Handoff: Segment Comparison visual — new "Segment Breakdown" perspective

## Overview
A unified, **replicable** section for comparing a segment breakdown inside a
unit (basin / department). One instance = one segment dimension. It combines two
visuals that always move together:

1. **Index rail + funnel** (top) — the exact Basin Report attached tab rail on
   the left; a centered, ranked **funnel** of the segment values on the right,
   in place of the old horizontal bar chart.
2. **Statement heatmap** (below) — one row per statement in the selected index,
   one column per segment value, with an **Overall** column pinned far-right
   behind a thick divider.

Selecting an index on the rail re-scores both. A hard rule closes the section so
multiple sections stack down the page.

**This deliverable:** stand up a new perspective, **Segment Breakdown**, and
build only the **Job Category** section as the first example.

## Fidelity
High-fidelity. Recreate exactly, but wire to the codebase's real primitives:
- Rail: reuse the attached tab strip from `ee-department-report.tsx` (field
  layout) — do not recreate.
- Color: the shared score scale (`scoreColor` / `ee-report-kit.tsx`).
- Type/spacing: the portal classes/tokens (`.card`, `.slabel`, `--border-strong`,
  `--text-primary`, `--text-muted`). The prototype inlines mirror these.

## Layout
- **Section label** (`.slabel`): "{segmentLabel} Comparison"; top-right shows
  "{unit} · n = {respondents}" once.
- **Rail** (156px, attached tabs) + **funnel card** (`.card`) in a
  `display:flex; align-items:stretch` row so the rail height tracks the card.
- Funnel: bands centered (`margin:0 auto`), width scales with score (46–98%),
  ranked high→low, fill = score color. Name left (11.5/800) + `n` (9/700/.6);
  score right (14.5/800).
- Heatmap: header row (10/700 uppercase); statement column ~340px; one column
  per segment; Overall column last with `border-left:2.5px solid #8798AA`. Cells
  = colored chip (13/800) via the score scale. Accent top border = active index
  color.
- **Trailing rule**: `2px solid #152238` under the section.

## Parity rule
The funnel bars and heatmap columns are the **same segment set** (here five Job
Category values: Greenhat, Leadhand, Roughneck, Operator, Supervisor). They must
never diverge in membership or count.

## Interaction / state
- Local `activeIndexId` (defaults to first index). Rail click re-renders funnel +
  heatmap. No global state.

## Data model
```
segments:          { key, label, n }[]                       // funnel bars = heatmap columns
indexes:           { id, name, score }[]                     // rail
funnelByIndex:     { [indexId]: { [segKey]: number } }       // funnel scores
statementsByIndex: { [indexId]: { text, scores:{[segKey]:number}, overall:number }[] }
```
Reuse the report's existing segment × index × statement math.

## Files
- `PROMPT.md` — paste-into-Cursor prompt.
- `SegmentComparison.tsx` — the component (swap `dwsScoreColor` → shared scale;
  reconcile inline styles to `.card` / `.slabel`).
- `SegmentComparison.demo.tsx` — Job Category example with demo data.

## Scope
Build the **Segment Breakdown** perspective shell + the **Job Category** section
only. Tenure / Role / other sections come later, each an independent
`<SegmentComparison>` instance stacked below.
