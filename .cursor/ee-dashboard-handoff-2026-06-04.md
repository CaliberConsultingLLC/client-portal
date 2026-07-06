# EE Dashboard — Session Handoff (2026-06-04)

## Production
- Portal: https://portal.caliberconsultingllc.org
- CSG EE dashboard route: `/portal/dashboards/employee-experience--csg` (or assigned asset slug)

## What shipped this session

### Manual guidance pins (Campaign Results only — pilot)
- **Right rail** replaces auto-generated insights on `ee-campaign-results`
- **Super admin only** (`role === "super_admin"`) sees **Edit pins** / **Save**
- Pins stored in Firestore collection `dashboardGuidanceScopes`, scoped by:
  - `dashboardInstanceId`
  - `perspectiveId` (`ee-campaign-results`)
  - `campaignLabel` (from report `current.label`)
  - `filterKey` (index id, e.g. `culture`)
- Pin fields: `title`, `body`, `accent` (`blue` | `red` | `green`), `order`
- Expandable view: colored circle + title; click to reveal body text

**Key files**
- `src/components/dashboard/guidance-pin-rail.tsx` — UI + edit mode
- `src/lib/firebase/guidance-pin-store.ts` — Firestore read/write
- `src/app/api/portal/dashboard-instances/[instanceId]/guidance/route.ts` — GET (all authed) / PUT (super_admin)
- `src/types/guidance-pins.ts`
- `src/app/employee-experience/dws/ee-campaign-results.tsx` — integrated rail
- `src/lib/portal/dashboard-registry.tsx` — passes `dashboardInstanceId`, `canEditGuidance`
- `src/app/portal/dashboards/[assetId]/page.tsx` — sets `canEditGuidance: user.role === "super_admin"`

### Campaign Results color scale
- Reverted from gold→blue to standard **red→blue** via `scoreScaleColor` from `src/components/collaboration/score-color-scale.ts`

## What was reverted (do not re-apply without explicit approval)
- Batch 2 unified left rail / embedded report mode broke several reports — **fully reverted** and redeployed
- Reports render full-page with their own fixed left/right rails (not dashboard `DashboardCanvas` left rail)
- Keep changes **surgical**; avoid unifying all perspectives into one rail again

## Current EE perspective order (Executive)
1. Campaign Overview
2. Location Breakdown
3. Campaign Results
4. Department Comparison
5. Detailed History

HR: Department Rankings → Index Deep Dive → Open Text  
Department: Department Report → Supervisor Reports

## Batch 1 fixes still in place (pre-revert baseline)
- Unified `#8798AA` container styling on older perspectives
- Heatmap/table styling aligned with Department Report
- Delta bar clipping on Department Comparison
- Editorial right-rail insights on dept comparison (auto — not guidance pins)
- Campaign chronological order in vertical selects (most recent first)
- Department Report table column grouping (historical vs delta)

## Open / next session (user intent, not started)
- Extend guidance pins to other perspectives (dept comparison, dept report, etc.)
- Other pages need `filterKey` for primary filter (e.g. department id for dept report)
- User wanted executive perspective reorder + campaign on every perspective — **deferred** after revert; discuss before implementing
- Optional: campaign-level pins shared across indexes vs per-index (current behavior)

## Architecture notes
- `DwsEmployeeExperienceDashboardClient` props: `data`, `logoUrl?`, `dashboardInstanceId?`, `canEditGuidance?`
- Full-bleed report perspectives bypass `DashboardCanvas`: campaign results, dept comparison, dept report, historical, supervisor
- `buildEmployeeExperienceReportBundle` in `ee-live-projections.ts` feeds report components
- Windows shell: use `;` not `&&` for command chaining
