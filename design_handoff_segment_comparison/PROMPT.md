# Cursor prompt — Segment Comparison visual (new "Segment Breakdown" perspective)

Paste this into Cursor with `SegmentComparison.tsx` and `SegmentComparison.demo.tsx` open.

---

Add a new perspective to the DWS Field Employee Experience dashboard called
**Segment Breakdown**, and build its first (and for now, only) section: a
**Segment Comparison** visual scoped to **Job Category**.

`SegmentComparison.tsx` in this folder is the design reference — a working
prototype of the exact visual and behavior I want. It is one unified,
**replicable** block: an index rail + a role/segment **funnel** on top, and a
**statement heatmap** directly below, both driven by the same rail selection.
Bring in this component only; don't pull anything else from the prototype.

**What it is**
- A leader opens Segment Breakdown for their unit (e.g. East Texas) and compares
  how a segment dimension (here, **Job Category**) scores.
- Left: the **index rail** — this must be the EXACT attached tab strip already
  used in the Basin Report (`ee-department-report.tsx`, field layout): stacked
  tabs, active tab white and merged into the panel, inactive `#EEF2F6`. Reuse
  that markup, don't recreate it.
- Right of the rail: the horizontal bar chart is replaced by a **centered,
  ranked funnel** of the Job Category values (Greenhat, Leadhand, Roughneck,
  Operator, Supervisor) — segment name left, score right.
- Below, in the same section: a **statement heatmap** — one row per statement in
  the selected index, one column per Job Category value, plus an **Overall**
  column pinned to the far right behind a **thick divider**.
- Selecting an index on the rail re-scores BOTH the funnel and the heatmap.
- The funnel bars and heatmap columns must stay in **parity** — same segment
  set, same count, every time.
- A hard rule closes the section so future sections (Tenure, Role, …) can stack
  below it. Build only the **Job Category** section now.

**Design-system parity — match the current portal, don't invent styles**
- Swap the bundled `dwsScoreColor` for the real shared scale (`scoreColor` /
  `makeGradientColor` + `isLightBand`) in
  `src/app/employee-experience/dws/ee-report-kit.tsx`, so funnel and heatmap
  cells match the rest of the report.
- Use the portal's existing classes/tokens rather than the inlined values where
  they exist: `.card`, `.card-body`, `.slabel`, and the CSS vars
  (`--border-strong`, `--text-primary`, `--text-muted`). The inline sizes in the
  file mirror those — reconcile them to the real classes.
- Match **text size, weight, and color** to the portal: section label = `.slabel`
  (11px/700/.2em uppercase, `--text-muted`); funnel labels 11.5px/800, funnel
  score 14.5px/800; heatmap header 10px/700 uppercase; heatmap cells 13px/800;
  statement text 12.5px. Montserrat throughout.

**Data wiring**
- Props: `segmentLabel`, `unitLabel`, `respondents`, `indexes`, `segments`,
  `funnelByIndex`, `statementsByIndex`, `scoreColor`.
- Feed real data: `funnelByIndex[indexId][segKey]` = that segment's score on that
  index; `statementsByIndex[indexId]` = the statement rows with per-segment
  scores + `overall`. Reuse the report's existing segment/statement math.
- `respondents` and each segment's `n` shown once (top-right + per funnel bar) —
  no per-column `n` in the heatmap header.

**Do not**: add a per-column n row, keep the old "Culture by Role" card header,
change the segment set between funnel and heatmap, restyle with a new palette, or
build the Tenure/Role sections yet.

Then show me the diff, where you registered the **Segment Breakdown** perspective,
and where the Job Category section mounts.
