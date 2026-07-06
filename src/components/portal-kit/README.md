# Portal Kit

Named, reusable visual building blocks for the Caliber client portal. Refer to
these by name in conversation and they drop in with consistent formatting.

**Live gallery:** [`/portal-kit`](/portal-kit) — bookmark it. Sample data only.

## Artifacts

| Name | What it is |
| --- | --- |
| `IndexTabRail` | Single-select vertical tab column that connects into the card on its right (active tab feeds into the card). |
| `ScoreBarChart` | Horizontal score bars with value chip, benchmark/org marker, and optional delta pill; uniform row rhythm. |
| `StatementHeatmap` | Statement × entity heat map with right Avg column and bottom subtotal row, standard Caliber table frame. |
| `makeScoreColor(min, max)` | The canonical yellow → white → blue score gradient. Keep identical everywhere. |

## DWS Field redesign pilot — catalogued, not yet promoted

The DWS Field Employee Experience redesign pilot (`src/app/employee-experience/dws/`,
gated behind `?layout=redesign`) introduced a set of chrome and content patterns
that aren't shared `portal-kit` components yet — they're catalogued on
[`/portal-kit`](/portal-kit) as a named reference so the vocabulary exists before
the pattern replicates to other sections (Department, Role, Supervisor) or rolls
into the production dashboard. Each row below names the pattern, says what it is,
and points at the pilot file that currently implements it.

**Chrome & Navigation**

| Name | What it is | Source |
| --- | --- | --- |
| `FieldTopNavBar` | Dark-tone top nav (`AppTopBanner` `tone="dark"`) with a two-part divider (white gap + dark bar) instead of one hairline. | `components/shared/app-top-banner.tsx` |
| `ReportNavigatorRail` | Left-rail Views → Reports accordion; collapsible via an explicit chevron/icon click (no hover auto-expand); `dividerBefore` groups sibling reports within a View. | `field-redesign-shell.tsx` |
| `ContextFiltersRail` | Right-rail Context / Filters tab switcher; Context holds export + legend + How to Read, Filters holds the report's own scoping controls. | `field-redesign-shell.tsx` |
| `ReportTitleHeader` | Single title bar: title, optional header-extra slot (KPIs or a view switcher), optional title suffix, optional thicker divider. | `field-redesign-shell.tsx` |

**Main Content**

| Name | What it is | Source |
| --- | --- | --- |
| `TabbedBarChart` — with comparison line | Attached index rail + bar chart where each row also draws a benchmark/org marker (line + dot). | `ee-report-kit.tsx` (`IndexRailTabs` + `BrandComparisonChart`) |
| `TabbedBarChart` — without comparison line | Same chart, no per-row benchmark marker — used when every row shares one reference point. | `ee-report-kit.tsx` (`BrandComparisonChart`, `showOrgLine=false`) |
| `PointDifferenceChart` | Standalone diverging bar chart (no rail); bars grow left/right from a zero baseline instead of a shared axis min. | `ee-location-comparison.tsx` (`DeptDeltaChart`) |
| `StatementResultsTable` | Statement × campaign-time list, grouped under collapsible index headers, with Delta and vs Org columns. **Not** the same pattern as `StatementHeatmap`. | `ee-department-report.tsx` |
| `StatementHeatmap` — chip-cell variant | Same statement × entity heat-map concept as the canonical `StatementHeatmap`, but cells stay white with a rounded score chip instead of a full-color fill. Flagged inconsistency — see page. | `ee-comparison-heatmap.tsx`, `ee-segment-breakdown.tsx` |
| `IndexScoreSummary` | Expandable score-tile strip (Overall + per-index tiles); click a tile to reveal Delta/Diff. | `index-score-summary.tsx` |
| `SegmentFunnel` | Ranked, centered, variable-width pill bars paired with an index rail. Distinct from `ScoreBarChart` (ranked, not axis-anchored). | `ee-segment-breakdown.tsx` |
| `FilterPillGroup` | A genuine filter: collapsible card + pill row that scopes the page (e.g. Basin picker). | `ee-report-kit.tsx` (`EmbeddedFilterCard` + `PillOptionRow`) |
| `ViewSwitcherPills` | Same pill styling as `FilterPillGroup`, but swaps the active report/view instead of filtering data (e.g. the Breakdown dimension switcher). **Not** a filter — keep the two separate in conversation. | `ee-segment-breakdown.tsx` |
| Score Legend / How to Read | Static right-rail context cards: score + delta gradient legend, plus a plain-language How to Read note. | `ee-context-rail.tsx` |
| `GuidancePinCard` | Admin-authored, expandable recommendation card in the right rail (pip + editorial label + guidance text). | `guidance-pin-rail.tsx` |
| `VerticalSectionLabel` | Section title rotated into a narrow left-edge rail instead of a horizontal line above the section. Basin Report only. | `ee-department-report.tsx` |

## Conventions

- Components are presentation-only and prop-driven; they never fetch or assume live data.
- Add a new artifact by creating `src/components/portal-kit/<name>.tsx`, exporting it from
  `index.ts`, adding a row to this table, and adding a preview section to `src/app/portal-kit/page.tsx`.
- This kit is adopted incrementally — existing dashboards migrate to it as they're touched, not in one pass.
