"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Minus } from "lucide-react";
import { usePersistedDashboardFilter } from "@/hooks/use-persisted-dashboard-filter";
import { buildDashboardFilterStoreKey } from "@/lib/portal/dashboard-filter-cookie";
import { EECampaignResults } from "./ee-campaign-results";
import { EEDepartmentComparison } from "./ee-department-comparison";
import { EELocationComparison } from "./ee-location-comparison";
import { EEDepartmentReport } from "./ee-department-report";
import { EESegmentBreakdown } from "./ee-segment-breakdown";
import { EEHistoricalReport } from "./ee-historical-report";
import { EESupervisorReport } from "./ee-supervisor-report";
import { EESupervisorComparison } from "./ee-supervisor-comparison";
import { EEEnpsReport } from "./ee-enps-report";
import { EEExecutiveRail, EE_GUIDANCE_RAIL_STYLE, EE_PERSPECTIVE_CANVAS_STYLE, EE_PERSPECTIVE_MAIN_STYLE } from "./ee-executive-rail";
import { FieldRedesignShell } from "./field-redesign-shell";

// DWS Field redesign pilot: id of the portal target rendered inside the shell's
// right-rail "Filters" tab (report-style perspectives portal their selectors here).
const FR_FILTERS_SLOT = "fr-filters-slot";
// DWS Field redesign pilot: id of the portal target rendered inline in the
// shell's single top header, so every report's KPI strip lands next to the
// title instead of drawing a second, boxed hero underneath it.
const FR_HEADER_EXTRA_SLOT = "fr-header-extra-slot";
// DWS Field redesign pilot: id of the portal target appended right after the
// title, e.g. "Basin Report — East Texas" for reports with a unit picker.
const FR_TITLE_SUFFIX_SLOT = "fr-title-suffix-slot";
import { buildEmployeeExperienceReportBundle, CSG_BREAKDOWN_DIMENSIONS, OFFICE_BREAKDOWN_DIMENSIONS, projectBreakdownSet, projectEnpsReportData, projectSupervisorReportData } from "./ee-live-projections";
import { ClientMark, defaultComparisonId, EmbeddedFilterCard, HeaderKpiPortal, PillOptionRow } from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";
import { GuidancePinRail } from "@/components/dashboard/guidance-pin-rail";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { scoreScaleTextColor } from "@/components/collaboration/score-color-scale";
import { dwsScoreColor, dwsRawScoreColor, makeGradientColor } from "./ee-report-kit";
import { mergeHiddenDimensionIds } from "@/lib/employee-experience/excluded-dimensions";
import {
  CSG_EMPLOYEE_EXPERIENCE_GROUPS,
  DWS_EMPLOYEE_EXPERIENCE_GROUPS,
  DWS_FIELD_EMPLOYEE_EXPERIENCE_GROUPS,
} from "@/lib/employee-experience/perspective-access";
import { isKnownBrandSegment } from "@/lib/employee-experience/brand-segment";
import { DashboardCanvas, DashboardRibbon } from "@/components/dashboard/dashboard-shell";
import { VisualExportButton } from "@/components/dashboard/visual-export-button";
import { VisualExportProvider, useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { CompositeVisualExportButton } from "@/components/dashboard/composite-visual-export-button";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import {
  buildDashboardExportFilename,
  DASHBOARD_VISUAL_EXPORT_TARGET_ID,
} from "@/lib/dashboard/export-visual";
import { cn } from "@/lib/utils";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
import {
  resolveAllowedValuesForPerspective,
  type EmployeeExperienceUserAccess,
} from "@/lib/firebase/user-access";
import type {
  EmployeeExperienceDashboardData,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceRespondent,
} from "@/types/employee-experience";

// ─── Constants ────────────────────────────────────────────────────────────────

const EE = { min: 6, mid: 7.25, max: 8.5, minLabel: "60", maxLabel: "85" } as const;

// DWS Field uses a tighter color scale: bottom 50, white midpoint 62.5, top (blue) 75.
// Display scale (0–100) drives report/comparison axes, legends, and fill colors;
// the raw scale (0–10) drives the Heat Maps perspective.
const FIELD_REPORT_SCALE = { min: 50, mid: 62.5, max: 75 } as const;
const FIELD_RAW_SCALE = { min: 5, mid: 6.25, max: 7.5, minLabel: "50", maxLabel: "75" } as const;

const EE_PANEL =
  "overflow-hidden rounded-2xl border border-[#8798AA] bg-white shadow-[7px_9px_20px_rgba(15,23,42,0.09),2px_3px_6px_rgba(15,23,42,0.05)]";
const BRAND_FIELD_ALIASES = ["company", "brand", "location", "site"] as const;

function EEPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(EE_PANEL, className)}>{children}</div>;
}

function EEPanelHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-6 pb-3 pt-6", className)}>
      <h3 className="text-lg font-bold leading-none tracking-tight text-text-primary">{title}</h3>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

function EEPanelContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}

const DIM_ORDER = ["Culture", "Daily Work", "Intent", "Supervisor", "Engage", "Balance"];

function orderedDimensionNames(questions: EmployeeExperienceQuestionDefinition[]) {
  const present = Array.from(new Set(questions.map((question) => question.dimension)));
  const preferred = DIM_ORDER.filter((dimension) => present.includes(dimension));
  const remaining = present
    .filter((dimension) => !DIM_ORDER.includes(dimension))
    .sort((left, right) => left.localeCompare(right));

  return [...preferred, ...remaining];
}

type GroupId =
  | "executive"
  | "individual-reports"
  | "department"
  | "division"
  | "basin"
  | "dept-group"
  | "role-group"
  | "supervisor-group"
  | "autosep-group";
type PerspectiveId =
  | "exec-overview"
  | "exec-location"
  | "ee-campaign-results"
  | "ee-department-comparison"
  | "ee-role-comparison"
  | "ee-location-comparison"
  | "ee-division-comparison"
  | "ee-supervisor-comparison"
  | "hr-index-dive"
  | "hr-supervisor"
  | "hr-open-text"
  | "dept-scorecard"
  | "ee-brand-report"
  | "ee-brand-open-text"
  | "ee-segment-breakdown"
  | "ee-division-breakdown"
  | "ee-department-breakdown"
  | "ee-role-breakdown"
  | "ee-supervisor-breakdown"
  | "ee-autosep-breakdown"
  | "ee-department-report"
  | "ee-division-report"
  | "ee-unit-department-report"
  | "ee-historical-report"
  | "ee-autosep-report"
  | "ee-enps";

type PerspectiveDef = {
  id: PerspectiveId;
  label: string;
  /** Left-rail navigator only: draw a thin divider above this report,
   * grouping it apart from the ones above it (e.g. Comparison reports
   * split off from the Report/Breakdown pair within the same view). */
  dividerBefore?: boolean;
};
type GroupDef = { id: GroupId; label: string; perspectives: PerspectiveDef[] };
type EmployeeExperienceClientScope = {
  key: "csg" | "dws" | "dws-field";
  brandLabel: string;
  jobCategoryLabel: string;
  // Short label for the org-wide benchmark shown on comparison visuals (e.g. "vs DWS").
  benchmarkLabel: string;
  brandGroupId: GroupId;
  showDivisionHeatmap: boolean;
  showLeadershipHeatmap: boolean;
  showJobCategoryHeatmap: boolean;
  showTenureHeatmap: boolean;
  enableVisualLocks: boolean;
  groups: GroupDef[];
  executivePerspectives: Set<PerspectiveId>;
  executiveWithoutIndexFilter: Set<PerspectiveId>;
  executiveWithoutBrandFilter: Set<PerspectiveId>;
  executiveTitles: Record<PerspectiveId, string>;
  // Optional per-client open-text question labels. When omitted, the shared
  // OPEN_TEXT_FIELDS defaults are used.
  openTextFields?: ReadonlyArray<{ id: OpenTextField; label: string }>;
};

const CSG_SCOPE: EmployeeExperienceClientScope = {
  key: "csg",
  brandLabel: "Brand",
  jobCategoryLabel: "Job Category",
  benchmarkLabel: "CSG",
  brandGroupId: "department",
  showDivisionHeatmap: false,
  showLeadershipHeatmap: false,
  showJobCategoryHeatmap: true,
  showTenureHeatmap: true,
  enableVisualLocks: false,
  groups: CSG_EMPLOYEE_EXPERIENCE_GROUPS as GroupDef[],
  executivePerspectives: new Set<PerspectiveId>([
    "exec-overview",
    "exec-location",
    "ee-campaign-results",
    "ee-department-comparison",
    "ee-location-comparison",
    "ee-supervisor-comparison",
    "ee-historical-report",
    "ee-enps",
  ]),
  executiveWithoutIndexFilter: new Set<PerspectiveId>([
    "exec-overview",
    "ee-campaign-results",
    "exec-location",
    "ee-supervisor-comparison",
    "ee-enps",
  ]),
  executiveWithoutBrandFilter: new Set<PerspectiveId>([
    "exec-overview",
    "exec-location",
    "ee-location-comparison",
    "ee-enps",
  ]),
  executiveTitles: {
    "exec-overview": "Campaign Overview",
    "exec-location": "Heat Maps",
    "ee-campaign-results": "Detailed Results",
    "ee-department-comparison": "Job / Department Comparison",
    "ee-role-comparison": "Role Comparison",
    "ee-location-comparison": "Brand Comparison",
    "ee-division-comparison": "Division Comparison",
    "ee-division-report": "Division Report",
    "ee-enps": "ENPS",
    "ee-supervisor-comparison": "Supervisor Comparison",
    "ee-historical-report": "Detailed History",
    "hr-index-dive": "Index Deep Dive",
    "hr-supervisor": "Supervisor Report",
    "hr-open-text": "Open Text",
    "dept-scorecard": "Department Scorecard",
    "ee-brand-report": "Brand Report",
    "ee-brand-open-text": "Open Text",
    "ee-segment-breakdown": "Brand Breakdown",
    "ee-division-breakdown": "Division Breakdown",
    "ee-department-breakdown": "Department Breakdown",
    "ee-role-breakdown": "Job Category Breakdown",
    "ee-supervisor-breakdown": "Supervisor Breakdown",
    "ee-autosep-breakdown": "AutoSEP Breakdown",
    "ee-department-report": "Job Category Report",
    "ee-unit-department-report": "Department Report",
    "ee-autosep-report": "AutoSEP Report",
  },
};

const DWS_SCOPE: EmployeeExperienceClientScope = {
  key: "dws",
  brandLabel: "Basin",
  jobCategoryLabel: "Role",
  benchmarkLabel: "DWS",
  brandGroupId: "division",
  showDivisionHeatmap: true,
  showLeadershipHeatmap: true,
  showJobCategoryHeatmap: false,
  showTenureHeatmap: false,
  enableVisualLocks: true,
  groups: DWS_EMPLOYEE_EXPERIENCE_GROUPS as GroupDef[],
  executivePerspectives: new Set<PerspectiveId>([
    "exec-overview",
    "exec-location",
    "ee-campaign-results",
    "ee-department-comparison",
    "ee-role-comparison",
    "ee-location-comparison",
    "ee-division-comparison",
    "ee-supervisor-comparison",
    "ee-historical-report",
  ]),
  executiveWithoutIndexFilter: new Set<PerspectiveId>([
    "exec-overview",
    "ee-campaign-results",
    "exec-location",
    "ee-supervisor-comparison",
    // Comparison pages move the index selector inline beside the bar chart
    // (index-rail shell), so the shared executive rail hides its Index section.
    "ee-location-comparison",
    "ee-department-comparison",
    "ee-role-comparison",
    "ee-division-comparison",
  ]),
  executiveWithoutBrandFilter: new Set<PerspectiveId>([
    "exec-overview",
    "exec-location",
    "ee-location-comparison",
    "ee-division-comparison",
    "ee-supervisor-comparison",
  ]),
  executiveTitles: {
    "exec-overview": "Campaign Overview",
    "exec-location": "Heat Maps",
    "ee-campaign-results": "Detailed Results",
    "ee-department-comparison": "Department Comparison",
    "ee-role-comparison": "Role Comparison",
    "ee-location-comparison": "Basin Comparison",
    "ee-division-comparison": "Division Comparison",
    "ee-division-report": "Division Report",
    "ee-enps": "ENPS",
    "ee-supervisor-comparison": "Supervisor Comparison",
    "ee-historical-report": "Detailed History",
    "hr-index-dive": "Index Deep Dive",
    "hr-supervisor": "Supervisor Report",
    "hr-open-text": "Open Text",
    "dept-scorecard": "Department Scorecard",
    "ee-brand-report": "Basin Report",
    "ee-brand-open-text": "Open Text",
    "ee-segment-breakdown": "Basin Breakdown",
    "ee-division-breakdown": "Division Breakdown",
    "ee-department-breakdown": "Department Breakdown",
    "ee-role-breakdown": "Role Breakdown",
    "ee-supervisor-breakdown": "Supervisor Breakdown",
    "ee-autosep-breakdown": "AutoSEP Breakdown",
    "ee-department-report": "Role Report",
    "ee-unit-department-report": "Department Report",
    "ee-autosep-report": "AutoSEP Report",
  },
};

const DWS_FIELD_SCOPE: EmployeeExperienceClientScope = {
  key: "dws-field",
  brandLabel: "Basin",
  jobCategoryLabel: "Job Category",
  benchmarkLabel: "DWS",
  brandGroupId: "basin",
  showDivisionHeatmap: false,
  showLeadershipHeatmap: false,
  showJobCategoryHeatmap: true,
  showTenureHeatmap: false,
  enableVisualLocks: true,
  groups: DWS_FIELD_EMPLOYEE_EXPERIENCE_GROUPS as GroupDef[],
  executivePerspectives: new Set<PerspectiveId>([
    "exec-overview",
    "exec-location",
    "ee-campaign-results",
    "ee-department-comparison",
    "ee-role-comparison",
    "ee-location-comparison",
    "ee-supervisor-comparison",
    "ee-historical-report",
  ]),
  executiveWithoutIndexFilter: new Set<PerspectiveId>([
    "exec-overview",
    "ee-campaign-results",
    "exec-location",
    "ee-supervisor-comparison",
    // Field comparison pages move the index selector inline beside the bar chart.
    "ee-location-comparison",
    "ee-department-comparison",
    "ee-role-comparison",
  ]),
  executiveWithoutBrandFilter: new Set<PerspectiveId>([
    "exec-overview",
    "exec-location",
    "ee-location-comparison",
    "ee-supervisor-comparison",
  ]),
  executiveTitles: {
    "exec-overview": "Campaign Overview",
    "exec-location": "Heat Maps",
    "ee-campaign-results": "Detailed Results",
    "ee-department-comparison": "Department Comparison",
    "ee-role-comparison": "Job Category Comparison",
    "ee-location-comparison": "Basin Comparison",
    "ee-division-comparison": "Division Comparison",
    "ee-division-report": "Division Report",
    "ee-enps": "ENPS",
    "ee-supervisor-comparison": "Supervisor Comparison",
    "ee-historical-report": "Detailed History",
    "hr-index-dive": "Index Deep Dive",
    "hr-supervisor": "Supervisor Report",
    "hr-open-text": "Open Text",
    "dept-scorecard": "Department Scorecard",
    "ee-brand-report": "Basin Report",
    "ee-brand-open-text": "Open Text",
    "ee-segment-breakdown": "Basin Breakdown",
    "ee-division-breakdown": "Division Breakdown",
    "ee-department-breakdown": "Department Breakdown",
    "ee-role-breakdown": "Job Category Breakdown",
    "ee-supervisor-breakdown": "Supervisor Breakdown",
    "ee-autosep-breakdown": "AutoSEP Breakdown",
    "ee-department-report": "Job Category Report",
    "ee-unit-department-report": "Department Report",
    "ee-autosep-report": "AutoSEP Report",
  },
  // Field survey has two open-text questions, mapped in CSV order to the
  // strengths/improvement comment buckets by the data loader.
  openTextFields: [
    { id: "strengths", label: "Culture Champions" },
    { id: "improvement", label: "Feedback for Leadership" },
  ],
};

function resolveEmployeeExperienceClientScope(organizationName: string) {
  const normalized = organizationName.trim().toLowerCase();
  if (normalized.includes("canopy") || normalized.includes("csg")) return CSG_SCOPE;
  // Check "field" before "deep" since "Deep Well Services — Field" matches both
  if (normalized.includes("field")) return DWS_FIELD_SCOPE;
  if (normalized.includes("deep") || normalized.includes("dws")) return DWS_SCOPE;
  // Guardrail: unknown clients are blocked in development to avoid accidental cross-client edits.
  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      `Unrecognized EE client scope for organization "${organizationName}". Add an explicit scoped profile before editing shared dashboard behavior.`
    );
  }
  return DWS_SCOPE;
}

const OPEN_TEXT_FIELDS = [
  { id: "strengths" as const, label: "Greatest Strengths", dimensionId: undefined },
  { id: "improvement" as const, label: "Desired Changes", dimensionId: undefined },
  { id: "supervisor" as const, label: "Supervisor Feedback", dimensionId: undefined },
];
type OpenTextField = "strengths" | "improvement" | "supervisor";
const COMPARISON_ALL = "__ALL__";
const PREFERRED_CURRENT_CAMPAIGN = "May 2026";
const PREFERRED_PRIOR_CAMPAIGN = "Aug 2025";

function resolvePreferredCampaign(campaigns: string[], preferred: string) {
  return campaigns.find((campaign) => campaign.toLowerCase() === preferred.toLowerCase()) ?? campaigns[campaigns.length - 1] ?? "";
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function r1(v: number) { return Math.round(v * 10) / 10; }

function normalizeDimensionId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function avg(vals: number[]) {
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function groupScore(respondents: EmployeeExperienceRespondent[], itemIds: number[]): number {
  const scores = respondents
    .map((r) => {
      const vs = itemIds.map((id) => r.scores[id]).filter((v): v is number => v !== null);
      return vs.length > 0 ? avg(vs) : null;
    })
    .filter((v): v is number => v !== null);
  return scores.length > 0 ? r1(avg(scores)) : 0;
}

function itemScore(respondents: EmployeeExperienceRespondent[], itemId: number): number {
  const vals = respondents.map((r) => r.scores[itemId]).filter((v): v is number => v !== null);
  return vals.length > 0 ? r1(avg(vals)) : 0;
}

function filterR(
  respondents: EmployeeExperienceRespondent[],
  filters: Record<string, string>
): EmployeeExperienceRespondent[] {
  return respondents.filter((r) =>
    Object.entries(filters).every(([k, v]) => {
      if (!v) return true;
      return (r as unknown as Record<string, unknown>)[k] === v;
    })
  );
}

function uniq(respondents: EmployeeExperienceRespondent[], field: keyof EmployeeExperienceRespondent, min: number): string[] {
  const counts = new Map<string, number>();
  respondents.forEach((r) => {
    const v = r[field] as string;
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v);
}

type DimMetric = {
  id: string; label: string; score: number;
  prevScore: number | null; delta: number | null; itemIds: number[];
};

function buildDims(
  questions: EmployeeExperienceQuestionDefinition[],
  current: EmployeeExperienceRespondent[],
  prior: EmployeeExperienceRespondent[]
): DimMetric[] {
  const byDim = new Map<string, number[]>();
  questions.forEach((q) => {
    const ids = byDim.get(q.dimension) ?? [];
    ids.push(q.itemId);
    byDim.set(q.dimension, ids);
  });
  return orderedDimensionNames(questions).filter((d) => byDim.has(d)).map((dim) => {
    const ids = byDim.get(dim)!;
    const score = groupScore(current, ids);
    const prevScore = prior.length > 0 ? groupScore(prior, ids) : null;
    return { id: dim.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: dim, score, prevScore, delta: prevScore !== null ? r1(score - prevScore) : null, itemIds: ids };
  });
}

function fmtDelta(delta: number | null): string {
  if (delta === null || Number.isNaN(delta)) return "—";
  if (Math.abs(delta) < 0.005) return "±0.0";
  const s = Math.abs(delta * 10).toFixed(1);
  return delta > 0 ? `+${s}` : `-${s}`;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function sColor(score: number) { return dwsRawScoreColor(score); }
function sTColor(score: number) { return scoreScaleTextColor(score, EE.mid, 0.8, EE.min, EE.max); }

function ScoreChip({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "sm" ? "inline-flex min-w-[48px] justify-center rounded px-1.5 py-0.5 text-xs font-bold" :
    size === "lg" ? "inline-flex min-w-[88px] justify-center rounded-2xl px-4 py-2 text-3xl font-extrabold" :
    "inline-flex min-w-[60px] justify-center rounded-lg px-2.5 py-1 text-sm font-bold";
  return <span className={cls} style={{ backgroundColor: sColor(score), color: sTColor(score) }}>{formatScoreForDisplay(score)}</span>;
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-text-muted"><Minus className="h-3 w-3" />—</span>;
  const pos = delta > 0.005;
  const neg = delta < -0.005;
  const cls = pos ? "bg-nsp-green-100 text-nsp-green-800" : neg ? "bg-nsp-red-100 text-nsp-red-800" : "bg-surface-3 text-text-muted";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>
      {pos ? <ArrowUp className="h-3 w-3" /> : neg ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {fmtDelta(delta)}
    </span>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{children}</p>;
}

function Empty({ message }: { message: string }) {
  return (
    <EEPanel>
      <div className="px-6 py-16 text-center text-sm text-text-muted">{message}</div>
    </EEPanel>
  );
}

// ─── Left Rail ────────────────────────────────────────────────────────────────

function LRail({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 xl:sticky xl:top-6 xl:self-start">{children}</div>;
}

function RailSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-border-strong bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{title}</span>
        <ChevronRight className={`h-4 w-4 text-text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border-subtle px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function CampaignRail({
  campaigns, current, prior, onCurrent, onPrior,
}: {
  campaigns: string[]; current: string; prior: string;
  onCurrent: (v: string) => void; onPrior: (v: string) => void;
}) {
  // Nothing to compare against with a single campaign — hide the selector entirely.
  if (campaigns.length <= 1) return null;
  return (
    <RailSection title="Campaign Selection" defaultOpen>
      <div className="mx-auto max-w-[220px] space-y-3 text-center">
        <div>
          <span className="text-xs font-medium text-text-secondary">Current</span>
          <select value={current} onChange={(e) => onCurrent(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none">
            {[...campaigns].reverse().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span className="text-xs font-medium text-text-secondary">Compare To</span>
          <select value={prior} onChange={(e) => onPrior(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none">
            <option value="">No comparison</option>
            {[...campaigns].reverse().filter((c) => c !== current).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </RailSection>
  );
}

function FilterRail({
  filters, onChange, onReset,
}: {
  filters: { id: string; label: string; value: string; options: string[] }[];
  onChange: (id: string, v: string) => void; onReset: () => void;
}) {
  const hasActive = filters.some((f) => f.value);
  return (
    <RailSection title="Filters">
      <div className="mx-auto max-w-[220px] space-y-3 text-center">
        {filters.map((f) => (
          <div key={f.id}>
            <span className="text-xs font-medium text-text-secondary">{f.label}</span>
            <select
              value={f.value} onChange={(e) => onChange(f.id, e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none"
            >
              <option value="">All</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {hasActive && (
          <button type="button" onClick={onReset} className="w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-xs font-semibold text-text-secondary transition hover:bg-surface-2">
            Reset filters
          </button>
        )}
      </div>
    </RailSection>
  );
}

// ─── Executive: Dimension Wheel ───────────────────────────────────────────────

function DimensionWheel({
  dims,
  orgScore,
  selectedDimension,
  onSelectDimension,
}: {
  dims: DimMetric[];
  orgScore: number;
  selectedDimension: string;
  onSelectDimension: (dimension: string) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const rotRef = useRef(0);

  const n = dims.length;
  if (n === 0) return <Empty message="No dimensions are available for this campaign." />;

  const sliceAngle = 360 / n;
  const activeIdx = Math.max(0, dims.findIndex((dim) => dim.label === selectedDimension));

  function handleNodeClick(i: number) {
    const target = -sliceAngle * i;
    const delta = ((target - rotRef.current) % 360 + 540) % 360 - 180;
    const newRot = rotRef.current + delta;
    rotRef.current = newRot;
    setRotation(newRot);
    onSelectDimension(dims[i].label);
  }

  const W = 480, H = 480;
  const cx = W / 2, cy = H / 2;
  const orbitR = 162;
  const nodeR = 40;
  const activeR = Math.round(nodeR * 1.3); // 52 — 30% larger
  const coreR = 70;
  const font = "Montserrat, ui-sans-serif, sans-serif";

  return (
    <div className="w-full">
      <div className="mb-2 px-1">
        <SLabel>Dimension Wheel</SLabel>
        <p className="mt-0.5 text-xs text-text-muted">
          Click any dimension to bring it to focus
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto w-full max-w-[480px] select-none"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Per-node 3D sphere gradients */}
          {dims.map((dim, i) => (
            <radialGradient
              key={`ng-${i}`}
              id={`dw-ng-${i}`}
              cx="36%"
              cy="27%"
              r="74%"
            >
              <stop offset="0%"   stopColor="white"             stopOpacity={0.56} />
              <stop offset="44%"  stopColor={sColor(dim.score)} stopOpacity={0.02} />
              <stop offset="100%" stopColor="black"             stopOpacity={0.40} />
            </radialGradient>
          ))}

          {/* Core sphere gradient */}
          <radialGradient id="dw-core-ng" cx="36%" cy="27%" r="74%">
            <stop offset="0%"   stopColor="white"              stopOpacity={0.52} />
            <stop offset="44%"  stopColor={sColor(orgScore)}   stopOpacity={0.02} />
            <stop offset="100%" stopColor="black"              stopOpacity={0.44} />
          </radialGradient>

          {/* Drop shadows */}
          <filter id="dw-node-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="1.5" dy="3.5" stdDeviation="5"
              floodColor="rgba(0,0,0,0.38)" />
          </filter>
          <filter id="dw-core-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="3" dy="5" stdDeviation="9"
              floodColor="rgba(0,0,0,0.44)" />
          </filter>
        </defs>

        {/* ── Rotating group: spokes + nodes ── */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.65s cubic-bezier(0.34, 1.26, 0.64, 1)",
          }}
        >
          {dims.map((dim, i) => {
            const deg = -90 + sliceAngle * i;
            const rad = (deg * Math.PI) / 180;
            const x = cx + orbitR * Math.cos(rad);
            const y = cy + orbitR * Math.sin(rad);
            const isActive = i === activeIdx;
            const r = isActive ? activeR : nodeR;
            const labelFs = isActive ? 8.5 : 7;
            const scoreFs = isActive ? 19 : 15;
            const bg = sColor(dim.score);
            const fg = sTColor(dim.score);

            return (
              <g
                key={dim.id}
                onClick={() => handleNodeClick(i)}
                style={{ cursor: "pointer" }}
              >
                {/* Spoke — drawn before node so it sits under */}
                <line
                  x1={cx} y1={cy} x2={x} y2={y}
                  stroke={isActive ? "#89AACA" : "#C0D0DC"}
                  strokeWidth={isActive ? 1.5 : 0.8}
                />

                {/* 3D sphere: shadowed base + gradient sheen overlay */}
                <circle cx={x} cy={y} r={r} fill={bg} filter="url(#dw-node-shadow)" />
                <circle
                  cx={x} cy={y} r={r}
                  fill={`url(#dw-ng-${i})`}
                  style={{ pointerEvents: "none" }}
                />

                {/* Counter-rotating label group — stays upright as wheel spins */}
                <g
                  style={{
                    transformOrigin: `${x}px ${y}px`,
                    transform: `rotate(${-rotation}deg)`,
                    transition: "transform 0.65s cubic-bezier(0.34, 1.26, 0.64, 1)",
                  }}
                >
                  <text
                    x={x}
                    y={y - (isActive ? 6 : 5)}
                    textAnchor="middle"
                    fontSize={labelFs}
                    fontWeight={700}
                    fill={fg}
                    letterSpacing={0.9}
                    fontFamily={font}
                  >
                    {dim.label.toUpperCase()}
                  </text>
                  <text
                    x={x}
                    y={y + (isActive ? 14 : 11)}
                    textAnchor="middle"
                    fontSize={scoreFs}
                    fontWeight={800}
                    fill={fg}
                    fontFamily={font}
                  >
                    {formatScoreForDisplay(dim.score, 1)}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* ── Fixed center core — 3D sphere ── */}
        <circle
          cx={cx} cy={cy} r={coreR}
          fill={sColor(orgScore)}
          filter="url(#dw-core-shadow)"
        />
        <circle
          cx={cx} cy={cy} r={coreR}
          fill="url(#dw-core-ng)"
          style={{ pointerEvents: "none" }}
        />
        <text
          x={cx} y={cy - 16}
          textAnchor="middle"
          fontSize={7.5}
          fontWeight={700}
          fill={sTColor(orgScore)}
          letterSpacing={2}
          fontFamily={font}
          opacity={0.8}
        >
          OVERALL INDEX
        </text>
        <text
          x={cx} y={cy + 14}
          textAnchor="middle"
          fontSize={26}
          fontWeight={800}
          fill={sTColor(orgScore)}
          fontFamily={font}
        >
          {formatScoreForDisplay(orgScore, 1)}
        </text>
      </svg>
    </div>
  );
}

// ─── Executive: Campaign Overview ─────────────────────────────────────────────

function CampaignKpi({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[74px] w-[96px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-white/80 px-2.5 py-2 text-center shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold leading-none text-text-primary">{value}</p>
    </div>
  );
}

function ExecutiveHeader({
  title,
  subtitle,
  kpis,
  chromeless = false,
  headerPortalId,
}: {
  title: string;
  subtitle: string;
  kpis: Array<{ label: string; value: string }>;
  chromeless?: boolean;
  headerPortalId?: string;
}) {
  if (chromeless) {
    return <HeaderKpiPortal portalId={headerPortalId} items={kpis} />;
  }
  return (
    <EEPanel className="bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/30">
      <div className="p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.75fr)_minmax(460px,1.25fr)] lg:items-center">
          <div className="min-w-0">
            <SLabel>{title}</SLabel>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">{title}</h2>
            <p className="mt-1 text-lg font-semibold text-text-secondary">{subtitle}</p>
          </div>
          <div className="grid grid-cols-4 justify-items-end gap-2 justify-self-end">
            {kpis.map((kpi) => (
              <CampaignKpi key={kpi.label} label={kpi.label} value={kpi.value} />
            ))}
          </div>
        </div>
      </div>
    </EEPanel>
  );
}

type StatementRankingRow = {
  id: number;
  name: string;
  value: number;
  delta: number | null;
};

function StatementRankingBars({
  rows,
}: {
  rows: StatementRankingRow[];
}) {
  return (
    <div className="divide-y divide-border-strong/70">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_auto] items-start gap-4 py-2.5">
          <p className="text-sm font-medium leading-snug text-text-primary">{row.name}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <ScoreChip score={row.value} size="sm" />
            <DeltaChip delta={row.delta} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecOverview({
  data, current, prior, locationFilter = "",
}: { data: EmployeeExperienceDashboardData; current: string; prior: string; locationFilter?: string }) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => {
    const rows = data.respondents.filter((r) => r.campaignLabel === current);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, current, locationFilter]);
  const priR = useMemo(() => {
    if (!prior) return [];
    const rows = data.respondents.filter((r) => r.campaignLabel === prior);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, prior, locationFilter]);

  const orgScore = useMemo(() => groupScore(curR, allIds), [curR, allIds]);
  const orgPrior = useMemo(() => priR.length > 0 ? groupScore(priR, allIds) : null, [priR, allIds]);
  const orgDelta = orgPrior !== null ? r1(orgScore - orgPrior) : null;

  const dims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const [selectedOverviewDim, setSelectedOverviewDim] = useState(
    orderedDimensionNames(data.questions)[0] ?? ""
  );
  const activeDim = useMemo(
    () => dims.find((dim) => dim.label === selectedOverviewDim) ?? dims[0] ?? null,
    [dims, selectedOverviewDim]
  );
  const activeStatements = useMemo(() => {
    if (!activeDim) return [];

    return data.questions
      .filter((question) => question.dimension === activeDim.label)
      .map((question) => {
        const score = itemScore(curR, question.itemId);
        const previousScore = priR.length > 0 ? itemScore(priR, question.itemId) : null;

        return {
          id: question.itemId,
          name: question.statement,
          value: score,
          delta: previousScore === null ? null : r1(score - previousScore),
        };
      })
      .sort((left, right) => right.value - left.value || left.id - right.id);
  }, [activeDim, data.questions, curR, priR]);

  if (curR.length < min) return <Empty message="Insufficient responses for the selected campaign." />;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <EEPanel className="bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/30">
        <div className="p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.75fr)_minmax(460px,1.25fr)] lg:items-center">
            <div className="min-w-0">
              <SLabel>Campaign Overview</SLabel>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">Employee Experience - Demo</h2>
              <p className="mt-1 text-lg font-semibold text-text-secondary">{current}</p>
            </div>
            <div className="grid grid-cols-4 justify-items-end gap-2 justify-self-end">
              <CampaignKpi
                label="Responses"
                value={curR.length.toLocaleString()}
              />
              <CampaignKpi
                label="Response Rate"
                value="—"
              />
              <CampaignKpi
                label="Campaign Average"
                value={formatScoreForDisplay(orgScore)}
              />
              <CampaignKpi
                label="Change From Previous"
                value={fmtDelta(orgDelta)}
              />
            </div>
          </div>
        </div>
      </EEPanel>

      {/* Dimension wheel + selected statement rankings */}
      <div className="grid gap-4 xl:grid-cols-2">
        <EEPanel className="bg-gradient-to-br from-white to-[#EBF1F6]/60">
          <div className="flex justify-center p-4">
            <DimensionWheel
              dims={dims}
              orgScore={orgScore}
              selectedDimension={activeDim?.label ?? ""}
              onSelectDimension={setSelectedOverviewDim}
            />
          </div>
        </EEPanel>
        <EEPanel>
          <EEPanelHeader
            className="pb-3"
            title={activeDim ? `${activeDim.label} Statements` : "Statement Rankings"}
            description="Individual statements for the selected dimension, ranked by current campaign average."
          />
          <EEPanelContent className="pt-0">
            {activeStatements.length > 0 ? (
              <StatementRankingBars
                rows={activeStatements}
              />
            ) : (
              <Empty message="Select a dimension to view statement rankings." />
            )}
          </EEPanelContent>
        </EEPanel>
      </div>
    </div>
  );
}

// ─── Executive: Brand Breakdown ──────────────────────────────────────────────

function ExecLocation({
  data,
  current,
  prior,
  locationFilter = "",
  brandLabel,
  jobCategoryLabel,
  showDivisionHeatmap,
  showLeadershipHeatmap,
  showJobCategoryHeatmap,
  showTenureHeatmap,
  scale = EE,
  chromeless = false,
  headerPortalId,
}: {
  data: EmployeeExperienceDashboardData;
  current: string;
  prior: string;
  locationFilter?: string;
  brandLabel: string;
  jobCategoryLabel: string;
  showDivisionHeatmap: boolean;
  showLeadershipHeatmap: boolean;
  showJobCategoryHeatmap: boolean;
  showTenureHeatmap: boolean;
  scale?: { min: number; mid: number; max: number; minLabel: string; maxLabel: string };
  chromeless?: boolean;
  headerPortalId?: string;
}) {
  // Reorient the Heat Maps perspective to the dashboard's score scale: shadow the
  // module-level EE scale and raw color resolver with the passed-in scale.
  const EE = scale;
  const dwsRawScoreColor = makeGradientColor(scale.min, scale.max);
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  const heatExportFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `heat-maps-${section}`, campaign: current });
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => {
    const rows = data.respondents.filter((r) => r.campaignLabel === current);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, current, locationFilter]);
  const priR = useMemo(() => {
    if (!prior) return [];
    const rows = data.respondents.filter((r) => r.campaignLabel === prior);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, prior, locationFilter]);

  const dims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const dimNames = useMemo(() => dims.map((d) => d.label), [dims]);
  const dimColTotals = useMemo(() => {
    const m: Record<string, number> = {};
    dims.forEach((d) => { m[d.label] = d.score; });
    return m;
  }, [dims]);

  function buildGroupedHeatmap(field: keyof EmployeeExperienceRespondent) {
    const groups = uniq(curR, field, min);
    const rowTotals: Record<string, number> = {};
    groups.forEach((group) => {
      rowTotals[group] = groupScore(curR.filter((respondent) => respondent[field] === group), allIds);
    });
    const sortedRows = [...groups].sort((a, b) => (rowTotals[b] ?? 0) - (rowTotals[a] ?? 0));
    const heatData = groups.map((group) => {
      const subset = curR.filter((respondent) => respondent[field] === group);
      const subsetDims = buildDims(data.questions, subset, []);
      const scores: Record<string, number | null> = {};
      subsetDims.forEach((dimension) => { scores[dimension.label] = dimension.score || null; });
      return { department: group, scores };
    });
    return { sortedRows, rowTotals, heatData };
  }

  const divisionHeatmap = useMemo(() => buildGroupedHeatmap("division"), [curR, data.questions, allIds]);
  const brandHeatmap = useMemo(() => buildGroupedHeatmap("location"), [curR, data.questions, allIds]);
  const departmentHeatmap = useMemo(() => buildGroupedHeatmap("department"), [curR, data.questions, allIds]);
  const leadershipHeatmap = useMemo(() => buildGroupedHeatmap("leadership"), [curR, data.questions, allIds]);
  const jobCategoryHeatmap = useMemo(() => buildGroupedHeatmap("fieldCategory"), [curR, data.questions, allIds]);
  const tenureHeatmap = useMemo(() => buildGroupedHeatmap("tenure"), [curR, data.questions, allIds]);

  if (curR.length < min) return <Empty message="Insufficient responses for the selected campaign." />;

  const overallScore = groupScore(curR, allIds);
  const priorScore = priR.length > 0 ? groupScore(priR, allIds) : null;
  const overallDelta = priorScore !== null ? r1(overallScore - priorScore) : null;

  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "Heat Maps",
      filters: [locationFilter || undefined, current].filter(
        (value): value is string => Boolean(value)
      ),
    });
  }

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Heat Maps"
        subtitle={`${current}${prior ? ` vs ${prior}` : ""}`}
        kpis={[
          { label: "Responses", value: curR.length.toLocaleString() },
          { label: "Campaign Average", value: formatScoreForDisplay(overallScore) },
          ...(prior ? [{ label: "Change From Previous", value: fmtDelta(overallDelta) }] : []),
        ]}
        chromeless={chromeless}
        headerPortalId={headerPortalId}
      />

      {showDivisionHeatmap ? (
        divisionHeatmap.sortedRows.length > 0 ? (
          <RegisteredVisualExportFrame order={10} label="Download heat map" filename={heatExportFile("by-division")}>
          <EEPanel>
            <EEPanelHeader
              title="By Division"
              description="Score per dimension grouped by division. Rows sorted highest to lowest overall score."
            />
            <EEPanelContent className="pt-0">
              <HeatmapChart
                rows={divisionHeatmap.sortedRows}
                columns={dimNames}
                data={divisionHeatmap.heatData}
                rowTotals={divisionHeatmap.rowTotals}
                columnTotals={dimColTotals}
              scoreColorResolver={dwsRawScoreColor}
                rowLabelHeader="Division"
                minValue={EE.min}
                midpoint={EE.mid}
                maxValue={EE.max}
              />
            </EEPanelContent>
          </EEPanel>
          </RegisteredVisualExportFrame>
        ) : (
          <Empty message="No divisions meet the minimum response threshold." />
        )
      ) : null}

      {brandHeatmap.sortedRows.length > 0 ? (
        <RegisteredVisualExportFrame order={20} label="Download heat map" filename={heatExportFile("by-brand")}>
        <EEPanel>
          <EEPanelHeader
            title={`By ${brandLabel}`}
            description={`Score per dimension grouped by ${brandLabel.toLowerCase()}. Rows sorted highest to lowest overall score.`}
          />
          <EEPanelContent className="pt-0">
            <HeatmapChart
              rows={brandHeatmap.sortedRows}
              columns={dimNames}
              data={brandHeatmap.heatData}
              rowTotals={brandHeatmap.rowTotals}
              columnTotals={dimColTotals}
              scoreColorResolver={dwsRawScoreColor}
              rowLabelHeader={brandLabel}
              minValue={EE.min}
              midpoint={EE.mid}
              maxValue={EE.max}
            />
          </EEPanelContent>
        </EEPanel>
        </RegisteredVisualExportFrame>
      ) : (
        <Empty message={`No ${brandLabel.toLowerCase()}s meet the minimum response threshold.`} />
      )}

      {departmentHeatmap.sortedRows.length > 0 ? (
        <RegisteredVisualExportFrame order={30} label="Download heat map" filename={heatExportFile("by-department")}>
        <EEPanel>
          <EEPanelHeader
            title="By Department"
            description="Score per dimension grouped by department. Rows sorted highest to lowest overall score."
          />
          <EEPanelContent className="pt-0">
            <HeatmapChart
              rows={departmentHeatmap.sortedRows}
              columns={dimNames}
              data={departmentHeatmap.heatData}
              rowTotals={departmentHeatmap.rowTotals}
              columnTotals={dimColTotals}
              scoreColorResolver={dwsRawScoreColor}
              rowLabelHeader="Department"
              minValue={EE.min}
              midpoint={EE.mid}
              maxValue={EE.max}
            />
          </EEPanelContent>
        </EEPanel>
        </RegisteredVisualExportFrame>
      ) : (
        <Empty message="No departments meet the minimum response threshold." />
      )}

      {showLeadershipHeatmap ? (
        leadershipHeatmap.sortedRows.length > 0 ? (
          <RegisteredVisualExportFrame order={40} label="Download heat map" filename={heatExportFile("by-leadership")}>
          <EEPanel>
            <EEPanelHeader
              title={`By ${jobCategoryLabel}`}
              description={`Score per dimension grouped by ${jobCategoryLabel.toLowerCase()}. Rows sorted highest to lowest overall score.`}
            />
            <EEPanelContent className="pt-0">
              <HeatmapChart
                rows={leadershipHeatmap.sortedRows}
                columns={dimNames}
                data={leadershipHeatmap.heatData}
                rowTotals={leadershipHeatmap.rowTotals}
                columnTotals={dimColTotals}
                scoreColorResolver={dwsRawScoreColor}
                rowLabelHeader={jobCategoryLabel}
                minValue={EE.min}
                midpoint={EE.mid}
                maxValue={EE.max}
              />
            </EEPanelContent>
          </EEPanel>
          </RegisteredVisualExportFrame>
        ) : (
          <Empty message={`No ${jobCategoryLabel.toLowerCase()}s meet the minimum response threshold.`} />
        )
      ) : null}

      {showJobCategoryHeatmap ? (
        jobCategoryHeatmap.sortedRows.length > 0 ? (
          <RegisteredVisualExportFrame order={50} label="Download heat map" filename={heatExportFile("by-job-category")}>
          <EEPanel>
            <EEPanelHeader
              title="By Job Category"
              description="Score per dimension grouped by job category. Rows sorted highest to lowest overall score."
            />
            <EEPanelContent className="pt-0">
              <HeatmapChart
                rows={jobCategoryHeatmap.sortedRows}
                columns={dimNames}
                data={jobCategoryHeatmap.heatData}
                rowTotals={jobCategoryHeatmap.rowTotals}
                columnTotals={dimColTotals}
                scoreColorResolver={dwsRawScoreColor}
                rowLabelHeader="Job Category"
                minValue={EE.min}
                midpoint={EE.mid}
                maxValue={EE.max}
              />
            </EEPanelContent>
          </EEPanel>
          </RegisteredVisualExportFrame>
        ) : (
          <Empty message="No job categories meet the minimum response threshold." />
        )
      ) : null}

      {showTenureHeatmap ? (
        tenureHeatmap.sortedRows.length > 0 ? (
          <RegisteredVisualExportFrame order={60} label="Download heat map" filename={heatExportFile("by-tenure")}>
          <EEPanel>
            <EEPanelHeader
              title="By Tenure"
              description="Score per dimension grouped by tenure. Rows sorted highest to lowest overall score."
            />
            <EEPanelContent className="pt-0">
              <HeatmapChart
                rows={tenureHeatmap.sortedRows}
                columns={dimNames}
                data={tenureHeatmap.heatData}
                rowTotals={tenureHeatmap.rowTotals}
                columnTotals={dimColTotals}
                scoreColorResolver={dwsRawScoreColor}
                rowLabelHeader="Tenure"
                minValue={EE.min}
                midpoint={EE.mid}
                maxValue={EE.max}
              />
            </EEPanelContent>
          </EEPanel>
          </RegisteredVisualExportFrame>
        ) : (
          <Empty message="No tenure groups meet the minimum response threshold." />
        )
      ) : null}

    </div>
  );
}

// ─── HR: Department Rankings ──────────────────────────────────────────────────

function HrRankings({
  data, current, prior, filters,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string;
  filters: Record<string, string>;
}) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => filterR(data.respondents.filter((r) => r.campaignLabel === current), filters), [data.respondents, current, filters]);
  const priR = useMemo(() => prior ? filterR(data.respondents.filter((r) => r.campaignLabel === prior), filters) : [], [data.respondents, prior, filters]);

  const orgDims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const dimNames = useMemo(() => orgDims.map((d) => d.label), [orgDims]);
  const dimColTotals = useMemo(() => {
    const m: Record<string, number> = {};
    orgDims.forEach((d) => { m[d.label] = d.score; });
    return m;
  }, [orgDims]);

  const depts = useMemo(() => uniq(curR, "department", min), [curR, min]);
  const deptRowTotals = useMemo(() => {
    const m: Record<string, number> = {};
    depts.forEach((dept) => { m[dept] = groupScore(curR.filter((r) => r.department === dept), allIds); });
    return m;
  }, [depts, curR, allIds]);
  const sortedDepts = useMemo(() => [...depts].sort((a, b) => (deptRowTotals[b] ?? 0) - (deptRowTotals[a] ?? 0)), [depts, deptRowTotals]);
  const deptHeatData = useMemo(() =>
    depts.map((dept) => {
      const dc = curR.filter((r) => r.department === dept);
      const deptDims = buildDims(data.questions, dc, []);
      const scores: Record<string, number | null> = {};
      deptDims.forEach((d) => { scores[d.label] = d.score || null; });
      return { department: dept, scores };
    }),
    [depts, curR, data.questions]
  );

  if (sortedDepts.length === 0) return <Empty message="No departments meet the minimum response threshold under the current filters." />;

  return (
    <EEPanel>
      <EEPanelHeader
        title="Department Rankings"
        description={`${sortedDepts.length} department${sortedDepts.length !== 1 ? "s" : ""} · ${current} · sorted by overall score.`}
      />
      <EEPanelContent className="pt-0">
        <HeatmapChart
          rows={sortedDepts}
          columns={dimNames}
          data={deptHeatData}
          rowTotals={deptRowTotals}
          columnTotals={dimColTotals}
          scoreColorResolver={dwsRawScoreColor}
          rowLabelHeader="Department"
          minValue={EE.min}
          midpoint={EE.mid}
          maxValue={EE.max}
        />
      </EEPanelContent>
    </EEPanel>
  );
}

// ─── HR: Index Deep Dive ──────────────────────────────────────────────────────

function HrIndexDive({
  data, current, prior, selectedDim, filters,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string;
  selectedDim: string; filters: Record<string, string>;
}) {
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  const idxDiveFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `index-deep-dive-${section}`, campaign: current });
  const min = data.settings.minimumSegmentSize;
  const curR = useMemo(() => filterR(data.respondents.filter((r) => r.campaignLabel === current), filters), [data.respondents, current, filters]);
  const priR = useMemo(() => prior ? filterR(data.respondents.filter((r) => r.campaignLabel === prior), filters) : [], [data.respondents, prior, filters]);

  const dimQs = useMemo(
    () => (selectedDim ? data.questions.filter((q) => q.dimension === selectedDim) : data.questions),
    [data.questions, selectedDim]
  );
  const dimIds = useMemo(() => dimQs.map((q) => q.itemId), [dimQs]);
  const dimAvg = useMemo(() => groupScore(curR, dimIds), [curR, dimIds]);

  const stmts = useMemo(() =>
    dimQs.map((q) => {
      const score = itemScore(curR, q.itemId);
      const prev = priR.length >= min ? itemScore(priR, q.itemId) : null;
      return { ...q, score, prev, delta: prev !== null ? r1(score - prev) : null };
    }).sort((a, b) => b.score - a.score),
    [dimQs, curR, priR, min]
  );

  const brands = useMemo(
    () => uniq(curR, "location", min).filter(isKnownBrandSegment),
    [curR, min]
  );
  const brandBars = useMemo(() =>
    brands.map((brand) => {
      const bc = curR.filter((r) => r.location === brand);
      return { name: brand, value: groupScore(bc, dimIds) };
    }).sort((a, b) => b.value - a.value),
    [brands, curR, dimIds]
  );

  if (dimQs.length === 0) return <Empty message="No statements are available for this selection." />;

  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "Index Deep Dive",
      filters: [selectedDim || "All indexes", current].filter(
        (value): value is string => Boolean(value)
      ),
    });
  }

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Index Deep Dive"
        subtitle={`${selectedDim || "All indexes"} · ${current}${prior ? ` vs ${prior}` : ""}`}
        kpis={[
          { label: "Responses", value: curR.length.toLocaleString() },
          { label: "Brands", value: brands.length.toString() },
          { label: "Index Average", value: formatScoreForDisplay(dimAvg) },
          { label: "Statements", value: stmts.length.toString() },
        ]}
      />
      <RegisteredVisualExportFrame order={10} label="Download table" filename={idxDiveFile("statement-detail")}>
      <EEPanel>
        <EEPanelHeader
          title={`${selectedDim || "All indexes"} — Statement Detail`}
          description="All items ranked highest to lowest. Delta reflects change vs prior campaign."
        />
        <EEPanelContent className="pt-0">
          <div className="overflow-hidden rounded-2xl border border-[#8798AA]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="bg-[#E2E8EF] py-[11px] pl-[14px] pr-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Statement</th>
                <th className="bg-[#E2E8EF] px-3 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">{current}</th>
                {prior && <th className="col-group-start bg-[#E2E8EF] px-3 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Δ</th>}
              </tr>
            </thead>
            <tbody>
              {stmts.map((q, i) => (
                <tr key={q.itemId} className={`border-t border-[#D3DDE7] ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                  <td className="py-3 pl-[14px] pr-4 text-[13px] leading-relaxed text-text-primary">{q.statement}</td>
                  <td className="px-3 py-3 text-center"><ScoreChip score={q.score} size="sm" /></td>
                  {prior && <td className="col-group-start px-3 py-3 text-center"><DeltaChip delta={q.delta} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </EEPanelContent>
      </EEPanel>
      </RegisteredVisualExportFrame>

      {brandBars.length > 0 && (
        <RegisteredVisualExportFrame order={20} label="Download chart" filename={idxDiveFile("by-brand")}>
        <EEPanel>
          <EEPanelHeader
            title={`${selectedDim || "All indexes"} by Brand`}
            description="Which brands score highest and lowest on this index."
          />
          <EEPanelContent className="pt-0">
            <GradientBarChart
              data={brandBars}
              average={dimAvg}
              minValue={EE.min} midpoint={EE.mid} maxValue={EE.max}
              height={Math.max(280, brandBars.length * 34)}
            />
          </EEPanelContent>
        </EEPanel>
        </RegisteredVisualExportFrame>
      )}
    </div>
  );
}

// ─── HR: Supervisor Reports ───────────────────────────────────────────────────

function SupervisorBenchmark({ rows }: { rows: { id: number; statement: string; score: number; orgScore: number }[] }) {
  const range = EE.max - EE.min;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        <span>Org avg</span>
        <span className="inline-block h-3 w-3 rounded-full border-2 border-[#6B4A2D] bg-[#F0A06C]" />
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const curPct = Math.min(100, Math.max(0, ((row.score - EE.min) / range) * 100));
          const orgPct = Math.min(100, Math.max(0, ((row.orgScore - EE.min) / range) * 100));
          return (
            <div key={row.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <p className="mb-1.5 text-xs leading-snug text-text-secondary">{row.statement}</p>
              <div className="relative h-8 rounded border border-[#B5BCC6] bg-white">
                <div className="absolute left-0 top-0 flex h-full items-center rounded px-2 text-xs font-bold" style={{ width: `${Math.max(curPct, 10)}%`, backgroundColor: sColor(row.score), color: sTColor(row.score), outline: "1px solid rgba(0,0,0,0.15)" }}>
                  {formatScoreForDisplay(row.score)}
                </div>
                <div className="absolute bottom-[-4px] top-[-4px] w-px bg-[#2E3E4F]" style={{ left: `${orgPct}%` }} />
                <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-[#6B4A2D] bg-[#F0A06C]" style={{ left: `calc(${orgPct}% - 6px)` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-1 text-xs text-text-muted">
        <span>{EE.minLabel}</span><span>{formatScoreForDisplay(EE.mid)}</span><span>{EE.maxLabel}</span>
      </div>
    </div>
  );
}

function HrSupervisor({
  data, current, prior, filters, selectedSup, onSelectSup,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string;
  filters: Record<string, string>; selectedSup: string; onSelectSup: (v: string) => void;
}) {
  const min = data.settings.minimumSegmentSize;
  const curAll = useMemo(() => filterR(data.respondents.filter((r) => r.campaignLabel === current), filters), [data.respondents, current, filters]);
  const priAll = useMemo(() => prior ? filterR(data.respondents.filter((r) => r.campaignLabel === prior), filters) : [], [data.respondents, prior, filters]);
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);

  const sups = useMemo(() => uniq(curAll, "supervisor", min), [curAll, min]);
  const activeSup = selectedSup || sups[0] || "";

  const supQ = useMemo(() => data.questions.filter((q) => q.dimension === "Supervisor"), [data.questions]);
  const supIds = useMemo(() => supQ.map((q) => q.itemId), [supQ]);

  const supCur = useMemo(() => curAll.filter((r) => r.supervisor === activeSup), [curAll, activeSup]);
  const supPri = useMemo(() => priAll.filter((r) => r.supervisor === activeSup), [priAll, activeSup]);

  const supScore = useMemo(() => groupScore(supCur, supIds), [supCur, supIds]);
  const supPrevScore = useMemo(() => supPri.length >= min ? groupScore(supPri, supIds) : null, [supPri, supIds, min]);
  const supDelta = supPrevScore !== null ? r1(supScore - supPrevScore) : null;
  const orgSupScore = useMemo(() => groupScore(curAll, supIds), [curAll, supIds]);
  const benchGap = r1(supScore - orgSupScore);

  const supScores = useMemo(() => {
    const m: Record<string, number> = {};
    sups.forEach((s) => { m[s] = groupScore(curAll.filter((r) => r.supervisor === s), allIds); });
    return m;
  }, [sups, curAll, allIds]);

  const rank = [...sups].sort((a, b) => (supScores[b] ?? 0) - (supScores[a] ?? 0)).indexOf(activeSup) + 1;

  const qRows = useMemo(() =>
    supQ.map((q) => {
      const score = itemScore(supCur, q.itemId);
      const prev = supPri.length >= min ? itemScore(supPri, q.itemId) : null;
      const orgScore = itemScore(curAll, q.itemId);
      return { id: q.itemId, statement: q.statement, score, prev, delta: prev !== null ? r1(score - prev) : null, orgScore };
    }).sort((a, b) => b.score - a.score),
    [supQ, supCur, supPri, curAll, min]
  );

  if (sups.length === 0) return <Empty message="No supervisors meet the minimum response threshold under the current filters." />;

  const deltaStyle = (d: number | null) =>
    d === null ? "bg-surface-2 text-text-primary" : d > 0.005 ? "bg-nsp-green-50 text-nsp-green-900" : d < -0.005 ? "bg-nsp-red-50 text-nsp-red-900" : "bg-surface-2 text-text-primary";

  return (
    <div className="space-y-6">
      <div>
        <SLabel>Supervisor Report</SLabel>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary">{activeSup || "No supervisor selected"}</h2>
        <p className="mt-1 text-sm text-text-secondary">{supCur.length} responses · {current}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border-strong bg-white px-4 py-4 shadow-sm">
          <SLabel>Responses</SLabel>
          <p className="mt-2 text-4xl font-extrabold text-text-primary">{supCur.length}</p>
          <p className="mt-1 text-xs text-text-muted">{current}</p>
        </div>
        <div className="rounded-2xl border border-border-strong px-4 py-4 shadow-sm" style={{ backgroundColor: sColor(supScore), color: sTColor(supScore) }}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Current Avg</p>
          <p className="mt-2 text-4xl font-extrabold">{formatScoreForDisplay(supScore)}</p>
          <p className="mt-1 text-xs opacity-80">{current}</p>
        </div>
        <div className={`rounded-2xl border border-border-strong px-4 py-4 shadow-sm ${deltaStyle(supDelta)}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Campaign Delta</p>
          <p className="mt-2 text-4xl font-extrabold">{fmtDelta(supDelta)}</p>
          <p className="mt-1 text-xs opacity-80">{prior || "No comparison"}</p>
        </div>
        <div className={`rounded-2xl border border-border-strong px-4 py-4 shadow-sm ${deltaStyle(benchGap)}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Rank / Org Gap</p>
          <p className="mt-2 text-3xl font-extrabold">{rank}/{sups.length}</p>
          <p className="mt-1 text-xs opacity-80">vs org avg: {fmtDelta(benchGap)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <EEPanel>
          <EEPanelHeader
            title="Supervisor Item Table"
            description="Team score vs. org average per item. Delta vs prior campaign."
          />
          <EEPanelContent className="pt-0">
            <div className="overflow-hidden rounded-2xl border border-[#8798AA]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="bg-[#E2E8EF] py-[11px] pl-[14px] pr-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Statement</th>
                  <th className="bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Score</th>
                  <th className="bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Org Avg</th>
                  <th className="col-group-start bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Δ</th>
                </tr>
              </thead>
              <tbody>
                {qRows.map((row, i) => (
                  <tr key={row.id} className={`border-t border-[#D3DDE7] ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                    <td className="py-3 pl-[14px] pr-3 text-[12px] leading-relaxed text-text-primary">{row.statement}</td>
                    <td className="px-2 py-3 text-center"><ScoreChip score={row.score} size="sm" /></td>
                    <td className="px-2 py-3 text-center font-semibold text-text-secondary">{formatScoreForDisplay(row.orgScore)}</td>
                    <td className="col-group-start px-2 py-3 text-center"><DeltaChip delta={row.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </EEPanelContent>
        </EEPanel>

        <EEPanel>
          <EEPanelHeader
            title="Benchmark Comparison"
            description="Bar = supervisor score. Orange dot = organization supervisor average."
          />
          <EEPanelContent className="pt-0">
            <SupervisorBenchmark rows={qRows} />
          </EEPanelContent>
        </EEPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <EEPanel>
          <EEPanelHeader title="Strengths to Protect" description="Highest-scoring supervisor items." />
          <EEPanelContent className="space-y-3 pt-0">
            {qRows.slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: sColor(row.score), color: sTColor(row.score) }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Strength · {formatScoreForDisplay(row.score)}</p>
                <p className="mt-1 text-sm leading-relaxed">{row.statement}</p>
              </div>
            ))}
          </EEPanelContent>
        </EEPanel>
        <EEPanel>
          <EEPanelHeader title="Manager Priorities" description="Lowest-scoring items to address." />
          <EEPanelContent className="space-y-3 pt-0">
            {[...qRows].sort((a, b) => a.score - b.score).slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: sColor(row.score), color: sTColor(row.score) }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Priority · {formatScoreForDisplay(row.score)}</p>
                <p className="mt-1 text-sm leading-relaxed">{row.statement}</p>
              </div>
            ))}
          </EEPanelContent>
        </EEPanel>
      </div>
    </div>
  );
}

// ─── HR: Open Text ────────────────────────────────────────────────────────────

function HrOpenText({
  data, current, brandFilter, fieldType, fields = OPEN_TEXT_FIELDS,
  basinReportSurface = false,
}: {
  data: EmployeeExperienceDashboardData; current: string;
  brandFilter: string; fieldType: OpenTextField;
  fields?: ReadonlyArray<{ id: OpenTextField; label: string }>;
  /**
   * Basin surface treatment "1b" (DWS Field redesign pilot only): this
   * component doesn't use the shared `.card`/`.stmt-wrap` kit classes, so
   * its question-group panels get the same soft border/shadow values via a
   * direct Tailwind class swap instead. Every other caller leaves this
   * unset and keeps the hard-edged default look.
   */
  basinReportSurface?: boolean;
}) {
  const questionGroups = useMemo(() => {
    const orderedFields = [
      fieldType,
      ...fields.map((field) => field.id).filter((id) => id !== fieldType),
    ] as OpenTextField[];

    return orderedFields.map((questionId) => {
      const label = fields.find((field) => field.id === questionId)?.label ?? questionId;
      const inCampaign = data.respondents
        .filter((respondent) => {
          if (respondent.campaignLabel !== current) return false;
          if (brandFilter && respondent.location !== brandFilter) return false;
          const text = respondent.comments[questionId];
          return Boolean(text && text.trim().length > 0);
        });

      const scoped = inCampaign.length > 0
        ? inCampaign
        : data.respondents.filter((respondent) => {
            if (brandFilter && respondent.location !== brandFilter) return false;
            const text = respondent.comments[questionId];
            return Boolean(text && text.trim().length > 0);
          });

      const grouped = new Map<string, Array<{ id: string; text: string; department: string }>>();
      scoped.forEach((respondent) => {
        const brand = respondent.location || "Unknown Brand";
        if (!grouped.has(brand)) grouped.set(brand, []);
        grouped.get(brand)?.push({
          id: `${respondent.id}-${questionId}-${respondent.campaignLabel}`,
          text: respondent.comments[questionId].trim(),
          department: respondent.department,
        });
      });

      const brands = Array.from(grouped.entries())
        .map(([brand, entries]) => ({ brand, entries }))
        .sort((left, right) => left.brand.localeCompare(right.brand));

      return {
        id: questionId,
        label,
        responseCount: scoped.length,
        brands,
      };
    });
  }, [data.respondents, fieldType, current, brandFilter, fields]);

  const totalResponses = questionGroups.reduce((sum, group) => sum + group.responseCount, 0);
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "Open Text",
      filters: [brandFilter || "All brands", current].filter(
        (value): value is string => Boolean(value)
      ),
    });
  }

  return (
    <div className="space-y-6">
      {/* Export-only: reveal all collapsed comment groups so the capture is complete. */}
      <style>{`.ee-export-mode details > *:not(summary){display:block !important}`}</style>
      <div>
        <SLabel>Open Text Insights</SLabel>
        <p className="mt-2 text-sm text-text-secondary">
          {totalResponses} response{totalResponses !== 1 ? "s" : ""}{brandFilter ? ` from ${brandFilter}` : " across all brands"} grouped by question and brand.
        </p>
      </div>
      {totalResponses === 0 ? (
        <Empty message="No responses match the current selection." />
      ) : (
        <div className="space-y-3">
          {questionGroups.map((group, groupIndex) => (
            <RegisteredVisualExportFrame
              key={group.id}
              order={70 + groupIndex}
              label="Download responses"
              filename={buildDashboardExportFilename({ client: "dws", perspective: `open-text-${group.label}`, campaign: current })}
            >
            <div className={basinReportSurface ? "overflow-hidden rounded-2xl border border-[rgba(135,152,170,0.7)] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.24),0_1px_3px_rgba(15,23,42,0.20)]" : "overflow-hidden rounded-2xl border border-[#8798AA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"}>
              <div className="border-b border-[#D3DDE7] bg-[#F1F4F7] px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E7E96]">Question</p>
                <p className="mt-1 text-sm font-semibold text-[#152238]">{group.label}</p>
                <p className="mt-1 text-xs text-[#6E7E96]">{group.responseCount} response{group.responseCount !== 1 ? "s" : ""}</p>
              </div>
              {group.responseCount === 0 ? (
                <div className="px-5 py-4 text-sm text-[#6E7E96]">No responses for this question in the selected scope.</div>
              ) : (
                <div className="divide-y divide-[#E2E8EF]">
                  {group.brands.map((brandGroup) => (
                    <details key={`${group.id}-${brandGroup.brand}`} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-[#152238]">
                        <span>{brandGroup.brand}</span>
                        <span className="text-xs font-medium text-[#6E7E96]">{brandGroup.entries.length} response{brandGroup.entries.length !== 1 ? "s" : ""}</span>
                      </summary>
                      <div className="space-y-2 px-5 pb-4 pt-1">
                        {brandGroup.entries.map((entry, index) => (
                          <div key={entry.id} className="rounded-xl border border-[#D3DDE7] bg-[#FAFCFD] px-3 py-2.5">
                            <p className="text-sm leading-relaxed text-[#152238]">{entry.text}</p>
                            <p className="mt-1 text-xs text-[#6E7E96]">#{index + 1}{entry.department ? ` · ${entry.department}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
            </RegisteredVisualExportFrame>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Department: Scorecard ────────────────────────────────────────────────────

function DeptScorecard({
  data, current, prior, selectedDept,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string; selectedDept: string;
}) {
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  const scorecardFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `scorecard-${selectedDept}-${section}`, campaign: current });
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);

  const curAll = useMemo(() => data.respondents.filter((r) => r.campaignLabel === current), [data.respondents, current]);
  const priAll = useMemo(() => prior ? data.respondents.filter((r) => r.campaignLabel === prior) : [], [data.respondents, prior]);

  const dc = useMemo(() => curAll.filter((r) => r.department === selectedDept), [curAll, selectedDept]);
  const dp = useMemo(() => priAll.filter((r) => r.department === selectedDept), [priAll, selectedDept]);

  const deptScore = useMemo(() => groupScore(dc, allIds), [dc, allIds]);
  const deptPrev = useMemo(() => dp.length >= min ? groupScore(dp, allIds) : null, [dp, allIds, min]);
  const deptDelta = deptPrev !== null ? r1(deptScore - deptPrev) : null;

  const dims = useMemo(() => buildDims(data.questions, dc, dp.length >= min ? dp : []), [data.questions, dc, dp, min]);

  const allStmts = useMemo(() =>
    data.questions.map((q) => {
      const score = itemScore(dc, q.itemId);
      const prev = dp.length >= min ? itemScore(dp, q.itemId) : null;
      return { ...q, score, prev, delta: prev !== null ? r1(score - prev) : null };
    }).sort((a, b) => b.score - a.score),
    [data.questions, dc, dp, min]
  );

  const topStmts = allStmts.slice(0, 8);
  const focusStmts = [...allStmts].reverse().slice(0, 8);

  const demoCuts = useMemo(() => {
    const fields: { id: keyof EmployeeExperienceRespondent; label: string }[] = [
      { id: "location", label: "Brand" },
      { id: "fieldCategory", label: "Work Type" },
      { id: "tenure", label: "Tenure" },
      { id: "generation", label: "Generation" },
      { id: "leadership", label: "Leadership" },
    ];
    return fields.map(({ id, label }) => {
      const groups = uniq(dc, id, min);
      const rows = groups.map((g) => {
        const gc = dc.filter((r) => r[id] === g);
        const gp = dp.filter((r) => r[id] === g);
        const score = groupScore(gc, allIds);
        const prev = gp.length >= min ? groupScore(gp, allIds) : null;
        return { label: g, n: gc.length, score, delta: prev !== null ? r1(score - prev) : null };
      }).sort((a, b) => b.score - a.score);
      return { id: id as string, label, rows };
    }).filter((c) => c.rows.length > 0);
  }, [dc, dp, allIds, min]);

  if (!selectedDept) return <Empty message="Select a department from the left rail." />;
  if (dc.length < min) return <Empty message={`${selectedDept} does not meet the minimum response threshold (${min}).`} />;

  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "Department Scorecard",
      filters: [selectedDept, current].filter((value): value is string => Boolean(value)),
    });
  }

  function StmtTable({ title, desc, stmts }: { title: string; desc: string; stmts: typeof allStmts }) {
    return (
      <EEPanel>
        <EEPanelHeader title={title} description={desc} />
        <EEPanelContent className="pt-0">
          <div className="overflow-hidden rounded-2xl border border-[#8798AA]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="bg-[#E2E8EF] py-[11px] pl-[14px] pr-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Statement</th>
                <th className="bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Score</th>
                <th className="col-group-start bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Δ</th>
              </tr>
            </thead>
            <tbody>
              {stmts.map((q, i) => (
                <tr key={q.itemId} className={`border-t border-[#D3DDE7] ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                  <td className="py-2.5 pl-[14px] pr-3 text-[12px] leading-relaxed text-text-primary">{q.statement}</td>
                  <td className="px-2 py-2.5 text-center"><ScoreChip score={q.score} size="sm" /></td>
                  <td className="col-group-start px-2 py-2.5 text-center"><DeltaChip delta={q.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </EEPanelContent>
      </EEPanel>
    );
  }

  return (
    <div className="space-y-6">
      <RegisteredVisualExportFrame order={10} label="Download scorecard" filename={scorecardFile("overview")}>
      <EEPanel className="bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/30">
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SLabel>Department Scorecard · {current}</SLabel>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary">{selectedDept}</h2>
              <p className="mt-1.5 text-sm text-text-secondary">{dc.length} {dc.length === 1 ? "response" : "responses"}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreChip score={deptScore} size="lg" />
              <DeltaChip delta={deptDelta} />
            </div>
          </div>
        </div>
      </EEPanel>
      </RegisteredVisualExportFrame>

      {/* Index tiles */}
      <RegisteredVisualExportFrame order={20} label="Download index tiles" filename={scorecardFile("index-tiles")}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dims.map((dim) => (
          <div key={dim.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[#8798AA] bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{dim.label}</p>
              <p className="mt-0.5 text-2xl font-extrabold text-text-primary">{formatScoreForDisplay(dim.score)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-8 w-8 rounded-xl" style={{ backgroundColor: sColor(dim.score) }} />
              <DeltaChip delta={dim.delta} />
            </div>
          </div>
        ))}
      </div>
      </RegisteredVisualExportFrame>

      {/* Statement tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <RegisteredVisualExportFrame order={30} label="Download table" filename={scorecardFile("top-statements")}>
          <StmtTable title="Top Statements" desc="Highest-scoring items for this department." stmts={topStmts} />
        </RegisteredVisualExportFrame>
        <RegisteredVisualExportFrame order={40} label="Download table" filename={scorecardFile("focus-areas")}>
          <StmtTable title="Focus Areas" desc="Lowest-scoring items for this department." stmts={focusStmts} />
        </RegisteredVisualExportFrame>
      </div>

      {/* Demographic cuts */}
      {demoCuts.length > 0 && (
        <RegisteredVisualExportFrame order={50} label="Download cuts" filename={scorecardFile("demographic-cuts")}>
        <div>
          <SLabel>Demographic Cuts</SLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {demoCuts.map((cut) => (
              <EEPanel key={cut.id}>
                <EEPanelHeader title={cut.label} className="pb-2 pt-5" />
                <EEPanelContent className="space-y-2 pt-0">
                  {cut.rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{row.label} ({row.n})</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ScoreChip score={row.score} size="sm" />
                        <DeltaChip delta={row.delta} />
                      </div>
                    </div>
                  ))}
                </EEPanelContent>
              </EEPanel>
            ))}
          </div>
        </div>
        </RegisteredVisualExportFrame>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DWS_DEFAULT_LOGO_URL = "/deep-well-services-logo.png";

export function DwsEmployeeExperienceDashboardClient({
  data,
  logoUrl = DWS_DEFAULT_LOGO_URL,
  dashboardInstanceId,
  canEditGuidance = false,
  portalAccess,
  redesignLayout = false,
}: {
  data: EmployeeExperienceDashboardData;
  logoUrl?: string;
  dashboardInstanceId?: string;
  canEditGuidance?: boolean;
  portalAccess?: EmployeeExperienceUserAccess;
  /**
   * DWS Field layout-redesign pilot flag (from ?layout=redesign). Only takes
   * effect when clientScope.key === "dws-field"; every other scope ignores it.
   */
  redesignLayout?: boolean;
}) {
  const clientScope = useMemo(
    () => resolveEmployeeExperienceClientScope(data.meta.organizationName),
    [data.meta.organizationName]
  );
  const searchParams = useSearchParams();
  // Effective redesign flag: explicit prop OR ?layout=redesign on the URL, and
  // always-on for the production employee-experience scopes (CSG + both DWS
  // scopes), which now use the redesigned index-rail shell.
  const redesignActive =
    redesignLayout ||
    searchParams?.get("layout") === "redesign" ||
    clientScope.key === "csg" ||
    clientScope.key === "dws" ||
    clientScope.key === "dws-field";
  // The redesign surface treatment (off-white canvas, no gradient hero box,
  // softened borders + doubled shadow, vertical section labels) is part of the
  // redesign itself — not a per-client theme — so it's on wherever the redesign
  // shell is active.
  const useRedesignSurfaceTint = redesignActive;
  const filterStoreBase = buildDashboardFilterStoreKey([
    "ee",
    clientScope.key,
    dashboardInstanceId,
  ]);
  const perspectiveFilterKey = (perspectiveId: string) =>
    buildDashboardFilterStoreKey([filterStoreBase, perspectiveId]);
  const shellFilterKey = buildDashboardFilterStoreKey([filterStoreBase, "__shell"]);
  const [activeGroup, setActiveGroup] = useState<GroupId>("executive");
  const [activePersp, setActivePersp] = useState<PerspectiveId>("exec-overview");
  const [current, setCurrent] = usePersistedDashboardFilter(shellFilterKey, "current", () =>
    resolvePreferredCampaign(data.meta.campaigns, PREFERRED_CURRENT_CAMPAIGN)
  );
  const [prior, setPrior] = usePersistedDashboardFilter(shellFilterKey, "prior", () => {
    const preferredPrior = data.meta.campaigns.find((campaign) => campaign.toLowerCase() === PREFERRED_PRIOR_CAMPAIGN.toLowerCase());
    if (preferredPrior) return preferredPrior;
    return [...data.meta.campaigns].reverse().find((campaign) => campaign !== resolvePreferredCampaign(data.meta.campaigns, PREFERRED_CURRENT_CAMPAIGN)) ?? "";
  });

  const [hrRankFilters, setHrRankFilters] = useState<Record<string, string>>({ location: "", fieldCategory: "" });
  const dimensionOptions = useMemo(() => orderedDimensionNames(data.questions), [data.questions]);
  const [selectedDim, setSelectedDim] = useState("");
  const [idxFilters, setIdxFilters] = useState<Record<string, string>>({ location: "", fieldCategory: "" });
  const [supFilters, setSupFilters] = useState<Record<string, string>>({ location: "", department: "" });
  const [selectedSup, setSelectedSup] = useState("");
  const [departmentReportBrand, setDepartmentReportBrand] = usePersistedDashboardFilter(
    perspectiveFilterKey("ee-unit-department-report"),
    "brand",
    () => ""
  );
  const [openTextBrand, setOpenTextBrand] = useState("");
  const [openTextField, setOpenTextField] = useState<OpenTextField>("strengths");
  const [selectedDept, setSelectedDept] = useState("");
  const [execCompId, setExecCompId] = useState("");
  const [execIndexId, setExecIndexId] = useState("");
  const [execLocation, setExecLocation] = useState("");
  const [execEmployment, setExecEmployment] = useState("");
  const [execGeneration, setExecGeneration] = useState("");
  const [execRole, setExecRole] = useState("");
  const [execTenure, setExecTenure] = useState("");
  const [execDepartment, setExecDepartment] = useState("");
  const [execJobCategory, setExecJobCategory] = useState("");
  const [execDivision, setExecDivision] = useState("");
  const [execSupervisorDepartment, setExecSupervisorDepartment] = useState("");
  const [execSupervisorJobCategory, setExecSupervisorJobCategory] = useState("");
  const [execComparisonJobCategory, setExecComparisonJobCategory] = useState("");
  const [execComparisonDepartment, setExecComparisonDepartment] = useState("");
  const [execDeptStatementId, setExecDeptStatementId] = useState(COMPARISON_ALL);
  const [execBrandStatementId, setExecBrandStatementId] = useState(COMPARISON_ALL);
  const hasPerspectiveRestrictions =
    portalAccess?.perspectiveAccessMode === "restricted" ||
    (portalAccess?.allowedPerspectiveIds.length ?? 0) > 0;
  const availableGroups = useMemo(() => {
    const base = !hasPerspectiveRestrictions
      ? clientScope.groups
      : clientScope.groups
          .map((group) => ({
            ...group,
            perspectives: group.perspectives.filter((perspective) =>
              new Set(portalAccess?.allowedPerspectiveIds ?? []).has(perspective.id)
            ),
          }))
          .filter((group) => group.perspectives.length > 0);

    // Basin Breakdown is a redesign-pilot-only perspective (DWS Field, chromeless
    // layout). It's spliced in here rather than added to DWS_FIELD_SCOPE.groups so
    // the classic (non-redesign) nav and other clients never see or route to it.
    // Nav order within the group: Report, Breakdown — a thin divider — then
    // Comparison, since Comparison is a fundamentally different lens (across
    // units) than the Report/Breakdown pair (deep dive into one unit).
    if (redesignActive && (clientScope.key === "dws-field" || clientScope.key === "dws")) {
      // Each unit group gets a Breakdown spliced in right after its Report, with
      // a thin divider before the Comparison (the different-lens item). Division
      // exists only on DWS office; AutoSEP only on DWS field (and has no
      // comparison, so no divider). Supervisor gets Report → Breakdown → Comparison
      // like the other unit groups.
      const breakdownByGroup: Record<
        string,
        { id: PerspectiveId; label: string; afterReportId: PerspectiveId; comparisonId?: PerspectiveId }
      > = {
        division: {
          id: "ee-division-breakdown",
          label: "Division Breakdown",
          afterReportId: "ee-division-report",
          comparisonId: "ee-division-comparison",
        },
        basin: {
          id: "ee-segment-breakdown",
          label: `${clientScope.brandLabel} Breakdown`,
          afterReportId: "ee-brand-report",
          comparisonId: "ee-location-comparison",
        },
        "dept-group": {
          id: "ee-department-breakdown",
          label: "Department Breakdown",
          afterReportId: "ee-unit-department-report",
          comparisonId: "ee-department-comparison",
        },
        "role-group": {
          id: "ee-role-breakdown",
          label: `${clientScope.jobCategoryLabel} Breakdown`,
          afterReportId: "ee-department-report",
          comparisonId: "ee-role-comparison",
        },
        "supervisor-group": {
          id: "ee-supervisor-breakdown",
          label: "Supervisor Breakdown",
          afterReportId: "hr-supervisor",
          comparisonId: "ee-supervisor-comparison",
        },
        "autosep-group": {
          id: "ee-autosep-breakdown",
          label: "AutoSEP Breakdown",
          afterReportId: "ee-autosep-report",
        },
      };
      return base.map((group) => {
        const config = breakdownByGroup[group.id];
        if (!config) return group;
        const perspectives = config.comparisonId
          ? group.perspectives.map((perspective) =>
              perspective.id === config.comparisonId
                ? { ...perspective, dividerBefore: true }
                : perspective
            )
          : group.perspectives;
        const reportIndex = perspectives.findIndex((perspective) => perspective.id === config.afterReportId);
        const insertAt = reportIndex >= 0 ? reportIndex + 1 : perspectives.length;
        return {
          ...group,
          perspectives: [
            ...perspectives.slice(0, insertAt),
            { id: config.id, label: config.label },
            ...perspectives.slice(insertAt),
          ],
        };
      });
    }

    return base;
  }, [clientScope.groups, clientScope.key, hasPerspectiveRestrictions, portalAccess?.allowedPerspectiveIds, redesignActive]);

  const min = data.settings.minimumSegmentSize;
  const curR = useMemo(() => data.respondents.filter((r) => r.campaignLabel === current), [data.respondents, current]);
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const hiddenDimensionIds = useMemo(
    () => new Set(mergeHiddenDimensionIds(data.settings.hiddenDimensionIds ?? [])),
    [data.settings.hiddenDimensionIds]
  );
  const openTextFields = useMemo(
    () =>
      (clientScope.openTextFields ?? OPEN_TEXT_FIELDS).filter(
        (field) => !("dimensionId" in field && field.dimensionId) || !hiddenDimensionIds.has(field.dimensionId as string)
      ),
    [clientScope, hiddenDimensionIds]
  );

  const locationOpts = useMemo(
    () => uniq(curR, "location", min).filter(isKnownBrandSegment),
    [curR, min]
  );
  const employmentOpts = useMemo(() => uniq(curR, "fieldCategory", min), [curR, min]);
  const workTypeOpts = employmentOpts;
  const generationOpts = useMemo(() => uniq(curR, "generation", min), [curR, min]);
  const roleOpts = useMemo(() => uniq(curR, "role", min), [curR, min]);
  const tenureOpts = useMemo(() => uniq(curR, "tenure", min), [curR, min]);
  const deptOpts = useMemo(() => uniq(curR, "department", min), [curR, min]);
  const jobCategoryOpts = useMemo(() => uniq(curR, "fieldCategory", min), [curR, min]);
  const divisionOpts = useMemo(
    () =>
      uniq(curR, "division", min).filter(
        (value) => value.trim() && !value.toLowerCase().includes("unknown")
      ),
    [curR, min]
  );
  const isFieldScope = clientScope.key === "dws-field";
  // Index-rail report/comparison layout: enabled whenever redesign shell is on.
  const useIndexRailLayout = redesignActive;
  // Field-only score scale (50–75). Other dashboards keep the default 60–85 scale.
  const reportScaleOption = isFieldScope ? FIELD_REPORT_SCALE : undefined;
  const eeScale = isFieldScope ? FIELD_RAW_SCALE : EE;

  const supCurFiltered = useMemo(() => filterR(curR, supFilters), [curR, supFilters]);
  const supOpts = useMemo(() => uniq(supCurFiltered, "supervisor", min), [supCurFiltered, min]);
  const deptScores = useMemo(() => {
    const m: Record<string, number> = {};
    deptOpts.forEach((d) => { m[d] = groupScore(curR.filter((r) => r.department === d), allIds); });
    return m;
  }, [deptOpts, curR, allIds]);
  const supScores = useMemo(() => {
    const m: Record<string, number> = {};
    supOpts.forEach((s) => { m[s] = groupScore(supCurFiltered.filter((r) => r.supervisor === s), allIds); });
    return m;
  }, [supOpts, supCurFiltered, allIds]);

  const groupDef = availableGroups.find((g) => g.id === activeGroup) ?? availableGroups[0];
  const campaignResultsData = useMemo(
    () => ({
      ...data,
      respondents: data.respondents.filter(
        (respondent) =>
          (!execLocation || respondent.location === execLocation) &&
          (!execEmployment || respondent.fieldCategory === execEmployment) &&
          (!execGeneration || respondent.generation === execGeneration) &&
          (!execRole || respondent.role === execRole) &&
          (!execTenure || respondent.tenure === execTenure) &&
          (!execDepartment || respondent.department === execDepartment) &&
          (!execJobCategory || respondent.fieldCategory === execJobCategory)
      ),
    }),
    [data, execLocation, execEmployment, execGeneration, execRole, execTenure, execDepartment, execJobCategory]
  );
  const campaignResultsBundle = useMemo(
    () => buildEmployeeExperienceReportBundle(campaignResultsData, { logoUrl, campaignLabel: current, scale: reportScaleOption }),
    [campaignResultsData, logoUrl, current, reportScaleOption]
  );
  const reportBundle = useMemo(
    () =>
      buildEmployeeExperienceReportBundle(data, {
        logoUrl,
        campaignLabel: current,
        scale: reportScaleOption,
        // DWS office Supervisor report shows only the Supervisor index.
        supervisorSingleIndex: clientScope.key === "dws",
      }),
    [data, logoUrl, current, reportScaleOption, clientScope.key]
  );
  // AutoSEP partner respondents are excluded from `data` org-wide; this bundle is built
  // solely from the carried partner set for the dedicated AutoSEP report. Minimum segment
  // size is relaxed to 1 since the client explicitly wants AutoSEP's individual results.
  const autosepBundle = useMemo(
    () =>
      buildEmployeeExperienceReportBundle(
        {
          ...data,
          respondents: data.partnerRespondents ?? [],
          settings: { ...data.settings, minimumSegmentSize: 1 },
        },
        { logoUrl, campaignLabel: current, scale: reportScaleOption }
      ),
    [data, logoUrl, current, reportScaleOption]
  );
  // Segment Breakdown data is heavy and only one is visible at a time, so it is
  // computed on demand for the active breakdown perspective only (never baked
  // into the shared bundles). Returns null for every non-breakdown perspective.
  const activeBreakdown = useMemo(() => {
    const options = { logoUrl, campaignLabel: current, scale: reportScaleOption };
    // Scope-specific segment dimensions for breakdown pages.
    const dims =
      clientScope.key === "dws"
        ? OFFICE_BREAKDOWN_DIMENSIONS
        : clientScope.key === "csg"
          ? CSG_BREAKDOWN_DIMENSIONS
          : undefined;
    switch (activePersp) {
      case "ee-segment-breakdown":
        return projectBreakdownSet(data, options, "basin", dims);
      case "ee-division-breakdown":
        return projectBreakdownSet(data, options, "division", dims);
      case "ee-department-breakdown":
        return projectBreakdownSet(data, options, "department", dims);
      case "ee-role-breakdown":
        return projectBreakdownSet(data, options, clientScope.key === "dws" ? "leadership" : "jobCategory", dims);
      case "ee-supervisor-breakdown":
        return projectBreakdownSet(data, options, "supervisor", dims);
      case "ee-autosep-breakdown":
        return projectBreakdownSet(
          {
            ...data,
            respondents: data.partnerRespondents ?? [],
            settings: { ...data.settings, minimumSegmentSize: 1 },
          },
          options,
          "autosep"
        );
      default:
        return null;
    }
  }, [activePersp, data, logoUrl, current, reportScaleOption, clientScope.key]);
  const execBrandFilteredData = useMemo(
    () => ({
      ...data,
      respondents: data.respondents.filter(
        (respondent) => !execLocation || respondent.location === execLocation
      ),
    }),
    [data, execLocation]
  );
  const execBrandFilteredBundle = useMemo(
    () => buildEmployeeExperienceReportBundle(execBrandFilteredData, { logoUrl, campaignLabel: current, scale: reportScaleOption }),
    [execBrandFilteredData, logoUrl, current, reportScaleOption]
  );
  const historyFilteredBundle = useMemo(
    () =>
      buildEmployeeExperienceReportBundle(
        {
          ...data,
          respondents: data.respondents.filter(
            (respondent) =>
              (!execLocation || respondent.location === execLocation) &&
              (!execDivision || respondent.division === execDivision)
          ),
        },
        { logoUrl, campaignLabel: current, scale: reportScaleOption }
      ),
    [data, logoUrl, current, execLocation, execDivision, reportScaleOption]
  );
  const supervisorComparisonData = useMemo(
    () => ({
      ...data,
      respondents: data.respondents.filter(
        (respondent) =>
          (!execLocation || respondent.location === execLocation) &&
          (!execSupervisorDepartment || respondent.department === execSupervisorDepartment) &&
          (!execSupervisorJobCategory || respondent.fieldCategory === execSupervisorJobCategory)
      ),
    }),
    [data, execLocation, execSupervisorDepartment, execSupervisorJobCategory]
  );
  const supervisorComparisonReport = useMemo(
    () => projectSupervisorReportData(supervisorComparisonData, { logoUrl, campaignLabel: current, scale: reportScaleOption }),
    [supervisorComparisonData, logoUrl, current, reportScaleOption]
  );
  const hrSupervisorData = useMemo(
    () => ({
      ...data,
      respondents: data.respondents.filter(
        (respondent) =>
          (!supFilters.location || respondent.location === supFilters.location) &&
          (!supFilters.department || respondent.department === supFilters.department)
      ),
    }),
    [data, supFilters.department, supFilters.location]
  );
  const hrSupervisorReport = useMemo(
    () => projectSupervisorReportData(hrSupervisorData, { logoUrl, campaignLabel: current, scale: reportScaleOption }),
    [hrSupervisorData, logoUrl, current, reportScaleOption]
  );
  const brandEnpsData = useMemo(
    () => ({
      ...data,
      respondents: data.respondents.filter(
        (respondent) => !execLocation || respondent.location === execLocation
      ),
    }),
    [data, execLocation]
  );
  const brandEnpsReport = useMemo(
    () => projectEnpsReportData(brandEnpsData, { logoUrl, campaignLabel: current, scale: reportScaleOption }),
    [brandEnpsData, logoUrl, current, reportScaleOption]
  );
  const executiveIndexes = useMemo(
    () => reportBundle.campaignResults.indexes.map((index) => ({ id: index.id, name: index.name })),
    [reportBundle]
  );
  const executiveComparisons = reportBundle.campaignResults.comparisons;
  const derivedExecCompId = executiveComparisons.find((comparison) => comparison.label === prior)?.id;
  const activeExecCompId = execCompId || derivedExecCompId || defaultComparisonId(executiveComparisons);
  const activeExecIndexId = execIndexId;
  const filterOptionsByAllowedValues = (
    options: string[],
    perspectiveIds: string[],
    fieldAliases: readonly string[]
  ) => {
    const allowedValues = resolveAllowedValuesForPerspective(
      portalAccess,
      perspectiveIds,
      [...fieldAliases]
    );
    if (allowedValues.length === 0) {
      return options;
    }
    const allowedByExact = new Set(allowedValues);
    const allowedByLower = new Set(allowedValues.map((value) => value.toLowerCase()));
    return options.filter(
      (option) => allowedByExact.has(option) || allowedByLower.has(option.toLowerCase())
    );
  };
  const brandLocations = useMemo(
    () => filterOptionsByAllowedValues(locationOpts, [activePersp], BRAND_FIELD_ALIASES),
    [locationOpts, activePersp, portalAccess]
  );
  const departmentReportBrandOptions = useMemo(
    () =>
      filterOptionsByAllowedValues(
        locationOpts,
        ["ee-unit-department-report"],
        BRAND_FIELD_ALIASES
      ),
    [locationOpts, portalAccess]
  );
  const brandReportUnitOptions = useMemo(
    () => filterOptionsByAllowedValues(locationOpts, ["ee-brand-report"], BRAND_FIELD_ALIASES),
    [locationOpts, portalAccess]
  );
  const activeDepartmentIndex = activeExecIndexId
    ? reportBundle.departmentComparison.indexes.find((index) => index.id === activeExecIndexId)
    : undefined;
  const activeBrandIndex = activeExecIndexId
    ? reportBundle.locationComparison.indexes.find((index) => index.id === activeExecIndexId)
    : undefined;
  const showExecutiveBrandFilter =
    activePersp === "ee-enps" && activeGroup === clientScope.brandGroupId
      ? true
      : !clientScope.executiveWithoutBrandFilter.has(activePersp);

  useEffect(() => {
    if (availableGroups.length === 0) {
      return;
    }

    const nextGroup =
      availableGroups.find((group) => group.id === activeGroup) ?? availableGroups[0];
    if (!nextGroup) {
      return;
    }

    if (nextGroup.id !== activeGroup) {
      setActiveGroup(nextGroup.id as GroupId);
    }

    const perspectiveAllowed = nextGroup.perspectives.some(
      (perspective) => perspective.id === activePersp
    );
    if (!perspectiveAllowed) {
      setActivePersp(nextGroup.perspectives[0].id as PerspectiveId);
    }
  }, [availableGroups, activeGroup, activePersp]);

  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (deepLinkAppliedRef.current || !searchParams || availableGroups.length === 0) return;

    const perspectiveParam = searchParams.get("perspective");
    const campaignParam = searchParams.get("campaign");
    const priorParam = searchParams.get("prior");
    const locationParam = searchParams.get("location");
    const departmentParam = searchParams.get("department");
    const indexParam = searchParams.get("index");
    const brandParam = searchParams.get("brand");
    const supervisorParam = searchParams.get("supervisor");

    const hasDeepLink = Boolean(
      perspectiveParam ||
        campaignParam ||
        priorParam ||
        locationParam ||
        departmentParam ||
        indexParam ||
        brandParam ||
        supervisorParam
    );
    if (!hasDeepLink) {
      deepLinkAppliedRef.current = true;
      return;
    }

    if (perspectiveParam) {
      for (const group of availableGroups) {
        if (group.perspectives.some((perspective) => perspective.id === perspectiveParam)) {
          setActiveGroup(group.id as GroupId);
          setActivePersp(perspectiveParam as PerspectiveId);
          break;
        }
      }
    }

    if (campaignParam) {
      const match = data.meta.campaigns.find(
        (campaign) => campaign.toLowerCase() === campaignParam.toLowerCase()
      );
      if (match) setCurrent(match);
    }
    if (priorParam) {
      const match = data.meta.campaigns.find(
        (campaign) => campaign.toLowerCase() === priorParam.toLowerCase()
      );
      if (match) setPrior(match);
    }
    if (locationParam) {
      setExecLocation(locationParam);
      setIdxFilters((prev) => ({ ...prev, location: locationParam }));
      setHrRankFilters((prev) => ({ ...prev, location: locationParam }));
      setDepartmentReportBrand(locationParam);
    }
    if (departmentParam) {
      setExecDepartment(departmentParam);
      setSelectedDept(departmentParam);
      setSupFilters((prev) => ({ ...prev, department: departmentParam }));
      setExecComparisonDepartment(departmentParam);
    }
    if (indexParam) {
      setSelectedDim(indexParam);
      setExecIndexId(indexParam);
    }
    if (brandParam) {
      setOpenTextBrand(brandParam);
    }
    if (supervisorParam) {
      setSelectedSup(supervisorParam);
    }

    deepLinkAppliedRef.current = true;
  }, [availableGroups, data.meta.campaigns, searchParams]);

  useEffect(() => {
    const preferredCurrent = resolvePreferredCampaign(data.meta.campaigns, PREFERRED_CURRENT_CAMPAIGN);
    if (!current || !data.meta.campaigns.includes(current)) {
      setCurrent(preferredCurrent);
    }
  }, [current, data.meta.campaigns]);

  useEffect(() => {
    const preferredPrior = data.meta.campaigns.find((campaign) => campaign.toLowerCase() === PREFERRED_PRIOR_CAMPAIGN.toLowerCase());
    const fallbackPrior = preferredPrior && preferredPrior !== current
      ? preferredPrior
      : [...data.meta.campaigns].reverse().find((campaign) => campaign !== current) ?? "";
    if (!prior || prior === current || !data.meta.campaigns.includes(prior)) {
      setPrior(fallbackPrior);
    }
  }, [current, data.meta.campaigns, prior]);

  useEffect(() => {
    if (derivedExecCompId && execCompId !== derivedExecCompId) {
      setExecCompId(derivedExecCompId);
    }
  }, [derivedExecCompId, execCompId]);

  useEffect(() => {
    if (activePersp !== "ee-enps" || activeGroup !== clientScope.brandGroupId) return;
    if (execLocation || brandLocations.length === 0) return;
    setExecLocation(brandLocations[0]);
  }, [activePersp, activeGroup, clientScope.brandGroupId, execLocation, brandLocations]);

  useEffect(() => {
    const hasOption = (options: string[], value: string) =>
      options.some((option) => option === value || option.toLowerCase() === value.toLowerCase());
    if (
      departmentReportBrand &&
      !hasOption(departmentReportBrandOptions, departmentReportBrand)
    ) {
      setDepartmentReportBrand(departmentReportBrandOptions[0] ?? "");
    }
    if (execLocation && !hasOption(brandLocations, execLocation)) {
      setExecLocation(brandLocations[0] ?? "");
    }
    if (idxFilters.location && !hasOption(brandLocations, idxFilters.location)) {
      setIdxFilters((prev) => ({ ...prev, location: brandLocations[0] ?? "" }));
    }
    if (supFilters.location && !hasOption(brandLocations, supFilters.location)) {
      setSupFilters((prev) => ({ ...prev, location: brandLocations[0] ?? "" }));
    }
    if (openTextBrand && !hasOption(brandLocations, openTextBrand)) {
      setOpenTextBrand(brandLocations[0] ?? "");
    }
  }, [
    departmentReportBrand,
    departmentReportBrandOptions,
    execLocation,
    brandLocations,
    idxFilters.location,
    supFilters.location,
    openTextBrand,
  ]);

  // Filter control that renders as a select (fixed rail) or a fully visible
  // pill-button row (redesign pilot's embedded Filters tab) — see FilterField.
  function FilterField({
    embedded,
    title,
    value,
    onChange,
    options,
    allLabel,
    disabled,
  }: {
    embedded: boolean;
    title: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    allLabel: string;
    disabled?: boolean;
  }) {
    if (embedded) {
      return (
        <EmbeddedFilterCard title={title}>
          <PillOptionRow
            value={value}
            onChange={onChange}
            options={[{ id: "", label: allLabel }, ...options.map((item) => ({ id: item, label: item }))]}
          />
        </EmbeddedFilterCard>
      );
    }
    return (
      <RailSection title={title}>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-[11px] border border-[#D4DAD6] bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#152238] focus:border-[#8798AA] focus:outline-none"
        >
          <option value="">{allLabel}</option>
          {options.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </RailSection>
    );
  }

  const buildExtraSections = (embedded: boolean) =>
    activePersp === "ee-campaign-results" ? (
      isFieldScope ? (
        <>
          <FilterField embedded={embedded} title="Department" value={execDepartment} onChange={setExecDepartment} options={deptOpts} allLabel="All departments" />
          <FilterField embedded={embedded} title="Job Category" value={execJobCategory} onChange={setExecJobCategory} options={jobCategoryOpts} allLabel="All job categories" />
          {roleOpts.length > 0 ? (
            <FilterField embedded={embedded} title="Role" value={execRole} onChange={setExecRole} options={roleOpts} allLabel="All roles" />
          ) : null}
          <FilterField embedded={embedded} title="Tenure" value={execTenure} onChange={setExecTenure} options={tenureOpts} allLabel="All tenures" />
        </>
      ) : (
        <>
          <FilterField embedded={embedded} title="Employment" value={execEmployment} onChange={setExecEmployment} options={employmentOpts} allLabel="All employment" />
          <FilterField embedded={embedded} title="Department" value={execDepartment} onChange={setExecDepartment} options={deptOpts} allLabel="All departments" />
          <FilterField
            embedded={embedded}
            title={clientScope.jobCategoryLabel}
            value={execJobCategory}
            onChange={setExecJobCategory}
            options={jobCategoryOpts}
            allLabel={clientScope.key === "dws" ? "All roles" : "All job categories"}
          />
          <FilterField embedded={embedded} title="Generation" value={execGeneration} onChange={setExecGeneration} options={generationOpts} allLabel="All generations" />
        </>
      )
    ) : (activePersp === "ee-department-comparison" || activePersp === "ee-role-comparison") ? (
      <>
        {activePersp === "ee-department-comparison" ? (
          <>
            <FilterField embedded={embedded} title="Job Category" value={execComparisonJobCategory} onChange={setExecComparisonJobCategory} options={jobCategoryOpts} allLabel="All job categories" />
            <FilterField embedded={embedded} title="Department" value={execComparisonDepartment} onChange={setExecComparisonDepartment} options={deptOpts} allLabel="All departments" />
          </>
        ) : null}
        <RailSection title="Statement">
          <select
            value={execDeptStatementId}
            onChange={(event) => setExecDeptStatementId(event.target.value)}
            disabled={!activeExecIndexId}
            className="w-full rounded-[11px] border border-[#D4DAD6] bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#152238] focus:border-[#8798AA] focus:outline-none"
          >
            <option value={COMPARISON_ALL}>Index average (all statements)</option>
            {activeDepartmentIndex?.statements.map((statement) => (
              <option key={statement.id} value={statement.id}>{statement.text}</option>
            ))}
          </select>
        </RailSection>
      </>
    ) : activePersp === "ee-location-comparison" ? (
      // Basin Comparison (redesign): no statement drill-down here — the index
      // rail beside the chart already picks the index, and a per-statement
      // filter just adds a control nobody needs on a page whose whole point
      // is comparing basins at a glance. The legacy (non-embedded) rail keeps
      // it for other clients/layouts that haven't asked for this yet.
      embedded ? null : (
        <RailSection title="Statement">
          <select
            value={execBrandStatementId}
            onChange={(event) => setExecBrandStatementId(event.target.value)}
            disabled={!activeExecIndexId}
            className="w-full rounded-[11px] border border-[#D4DAD6] bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#152238] focus:border-[#8798AA] focus:outline-none"
          >
            <option value={COMPARISON_ALL}>Index average (all statements)</option>
            {activeBrandIndex?.statements.map((statement) => (
              <option key={statement.id} value={statement.id}>{statement.text}</option>
            ))}
          </select>
        </RailSection>
      )
    ) : activePersp === "ee-division-comparison" ? (
      <RailSection title="Statement">
        <select
          value={execBrandStatementId}
          onChange={(event) => setExecBrandStatementId(event.target.value)}
          disabled={!activeExecIndexId}
          className="w-full rounded-[11px] border border-[#D4DAD6] bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#152238] focus:border-[#8798AA] focus:outline-none"
        >
          <option value={COMPARISON_ALL}>Index average (all statements)</option>
          {activeBrandIndex?.statements.map((statement) => (
            <option key={statement.id} value={statement.id}>{statement.text}</option>
          ))}
        </select>
      </RailSection>
    ) : activePersp === "ee-historical-report" && divisionOpts.length > 0 ? (
      <FilterField
        embedded={embedded}
        title="Division"
        value={execDivision}
        onChange={setExecDivision}
        options={divisionOpts}
        allLabel="All divisions"
      />
    ) : activePersp === "ee-supervisor-comparison" ? (
      <>
        <FilterField embedded={embedded} title="Department" value={execSupervisorDepartment} onChange={setExecSupervisorDepartment} options={deptOpts} allLabel="All departments" />
        <FilterField
          embedded={embedded}
          title={clientScope.jobCategoryLabel}
          value={execSupervisorJobCategory}
          onChange={setExecSupervisorJobCategory}
          options={jobCategoryOpts}
          allLabel={clientScope.key === "dws" ? "All roles" : "All job categories"}
        />
      </>
    ) : null;

  const renderExecutiveRail = (embedded = false) => clientScope.executivePerspectives.has(activePersp) ? (
    <EEExecutiveRail
      embedded={embedded}
      logoUrl={logoUrl}
      clientName={data.meta.organizationName}
      perspectiveTitle={clientScope.executiveTitles[activePersp]}
      campaigns={data.meta.campaigns}
      current={current}
      prior={prior}
      onCurrent={setCurrent}
      onPrior={setPrior}
      comparisons={executiveComparisons}
      compId={activeExecCompId}
      onCompId={setExecCompId}
      indexes={executiveIndexes}
      indexId={activeExecIndexId}
      onIndexId={setExecIndexId}
      showIndexSection={!clientScope.executiveWithoutIndexFilter.has(activePersp)}
      includeAllIndexOption
      defaultOpenBrandSection={activePersp === "ee-enps" && activeGroup === clientScope.brandGroupId}
      locations={showExecutiveBrandFilter ? brandLocations : []}
      location={execLocation}
      onLocation={setExecLocation}
      brandLabel={clientScope.brandLabel}
      extraSections={buildExtraSections(embedded)}
    />
  ) : null;
  const executiveRail = renderExecutiveRail(false);

  const singleCampaign = data.meta.campaigns.length <= 1;
  const perspectiveHowToRead: Record<PerspectiveId, string> = {
    "exec-overview": singleCampaign
      ? "The center wheel and statement list summarize campaign performance for the current survey."
      : "The center wheel and statement list summarize campaign performance. Use Current and Compared To in the left rail to evaluate movement.",
    "exec-location":
      clientScope.showDivisionHeatmap && clientScope.showLeadershipHeatmap
        ? `Heat maps show scores by division, ${clientScope.brandLabel.toLowerCase()}, department, and ${clientScope.jobCategoryLabel.toLowerCase()}. Compare row totals to identify where strengths and watch areas concentrate.`
        : `Heat maps show scores by ${clientScope.brandLabel.toLowerCase()} and department. Compare row totals to identify where strengths and watch areas concentrate.`,
    "ee-campaign-results": "Use Detailed Results filters in the left rail to investigate index and statement movement for specific groups. Green indicates positive movement and red indicates decline.",
    "ee-department-comparison": singleCampaign
      ? "Each bar shows a department score for the selected index or statement. The dashed line marks the company average."
      : "Each bar shows a department score for the selected index or statement. Delta compares against the selected comparison campaign.",
    "ee-role-comparison": singleCampaign
      ? "Each bar shows a role score for the selected index or statement. The dashed line marks the company average."
      : "Each bar shows a leadership role score for the selected index or statement. Delta compares against the selected comparison campaign.",
    "ee-location-comparison": singleCampaign
      ? `Each row is a ${clientScope.brandLabel.toLowerCase()} for the selected index or statement. The dashed line marks the company average.`
      : `Each row is a ${clientScope.brandLabel.toLowerCase()} for the selected index or statement. Delta compares against the selected comparison campaign.`,
    "ee-division-comparison": "Each row is a division for the selected index or statement. Delta compares against the selected comparison campaign.",
    "ee-division-report": "This report compares each division to organization averages by statement and index across selected campaigns.",
    "ee-supervisor-comparison": "Supervisor index only. Top chart ranks supervisor current scores, and the heat map shows statement-level current scores by supervisor.",
    "ee-historical-report": singleCampaign
      ? "Statement-level favorability for the current survey."
      : "Trend and table views show campaign movement over time. Delta Last compares the selected Current campaign to the Compared To campaign.",
    "ee-enps":
      "ENPS is shown as promoter minus detractor percentage points. For score interpretation in this dashboard, 9-10 is Goal, 7-8 is Acceptable, and 0-6 is Unacceptable.",
    "hr-index-dive": `Select an index to inspect statement-level scores and ${clientScope.brandLabel.toLowerCase()} distribution. Use filters to isolate ${clientScope.brandLabel.toLowerCase()} and work-type patterns.`,
    "hr-supervisor": "Bars show supervisor scores by statement. The org marker indicates company average for each statement.",
    "hr-open-text": `Open text responses are grouped by question type and can be filtered by ${clientScope.brandLabel.toLowerCase()} to isolate themes and language patterns.`,
    "dept-scorecard": "Scorecards summarize department performance, statement strengths, and focus areas with demographic cuts.",
    "ee-brand-report": `This report compares each ${clientScope.brandLabel.toLowerCase()} to organization averages by statement and index across selected campaigns.`,
    "ee-brand-open-text": `Open text responses are grouped by question type and can be filtered by ${clientScope.brandLabel.toLowerCase()} to isolate themes and language patterns.`,
    "ee-segment-breakdown": `Select an index on the rail to re-score the funnel and heatmap below for every ${clientScope.jobCategoryLabel.toLowerCase()} in the selected ${clientScope.brandLabel.toLowerCase()}.`,
    "ee-division-breakdown": "Pick a division, then select an index to re-score the sub-segment funnel and statement heatmap within it.",
    "ee-department-breakdown": "Pick a department, then select an index to re-score the sub-segment funnel and statement heatmap within it.",
    "ee-role-breakdown": `Pick a ${clientScope.jobCategoryLabel.toLowerCase()}, then select an index to re-score the sub-segment funnel and statement heatmap within it.`,
    "ee-supervisor-breakdown": "Pick a supervisor, then select an index to re-score the sub-segment funnel and statement heatmap within their team.",
    "ee-autosep-breakdown": "Select an index to re-score the sub-segment funnel and statement heatmap for the AutoSEP population.",
    "ee-department-report": `This report compares each ${clientScope.jobCategoryLabel.toLowerCase()} to organization averages by statement and index across selected campaigns.`,
    "ee-unit-department-report": "This report compares each department to organization averages by statement and index across selected campaigns.",
    "ee-autosep-report": "This report covers the AutoSEP partner designation only. AutoSEP is excluded from all other reports and organization-wide scores.",
  };
  const isEnpsPerspective = activePersp === "ee-enps";
  const enpsDescriptorText =
    "ENPS is promoter minus detractor percentage points. For this dashboard's score interpretation: 9-10 is Goal, 7-8 is Acceptable, and 0-6 is Unacceptable.";
  const enpsScoreLegendGradient =
    "linear-gradient(90deg,#C8B9B6 0%,#C8B9B6 70%,#DCE8F8 70%,#DCE8F8 90%,#8EA9CC 90%,#8EA9CC 100%)";
  const dashboardScoreLegendGradient =
    "linear-gradient(90deg, #D7B35A 0%, #FFFFFF 50%, #3F5F86 100%)";
  const enpsScoreLegendBands = (
    <div className="space-y-1 text-[10.5px] font-semibold text-[#6E7E96]">
      <p>0-6 Unacceptable</p>
      <p>7-8 Acceptable</p>
      <p>9-10 Goal</p>
    </div>
  );

  const fixedInfoRail = (
    <aside className="hidden xl:block" style={EE_GUIDANCE_RAIL_STYLE}>
      <div className="flex h-full flex-col gap-4 p-6">
        <EEContextRail
          howToRead={perspectiveHowToRead[activePersp]}
          scale={reportScaleOption}
          scoreLegendLabel={isEnpsPerspective ? "ENPS Score Bands" : "Score Scale (Yellow-Blue)"}
          scoreLegendGradient={isEnpsPerspective ? enpsScoreLegendGradient : dashboardScoreLegendGradient}
          scoreLegendMinLabel={isEnpsPerspective ? "0" : undefined}
          scoreLegendMaxLabel={isEnpsPerspective ? "10" : undefined}
          scoreLegendBands={isEnpsPerspective ? enpsScoreLegendBands : undefined}
        />
        {dashboardInstanceId ? (
          <GuidancePinRail
            dashboardInstanceId={dashboardInstanceId}
            perspectiveId={activePersp}
            campaignLabel={current}
            filterKey={[
              activeExecIndexId || "all-indexes",
              activeExecCompId || "default-comp",
              execLocation || "all-brands",
              execDeptStatementId || COMPARISON_ALL,
              execBrandStatementId || COMPARISON_ALL,
            ].join("|")}
            canEdit={canEditGuidance}
          />
        ) : null}
      </div>
    </aside>
  );

  const canvasInfoRail = (
    <div className="flex flex-col gap-4 p-2">
      <EEContextRail
        howToRead={perspectiveHowToRead[activePersp]}
        compact
        scale={reportScaleOption}
        scoreLegendLabel={isEnpsPerspective ? "ENPS Score Bands" : "Score Scale (Yellow-Blue)"}
        scoreLegendGradient={isEnpsPerspective ? enpsScoreLegendGradient : dashboardScoreLegendGradient}
        scoreLegendMinLabel={isEnpsPerspective ? "0" : undefined}
        scoreLegendMaxLabel={isEnpsPerspective ? "10" : undefined}
        scoreLegendBands={isEnpsPerspective ? enpsScoreLegendBands : undefined}
      />
      {dashboardInstanceId ? (
        <GuidancePinRail
          dashboardInstanceId={dashboardInstanceId}
          perspectiveId={activePersp}
          campaignLabel={current}
          filterKey={[
            activeExecIndexId || "all-indexes",
            activeExecCompId || "default-comp",
            execLocation || "all-brands",
            execDeptStatementId || COMPARISON_ALL,
            execBrandStatementId || COMPARISON_ALL,
          ].join("|")}
          canEdit={canEditGuidance}
        />
      ) : null}
    </div>
  );

  function onGroupChange(gid: string) {
    const g = availableGroups.find((x) => x.id === gid) ?? availableGroups[0];
    if (!g) return;
    setActiveGroup(g.id);
    setActivePersp(g.perspectives[0].id as PerspectiveId);
  }

  // ── Left Rail ──────────────────────────────────────────────────────────────

  const leftRail = (
    <LRail>
      <div className="rounded-[18px] bg-white p-4 text-center shadow-[0_2px_8px_rgba(15,23,42,.07)]" style={{ border: "1px solid #8798AA" }}>
        <ClientMark client={{ name: data.meta.organizationName, logoUrl }} />
        <div className="mt-3 font-bold uppercase" style={{ fontSize: 11.5, letterSpacing: "0.1em", color: "#152238" }}>
          {clientScope.executiveTitles[activePersp]}
        </div>
      </div>

      <CampaignRail
        campaigns={data.meta.campaigns}
        current={current}
        prior={prior}
        onCurrent={setCurrent}
        onPrior={setPrior}
      />

      {/* Filters */}
      {(activePersp === "hr-index-dive") && (
        <FilterRail
          filters={[
            { id: "location", label: clientScope.brandLabel, value: idxFilters.location, options: brandLocations },
            { id: "fieldCategory", label: clientScope.jobCategoryLabel, value: idxFilters.fieldCategory, options: workTypeOpts },
          ]}
          onChange={(id, v) => setIdxFilters((f) => ({ ...f, [id]: v }))}
          onReset={() => setIdxFilters({ location: "", fieldCategory: "" })}
        />
      )}
      {(activePersp === "hr-supervisor") && (
        <FilterRail
          filters={[
            { id: "location", label: clientScope.brandLabel, value: supFilters.location, options: brandLocations },
            { id: "department", label: "Department", value: supFilters.department, options: deptOpts },
          ]}
          onChange={(id, v) => setSupFilters((f) => ({ ...f, [id]: v }))}
          onReset={() => setSupFilters({ location: "", department: "" })}
        />
      )}

      {/* Dimension selector (Index Deep Dive) */}
      {activePersp === "hr-index-dive" && (
        <RailSection title="Index">
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setSelectedDim("")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition
                  ${!selectedDim ? "bg-nsp-blue-50 font-semibold text-nsp-blue-700" : "font-medium text-text-secondary hover:bg-surface-2"}`}
            >
              All indexes
              {!selectedDim && <ChevronRight className="h-4 w-4 text-nsp-blue-400" />}
            </button>
            {dimensionOptions.map((d) => (
              <button
                key={d} type="button" onClick={() => setSelectedDim(d)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition
                  ${selectedDim === d ? "bg-nsp-blue-50 font-semibold text-nsp-blue-700" : "font-medium text-text-secondary hover:bg-surface-2"}`}
              >
                {d}
                {selectedDim === d && <ChevronRight className="h-4 w-4 text-nsp-blue-400" />}
              </button>
            ))}
          </div>
        </RailSection>
      )}

      {/* Focus: Supervisor selector */}
      {activePersp === "hr-supervisor" && supOpts.length > 0 && (
        <RailSection title="Focus">
          <div>
            <span className="text-xs font-medium text-text-secondary">Supervisor</span>
            <select
              value={selectedSup || supOpts[0] || ""}
              onChange={(e) => setSelectedSup(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none"
            >
              {supOpts.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </RailSection>
      )}

      {/* Focus: Open Text */}
      {(activePersp === "hr-open-text" || activePersp === "ee-brand-open-text") && (
        <RailSection title="Focus">
          <div className="space-y-3">
            {activePersp === "hr-open-text" ? (
              <div>
                <span className="text-xs font-medium text-text-secondary">Question Type</span>
                <select
                  value={openTextField}
                  onChange={(e) => setOpenTextField(e.target.value as OpenTextField)}
                  className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none"
                >
                  {openTextFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            ) : null}
            <div>
              <span className="text-xs font-medium text-text-secondary">Brand / Location</span>
              <select value={openTextBrand} onChange={(e) => setOpenTextBrand(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none">
                <option value="">All Brands</option>
                {brandLocations.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </div>
          </div>
        </RailSection>
      )}

      {/* Focus: Department scorecard selector */}
      {activePersp === "dept-scorecard" && deptOpts.length > 0 && (
        <RailSection title="Focus">
          <div>
            <span className="text-xs font-medium text-text-secondary">Department</span>
            <select
              value={selectedDept || deptOpts[0] || ""}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none"
            >
              {deptOpts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </RailSection>
      )}
    </LRail>
  );

  const content = useMemo(() => {
    if (availableGroups.length === 0) {
      return (
        <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
          <main className="flex flex-col gap-5" style={EE_PERSPECTIVE_MAIN_STYLE}>
            <div
              className="rounded-2xl border border-[#8798AA] bg-white px-6 py-10 text-sm text-[#6E7E96]"
              style={{ maxWidth: 1320, margin: "0 auto", width: "100%" }}
            >
              No Employee Experience perspectives are assigned to this user.
            </div>
          </main>
        </div>
      );
    }

    switch (activePersp) {
      case "ee-campaign-results":
        return (
          <EECampaignResults
            data={campaignResultsBundle.campaignResults}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
            chromeless={redesignActive}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            // Basin surface treatment "1b" is now applied dashboard-wide
            // across every DWS Field perspective, not just the former
            // "Basin group" trio — see the shared note on ee-brand-report.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-department-comparison":
        return clientScope.key === "dws" ? (
          <EEDepartmentComparison
            data={execBrandFilteredBundle.departmentComparisonByDepartment}
            benchmarkLabel={clientScope.benchmarkLabel}
            title="Department Comparison"
            primaryLabel="Department"
            primaryFilterValue={execComparisonDepartment}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
            statementId={execDeptStatementId}
            onStatementId={setExecDeptStatementId}
            fieldLayout
            compact
            showStatementHeatmap={false}
            chromeless={redesignActive}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : (
          <EEDepartmentComparison
            data={execBrandFilteredBundle.departmentComparison}
            benchmarkLabel={clientScope.benchmarkLabel}
            secondaryData={execBrandFilteredBundle.departmentComparisonByDepartment}
            title="Job / Department Comparison"
            primaryLabel="Job Category"
            primaryFilterValue={execComparisonJobCategory}
            secondaryFilterValue={execComparisonDepartment}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
            statementId={execDeptStatementId}
            onStatementId={setExecDeptStatementId}
            fieldLayout={useIndexRailLayout}
            chromeless={redesignActive}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            // Basin surface treatment "1b" is now applied dashboard-wide
            // across every DWS Field perspective; this branch is also
            // reused by CSG, so the scope check keeps CSG unaffected.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-role-comparison":
        return (
          <EEDepartmentComparison
            data={clientScope.key === "dws" ? reportBundle.leadershipComparison : execBrandFilteredBundle.departmentComparison}
            benchmarkLabel={clientScope.benchmarkLabel}
            title={`${clientScope.jobCategoryLabel} Comparison`}
            primaryLabel={clientScope.jobCategoryLabel}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
            statementId={execDeptStatementId}
            onStatementId={setExecDeptStatementId}
            fieldLayout={useIndexRailLayout}
            chromeless={redesignActive}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            // Basin surface treatment "1b" is now applied dashboard-wide
            // across every DWS Field perspective; this case is also reused
            // by CSG/DWS, so the scope check keeps them unaffected.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-location-comparison":
        return (
          <EELocationComparison
            data={reportBundle.locationComparison}
            benchmarkLabel={clientScope.benchmarkLabel}
            title={`${clientScope.brandLabel} Comparison`}
            primaryLabel={clientScope.brandLabel}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
            statementId={execBrandStatementId}
            onStatementId={setExecBrandStatementId}
            fieldLayout={useIndexRailLayout}
            chromeless={redesignActive}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            // Basin group surface treatment "1b" — this is Basin Comparison
            // specifically; Division Comparison below reuses this exact
            // component but stays unaffected.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-division-comparison":
        return (
          <EELocationComparison
            data={reportBundle.divisionComparison}
            benchmarkLabel={clientScope.benchmarkLabel}
            title="Division Comparison"
            primaryLabel="Division"
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
            statementId={execBrandStatementId}
            onStatementId={setExecBrandStatementId}
            fieldLayout={useIndexRailLayout}
            chromeless={redesignActive}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-supervisor-comparison":
        return isFieldScope || clientScope.key === "dws" ? (
          <EEDepartmentComparison
            data={reportBundle.supervisorComparison}
            benchmarkLabel={clientScope.benchmarkLabel}
            title="Supervisor Comparison"
            primaryLabel="Supervisor"
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
            statementId={execDeptStatementId}
            onStatementId={setExecDeptStatementId}
            fieldLayout
            chromeless={redesignActive}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            basinReportSurface={useRedesignSurfaceTint}
            verticalHeatmapHeaders
          />
        ) : (
          <EESupervisorComparison
            data={supervisorComparisonReport}
            benchmarkLabel={clientScope.benchmarkLabel}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            chromeless={redesignActive}
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "exec-overview":
        return (
          <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
            {executiveRail}
            {/* className carries the redesign-scoped margin reset — this wrapper
                is a <div>, not <main>, so it needs its own selector (see
                .fr-embed .fr-persp-main in FieldRedesignShell). Background is
                made conditional too: this div sits three DOM levels below
                .fr-embed, past the shell's 2-level "force white/tint"
                selectors, so EE_PERSPECTIVE_MAIN_STYLE's hardcoded white
                would otherwise show through as a flat rectangle over the
                tinted canvas. */}
            <div
              className="fr-persp-main"
              style={{ ...EE_PERSPECTIVE_MAIN_STYLE, padding: 0, background: useRedesignSurfaceTint ? "#F4F4EF" : "#fff" }}
            >
              <EEHistoricalReport
                filterPersistenceKey={perspectiveFilterKey(activePersp)}
                data={reportBundle.historicalReport}
                embedded
                variant="overview"
                currentCampaignLabel={current}
                comparisonCampaignLabel={prior || undefined}
                selectedIndexId={activeExecIndexId || undefined}
                chromeless={redesignActive}
                headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
                basinReportSurface={useRedesignSurfaceTint}
              />
              
            </div>
            {fixedInfoRail}
          </div>
        );
      case "exec-location":
        return (
          <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
            {executiveRail}
            {/* <main> isn't covered by the shell's div-only "force white/tint"
                selectors, so its background is made conditional here too —
                see the matching note on the "fr-persp-main" wrapper above. */}
            <main style={{ ...EE_PERSPECTIVE_MAIN_STYLE, background: useRedesignSurfaceTint ? "#F4F4EF" : "#fff" }}>
              <ExecLocation
                data={data}
                current={current}
                prior={prior}
                locationFilter={execLocation}
                brandLabel={clientScope.brandLabel}
                jobCategoryLabel={clientScope.jobCategoryLabel}
                showDivisionHeatmap={clientScope.showDivisionHeatmap}
                showLeadershipHeatmap={clientScope.showLeadershipHeatmap}
                showJobCategoryHeatmap={clientScope.showJobCategoryHeatmap}
                showTenureHeatmap={clientScope.showTenureHeatmap}
                scale={eeScale}
                chromeless={redesignActive}
                headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
              />
            </main>
            {fixedInfoRail}
          </div>
        );
      case "ee-historical-report":
        return (
          <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
            {executiveRail}
            <div
              className="fr-persp-main"
              style={{ ...EE_PERSPECTIVE_MAIN_STYLE, padding: 0, background: useRedesignSurfaceTint ? "#F4F4EF" : "#fff" }}
            >
              <EEHistoricalReport
                filterPersistenceKey={perspectiveFilterKey(activePersp)}
                data={historyFilteredBundle.historicalReport}
                embedded
                currentCampaignLabel={current}
                comparisonCampaignLabel={prior || undefined}
                selectedIndexId={activeExecIndexId || undefined}
                chromeless={redesignActive}
                headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
                basinReportSurface={useRedesignSurfaceTint}
              />
            </div>
            {fixedInfoRail}
          </div>
        );
      case "ee-enps":
        return (
          <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
            {executiveRail}
            <div className="fr-persp-main" style={{ ...EE_PERSPECTIVE_MAIN_STYLE, padding: 0 }}>
              <EEEnpsReport
                data={activeGroup === clientScope.brandGroupId ? brandEnpsReport : reportBundle.enpsReport}
                embedded
                variant={activeGroup === clientScope.brandGroupId ? "brand" : "executive"}
                descriptorText={enpsDescriptorText}
                chromeless={redesignActive}
                headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
              />
            </div>
            {fixedInfoRail}
          </div>
        );
      case "hr-index-dive":
        return <HrIndexDive data={data} current={current} prior={prior} selectedDim={selectedDim} filters={idxFilters} />;
      case "hr-supervisor":
        // Both DWS scopes render Supervisor as a normal styled segment report
        // (all indexes, all statements, index-rail shell) — just without a
        // breakdown. CSG keeps the classic supervisor report.
        return isFieldScope || clientScope.key === "dws" ? (
          <EEDepartmentReport
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="supervisor-segment-report"
            chromeless={redesignActive}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            data={reportBundle.supervisorSegmentReport}
            benchmarkLabel={clientScope.benchmarkLabel}
            unitLabel="Supervisor"
            reportHeading="SUPERVISOR REPORT"
            enableVisualLocks={clientScope.key === "dws" ? clientScope.enableVisualLocks : false}
            fieldLayout
            compact={clientScope.key === "dws"}
            hideIndexSummary
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : (
          <EESupervisorReport
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            data={hrSupervisorReport}
            benchmarkLabel={clientScope.benchmarkLabel}
            chromeless={redesignActive}
            basinReportSurface={useRedesignSurfaceTint}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
          />
        );
      case "hr-open-text":
        return (
          <HrOpenText
            data={data}
            current={current}
            brandFilter={openTextBrand}
            fieldType={openTextField}
            fields={openTextFields}
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-brand-open-text":
        return <HrOpenText data={data} current={current} brandFilter={openTextBrand} fieldType={openTextField} fields={openTextFields} />;
      case "dept-scorecard":
        return <DeptScorecard data={data} current={current} prior={prior} selectedDept={selectedDept || deptOpts[0] || ""} />;
      case "ee-brand-report":
        return (
          <EEDepartmentReport
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key={`${clientScope.key}-brand-report`}
            chromeless={redesignActive}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            // Basin group surface treatment "1b" — shared by Basin Report,
            // Basin Breakdown, and Basin Comparison. This case is the DWS
            // Field pilot's "Basin Report" ONLY when clientScope is
            // "dws-field"; other client scopes reuse this same case for
            // their own (unaffected) Brand Report.
            basinReportSurface={useRedesignSurfaceTint}
            data={reportBundle.brandReport}
            benchmarkLabel={clientScope.benchmarkLabel}
            unitLabel={clientScope.brandLabel}
            reportHeading={`${clientScope.brandLabel.toUpperCase()} REPORT`}
            stylePreset={clientScope.key === "csg" ? "division" : "default"}
            enableVisualLocks={clientScope.enableVisualLocks}
            exportClientLabel={data.meta.organizationName}
            fieldLayout={useIndexRailLayout}
            compact={clientScope.key === "dws"}
            allowedDepartmentIds={
              brandReportUnitOptions.length > 0
                ? reportBundle.brandReport.departments
                    .filter((department) =>
                      brandReportUnitOptions.some(
                        (brand) =>
                          brand === department.name ||
                          brand.toLowerCase() === department.name.toLowerCase()
                      )
                    )
                    .map((department) => department.id)
                : undefined
            }
          />
        );
      case "ee-segment-breakdown":
        return clientScope.key === "dws-field" || clientScope.key === "dws" || clientScope.key === "csg" ? (
          <EESegmentBreakdown
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="segment-breakdown"
            data={activeBreakdown ?? []}
            unitLabel={clientScope.brandLabel}
            campaignValue={clientScope.key === "csg" ? current : undefined}
            campaignOptions={clientScope.key === "csg" ? data.meta.campaigns : undefined}
            onCampaignChange={clientScope.key === "csg" ? setCurrent : undefined}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            chromeless={redesignActive}
            // Basin surface tint is a DWS-field aesthetic only; DWS office keeps
            // the plain white surface like its other reports.
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : null;
      case "ee-division-breakdown":
        return clientScope.key === "dws" ? (
          <EESegmentBreakdown
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="division-breakdown"
            data={activeBreakdown ?? []}
            unitLabel="Division"
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            chromeless={redesignActive}
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : null;
      case "ee-department-breakdown":
        return clientScope.key === "dws-field" || clientScope.key === "dws" ? (
          <EESegmentBreakdown
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="department-breakdown"
            data={activeBreakdown ?? []}
            unitLabel="Department"
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            chromeless={redesignActive}
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : null;
      case "ee-role-breakdown":
        return clientScope.key === "dws-field" || clientScope.key === "dws" ? (
          <EESegmentBreakdown
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="role-breakdown"
            // Unit is leadership for DWS office, job category for field — resolved
            // in the `activeBreakdown` memo.
            data={activeBreakdown ?? []}
            unitLabel={clientScope.jobCategoryLabel}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            chromeless={redesignActive}
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : null;
      case "ee-supervisor-breakdown":
        return clientScope.key === "dws-field" || clientScope.key === "dws" ? (
          <EESegmentBreakdown
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="supervisor-breakdown"
            data={activeBreakdown ?? []}
            unitLabel="Supervisor"
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            chromeless={redesignActive}
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : null;
      case "ee-autosep-breakdown":
        return clientScope.key === "dws-field" ? (
          <EESegmentBreakdown
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="autosep-breakdown"
            data={activeBreakdown ?? []}
            unitLabel="AutoSEP"
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            chromeless={redesignActive}
            basinReportSurface={useRedesignSurfaceTint}
          />
        ) : null;
      case "ee-department-report":
        return (
          <EEDepartmentReport
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key={`${clientScope.key}-job-category-report`}
            chromeless={redesignActive}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            data={clientScope.key === "dws" ? reportBundle.leadershipReport : reportBundle.jobCategoryReport}
            benchmarkLabel={clientScope.benchmarkLabel}
            unitLabel={clientScope.jobCategoryLabel}
            reportHeading={`${clientScope.jobCategoryLabel.toUpperCase()} REPORT`}
            enableVisualLocks={clientScope.enableVisualLocks}
            fieldLayout={useIndexRailLayout}
            compact={clientScope.key === "dws"}
            // Basin surface treatment "1b" is now applied dashboard-wide
            // across every DWS Field perspective; this case is also reused
            // by DWS/CSG, so the scope check keeps them unaffected.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-division-report":
        return (
          <EEDepartmentReport
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="division-report"
            chromeless={redesignActive}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            data={reportBundle.divisionReport}
            benchmarkLabel={clientScope.benchmarkLabel}
            unitLabel="Division"
            reportHeading="DIVISION REPORT"
            enableVisualLocks={clientScope.enableVisualLocks}
            fieldLayout={useIndexRailLayout}
            compact={clientScope.key === "dws"}
            // Basin surface treatment "1b" is now applied dashboard-wide
            // across every DWS Field perspective; this case is also reused
            // by DWS/CSG, so the scope check keeps them unaffected.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-unit-department-report":
        return (
          <EEDepartmentReport
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="department-report"
            chromeless={redesignActive}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            data={reportBundle.departmentReport}
            allowedDepartmentIds={
              clientScope.key === "csg" && departmentReportBrand
                ? reportBundle.departmentReport.departments
                    .filter((department) => department.location === departmentReportBrand)
                    .map((department) => department.id)
                : undefined
            }
            benchmarkLabel={clientScope.benchmarkLabel}
            unitLabel="Department"
            reportHeading="DEPARTMENT REPORT"
            enableVisualLocks={clientScope.enableVisualLocks}
            fieldLayout={useIndexRailLayout}
            compact={clientScope.key === "dws"}
            // Basin surface treatment "1b" is now applied dashboard-wide
            // across every DWS Field perspective; this case is also reused
            // by DWS/CSG, so the scope check keeps them unaffected.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      case "ee-autosep-report":
        return (
          <EEDepartmentReport
            filterPersistenceKey={perspectiveFilterKey(activePersp)}
            key="autosep-report"
            chromeless={redesignActive}
            filtersPortalId={redesignActive ? FR_FILTERS_SLOT : undefined}
            headerPortalId={redesignActive ? FR_HEADER_EXTRA_SLOT : undefined}
            titleSuffixPortalId={redesignActive ? FR_TITLE_SUFFIX_SLOT : undefined}
            data={autosepBundle.departmentReport}
            benchmarkLabel={clientScope.benchmarkLabel}
            unitLabel="Department"
            reportHeading="AUTOSEP REPORT"
            enableVisualLocks={clientScope.enableVisualLocks}
            fieldLayout={clientScope.key === "dws-field"}
            // Autosep is dws-field-only (fieldLayout is only ever true for
            // that scope), so redesignActive alone is enough to scope this.
            basinReportSurface={useRedesignSurfaceTint}
          />
        );
      default: return null;
    }
  }, [activePersp, activeGroup, data, current, prior, hrRankFilters, selectedDim, idxFilters, supFilters, selectedSup, supOpts, openTextBrand, openTextField, openTextFields, selectedDept, deptOpts, jobCategoryOpts, reportBundle, autosepBundle, activeBreakdown, execBrandFilteredBundle, campaignResultsBundle, historyFilteredBundle, dashboardInstanceId, canEditGuidance, executiveRail, activeExecIndexId, activeExecCompId, execLocation, execDivision, execDeptStatementId, execBrandStatementId, execComparisonJobCategory, execComparisonDepartment, supervisorComparisonReport, hrSupervisorReport, brandEnpsReport, availableGroups.length, clientScope, enpsDescriptorText, redesignActive, departmentReportBrand, brandReportUnitOptions, departmentReportBrandOptions, brandLocations]);

  const exportFilename = buildDashboardExportFilename({
    client: clientScope.key,
    perspective: activePersp,
    campaign: current,
  });

  const useCompositeExport = true;

  // ── Layout redesign (index-rail shell) ─────────────────────────────────────
  // CSG + both DWS employee-experience scopes render in this shell.
  // DWS-field keeps its Basin surface tint; CSG + DWS office use plain white.
  if (redesignActive && (clientScope.key === "csg" || clientScope.key === "dws-field" || clientScope.key === "dws")) {
    const isOpenText = activePersp === "hr-open-text" || activePersp === "ee-brand-open-text";
    const isExecutivePersp = clientScope.executivePerspectives.has(activePersp);

    const redesignContextSlot = (
      <div className="flex flex-col gap-3">
        {/* Campaign date now lives in the left-rail identity block, under the logo. */}
        <CompositeVisualExportButton filename={exportFilename} logoUrl={logoUrl} skipGeneratedHeader asContextCard />
        <EmbeddedFilterCard title={isEnpsPerspective ? "ENPS Score Bands" : "Score Scale"}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>{isEnpsPerspective ? "0" : String(reportScaleOption?.min ?? 60)}</span>
            <div className="h-3.5 flex-1 rounded-2xl border border-[#C8D2CF]" style={{ background: isEnpsPerspective ? enpsScoreLegendGradient : dashboardScoreLegendGradient }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>{isEnpsPerspective ? "10" : String(reportScaleOption?.max ?? 85)}</span>
          </div>
          {isEnpsPerspective ? <div className="mt-2">{enpsScoreLegendBands}</div> : null}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #EEF1EE" }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8798AA", marginBottom: 8 }}>Delta</p>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>Decline</span>
              <div className="h-3.5 flex-1 rounded-2xl border border-[#C8D2CF]" style={{ background: "linear-gradient(90deg, #D46A6A 0%, #F5EFEF 50%, #59885D 100%)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>Gain</span>
            </div>
          </div>
        </EmbeddedFilterCard>
        <EmbeddedFilterCard title="How to Read">
          <p style={{ fontSize: 12, lineHeight: 1.5, color: "#3B4B63" }}>{perspectiveHowToRead[activePersp]}</p>
        </EmbeddedFilterCard>
      </div>
    );

    const redesignFiltersSlot = isExecutivePersp ? (
      renderExecutiveRail(true)
    ) : isOpenText ? (
      <div className="flex flex-col gap-4">
        {openTextFields.length > 1 ? (
          <EmbeddedFilterCard title="Question">
            <PillOptionRow
              value={openTextField}
              onChange={(value) => setOpenTextField(value as OpenTextField)}
              options={openTextFields.map((field) => ({ id: field.id, label: field.label }))}
            />
          </EmbeddedFilterCard>
        ) : null}
        <EmbeddedFilterCard title={clientScope.brandLabel}>
          <PillOptionRow
            value={openTextBrand}
            onChange={setOpenTextBrand}
            options={[
              { id: "", label: `All ${clientScope.brandLabel.toLowerCase()}s` },
              ...brandLocations.map((brand) => ({ id: brand, label: brand })),
            ]}
          />
        </EmbeddedFilterCard>
      </div>
    ) : (
      // Report-style perspectives (EEDepartmentReport) portal their own selectors here.
      activePersp === "ee-unit-department-report" && clientScope.key === "csg" ? (
        <div className="flex flex-col gap-4">
          <EmbeddedFilterCard title={clientScope.brandLabel}>
            <PillOptionRow
              value={departmentReportBrand}
              onChange={setDepartmentReportBrand}
              options={[
                { id: "", label: `All ${clientScope.brandLabel.toLowerCase()}s` },
                ...departmentReportBrandOptions.map((brand) => ({ id: brand, label: brand })),
              ]}
            />
          </EmbeddedFilterCard>
          <div id={FR_FILTERS_SLOT} style={{ display: "flex", flexDirection: "column", gap: 12 }} />
        </div>
      ) : (
        <div id={FR_FILTERS_SLOT} style={{ display: "flex", flexDirection: "column", gap: 12 }} />
      )
    );

    return (
      <VisualExportProvider active client={data.meta.organizationName} logoUrl={logoUrl}>
        <FieldRedesignShell
          clientName={data.meta.organizationName}
          logoUrl={logoUrl}
          clientSubline={clientScope.key === "dws-field" ? "Field Employee Experience" : "Employee Experience"}
          campaignLabel={current}
          eyebrow={`${groupDef?.label ?? ""} · ${current}`}
          reportTitle={clientScope.executiveTitles[activePersp] ?? activePersp}
          views={availableGroups.map((g) => ({
            id: g.id,
            label: g.label,
            perspectives: g.perspectives.map((p) => ({ id: p.id, label: p.label, dividerBefore: p.dividerBefore })),
          }))}
          activeViewId={activeGroup}
          activeReportId={activePersp}
          onSelectReport={(viewId, reportId) => {
            setActiveGroup(viewId as GroupId);
            setActivePersp(reportId as PerspectiveId);
          }}
          contextSlot={redesignContextSlot}
          filtersSlot={redesignFiltersSlot}
          headerExtraSlotId={FR_HEADER_EXTRA_SLOT}
          thickerHeaderDivider
          titleSuffixSlotId={FR_TITLE_SUFFIX_SLOT}
          // Redesign surface treatment now applies to CSG + DWS Field shells.
          basinReportSurface={useRedesignSurfaceTint}
        >
          <div id={DASHBOARD_VISUAL_EXPORT_TARGET_ID}>{content}</div>
        </FieldRedesignShell>
      </VisualExportProvider>
    );
  }

  return (
    <VisualExportProvider
      active
      client={data.meta.organizationName}
      logoUrl={logoUrl}
    >
      <DashboardRibbon
        title="Employee Experience"
        categories={availableGroups.map((g) => ({ id: g.id, label: g.label }))}
        activeCategoryId={activeGroup}
        onCategoryChange={onGroupChange}
        perspectives={(groupDef?.perspectives ?? []).map((p) => ({ id: p.id, label: p.label }))}
        activePerspectiveId={activePersp}
        onPerspectiveChange={(id) => setActivePersp(id as PerspectiveId)}
        forcePerspectiveSelect
        legend={
          <div className="flex items-center gap-2.5">
            <p className="hidden text-right text-[11px] font-medium leading-snug text-[#60727D] xl:block">
              {useCompositeExport ? (
                <>
                  Export the full
                  <br />
                  report as a PNG
                </>
              ) : (
                <>
                  Export the current
                  <br />
                  view as a PNG
                </>
              )}
            </p>
            {useCompositeExport ? (
              <CompositeVisualExportButton filename={exportFilename} logoUrl={logoUrl} />
            ) : (
              <VisualExportButton
                targetId={DASHBOARD_VISUAL_EXPORT_TARGET_ID}
                filename={exportFilename}
                iconOnly
              />
            )}
          </div>
        }
      />
      <div id={DASHBOARD_VISUAL_EXPORT_TARGET_ID}>
      {clientScope.executivePerspectives.has(activePersp) ||
      activePersp === "ee-campaign-results" ||
      activePersp === "ee-department-comparison" ||
      activePersp === "ee-location-comparison" ||
      activePersp === "ee-division-comparison" ||
      activePersp === "ee-role-comparison" ||
      activePersp === "hr-supervisor" ||
      activePersp === "ee-brand-report" ||
      activePersp === "ee-department-report" ||
      activePersp === "ee-unit-department-report" ||
      activePersp === "ee-autosep-report" ||
      activePersp === "ee-division-report"
        ? content
        : <DashboardCanvas leftRail={leftRail} rightRail={canvasInfoRail}>{content}</DashboardCanvas>}
      </div>
    </VisualExportProvider>
  );
}

