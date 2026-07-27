// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, Unlock } from "lucide-react";
import { usePersistedDashboardFilter } from "@/hooks/use-persisted-dashboard-filter";
import { toDepartmentReportData } from "./ee-demo-fixture";
import {
  ClientMark,
  DateHead,
  EEReportStyles,
  BasinSurfaceStyles,
  RailSection,
  Chevron,
  f1,
  isLightBand,
  dwsScoreColor,
  makeGradientColor,
  dwsDeltaStyle,
  mean,
  round1,
  EmbeddedFilterCard,
  FilterStack,
  PillOptionRow,
  IndexRailTabs,
  BrandComparisonChart,
  VerticalSectionLabel,
  SectionWithVerticalLabel,
} from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";
import { IndexScoreSummary, type IndexDatum } from "./index-score-summary";
import { SingleVisualExportFrame } from "@/components/dashboard/single-visual-export-frame";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";

const REPORT_DATA = toDepartmentReportData();
const ALL = "all";
const PREFERRED_CURRENT_CAMPAIGN = "May 2026";
const PREFERRED_PRIOR_CAMPAIGN = "Aug 2025";

function valueFor(cell, campaign) {
  if (!cell) return null;
  const value = campaign.isCurrent ? cell.current : cell.comparisons[campaign.id];
  return typeof value === "number" && value > 0 ? value : null;
}

function textFor(color) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

function campaignMatches(campaign, label) {
  const source = String(campaign?.labelLong || campaign?.label || "").toLowerCase();
  return source === label.toLowerCase();
}

function splitSupervisorName(value) {
  const raw = String(value || "").trim();
  if (!raw) return { top: "", bottom: "" };
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return { top: last, bottom: first || "" };
  }
  const parts = raw.split(/\s+/);
  if (parts.length <= 1) return { top: raw, bottom: "" };
  return { top: parts.at(-1), bottom: parts.slice(0, -1).join(" ") };
}

function SegmentCard({ segment, deptId, minN, companyAvg, scoreColor, lockButton }) {
  const rows = segment.groups
    .map((group) => {
      const cell = group.byDept[deptId];
      return cell && cell.responses >= minN ? { ...group, ...cell } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.current - left.current);

  if (rows.length === 0) return null;

  const showHeader = segment.label !== "Uncategorized";
  return (
    <div className="card relative">
      {showHeader && <div className="card-head"><h3 className="card-title">{segment.label}</h3></div>}
      <div className="card-body">
        <div className="seg-rows">
          {rows.map((row) => {
            const color = scoreColor(row.current);
            return (
              <div className="seg-row" key={row.id}>
                <div className="seg-name" title={row.name}>{row.name}<span className="seg-n">n={row.responses}</span></div>
                <div className="seg-track">
                  <div className="seg-bar" style={{ width: `${row.current}%`, background: color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)" }} />
                  <div className="seg-coline" style={{ left: `${companyAvg}%` }} />
                  <div className="seg-val" style={{ color: textFor(color) }}>{row.current.toFixed(1)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {lockButton}
    </div>
  );
}

export function EEDepartmentReport({
  data,
  unitLabel = "Department",
  reportHeading = "DEPARTMENT REPORT",
  stylePreset = "default",
  enableVisualLocks = true,
  enableSingleVisualExport = false,
  enableVisualRegistry = false,
  exportClientLabel,
  benchmarkLabel = "CSG",
  fieldLayout = false,
  compact = false,
  chromeless = false,
  filtersPortalId,
  headerPortalId,
  titleSuffixPortalId,
  basinReportSurface = false,
  hideIndexSummary = false,
  filterPersistenceKey,
  allowedDepartmentIds,
}: {
  data: any;
  unitLabel?: string;
  reportHeading?: string;
  stylePreset?: "default" | "division";
  enableVisualLocks?: boolean;
  enableSingleVisualExport?: boolean;
  enableVisualRegistry?: boolean;
  exportClientLabel?: string;
  benchmarkLabel?: string;
  fieldLayout?: boolean;
  compact?: boolean;
  /**
   * Hides the top "Index Scores" summary strip. Used by the Supervisor report
   * (both DWS scopes), which is scoped to a single index and goes straight to
   * the statement chart + table.
   */
  hideIndexSummary?: boolean;
  /**
   * Chromeless mode (DWS Field redesign pilot only): drop the fixed left/right
   * rails and the 268px center margins so the report body renders inside the
   * redesign shell's center column. Rail selectors are portaled into
   * `filtersPortalId`. Defaults to false — every other dashboard is unaffected.
   */
  chromeless?: boolean;
  filtersPortalId?: string;
  /**
   * Basin Report only (redesign pilot): when set and chromeless, the KPI strip
   * is portaled into this DOM id (rendered in the shell's single top header)
   * instead of the report's own internal boxed hero, so there's only one header.
   */
  headerPortalId?: string;
  /**
   * Basin Report only (redesign pilot): when set and chromeless, the currently
   * selected basin's name is portaled here, right after the title ("Basin
   * Report — East Texas") so it's clear what's driving the data below.
   */
  titleSuffixPortalId?: string;
  /**
   * Basin Report ONLY (redesign pilot, surface/elevation treatment "1b"):
   * tints this report's own canvas and swaps every hard `#8798AA` panel
   * border (cards, statement tables, heat maps, the header KPI chips, and
   * the Index Score Summary tiles) for a soft edge + elevation shadow.
   * `EEDepartmentReport` is shared by several other reports (Supervisor,
   * Job Category, Department, AutoSEP) — they never set this, so they keep
   * rendering exactly as they do today.
   */
  basinReportSurface?: boolean;
  /** Cookie key so unit/campaign filters restore when revisiting this report. */
  filterPersistenceKey?: string;
  /** Optional allow-list of unit ids visible in the unit selector. */
  allowedDepartmentIds?: string[];
}) {
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = (enableVisualRegistry || registryActive) && Boolean(exportRegistry);
  const { client, current, comparisons, scale, departments = [], indexes = [], segments, overall } = data;
  const visibleDepartments = useMemo(() => {
    if (!allowedDepartmentIds || allowedDepartmentIds.length === 0) {
      return departments;
    }
    const allowed = new Set(allowedDepartmentIds);
    return departments.filter((department) => allowed.has(department.id));
  }, [departments, allowedDepartmentIds]);

  // When only a single campaign exists there is nothing to compare against, so all
  // delta / year-over-year / campaign-selection UI is suppressed.
  const hasComparison = comparisons.length > 0;
  const scoreColor = makeGradientColor(scale.min, scale.max);
  const activeDeltaStyle = dwsDeltaStyle;
  const [deptId, setDeptId] = usePersistedDashboardFilter(
    filterPersistenceKey,
    "deptId",
    () => visibleDepartments[0]?.id ?? ""
  );
  const [focus, setFocus] = usePersistedDashboardFilter(
    filterPersistenceKey,
    "focus",
    () => (unitLabel === "Brand" ? indexes[0]?.id ?? ALL : ALL)
  );
  // Field layout: bar chart is driven by an inline index toggle (chart-only),
  // decoupled from the statement table which stays fully expanded.
  const [chartIndexId, setChartIndexId] = usePersistedDashboardFilter(
    filterPersistenceKey,
    "chartIndexId",
    () => indexes[0]?.id ?? ""
  );
  // Chromeless (redesign pilot) flat statement list defaults to score
  // high-to-low for the current campaign; the live layout keeps its
  // unsorted (index order) default untouched.
  const [stmtSort, setStmtSort] = useState<{ col: "score" | "vsorg" | null; dir: "desc" | "asc" }>(
    chromeless ? { col: "score", dir: "desc" } : { col: null, dir: "desc" }
  );
  // Redesign pilot (chromeless) loads the statement table with every index
  // collapsed so the page isn't a wall of statements on first load; the live
  // (non-redesign) layout keeps its existing all-open default untouched.
  const [collapsedIndexes, setCollapsedIndexes] = useState<Set<string>>(
    () => (chromeless ? new Set(indexes.map((index) => index.id)) : new Set())
  );
  const toggleCollapse = (id: string) =>
    setCollapsedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [currentCampaignId, setCurrentCampaignId] = usePersistedDashboardFilter(filterPersistenceKey, "currentCampaignId", () => {
    const preferredCurrent = [current, ...comparisons].find((campaign) => campaignMatches(campaign, PREFERRED_CURRENT_CAMPAIGN));
    return preferredCurrent?.id ?? current.id;
  });
  const [priorCampaignId, setPriorCampaignId] = usePersistedDashboardFilter(filterPersistenceKey, "priorCampaignId", () => {
    const preferredPrior = comparisons.find((campaign) => campaignMatches(campaign, PREFERRED_PRIOR_CAMPAIGN));
    return preferredPrior?.id ?? comparisons[comparisons.length - 1]?.id ?? "";
  });
  const [visualLocks, setVisualLocks] = useState<Record<string, {
    enabled: boolean;
    deptId: string;
    focus: string;
    priorCampaignId: string;
    campaignId: string;
  }>>({});
  const timeline = useMemo(
    () => [...comparisons.map((item) => ({ ...item, isCurrent: false })), { ...current, isCurrent: true }],
    [comparisons, current]
  );
  const timelineRecentFirst = useMemo(() => [...timeline].reverse(), [timeline]);

  useEffect(() => {
    if (!visibleDepartments.find((item) => item.id === deptId)) {
      setDeptId(visibleDepartments[0]?.id ?? "");
    }
  }, [visibleDepartments, deptId]);

  useEffect(() => {
    if (indexes.length && !indexes.find((item) => item.id === chartIndexId)) {
      setChartIndexId(indexes[0].id);
    }
  }, [indexes, chartIndexId]);

  // Chromeless (redesign pilot): resolve the right-rail "Filters" tab node so we
  // can portal this report's own rail selectors into it.
  const [filtersPortalNode, setFiltersPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!chromeless || !filtersPortalId) {
      setFiltersPortalNode(null);
      return;
    }
    setFiltersPortalNode(document.getElementById(filtersPortalId));
  }, [chromeless, filtersPortalId, reportHeading]);

  // Basin Report header consolidation: resolve the shell's header slot so the
  // KPI strip can render there instead of a second, boxed-in hero.
  const [headerPortalNode, setHeaderPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!chromeless || !headerPortalId) {
      setHeaderPortalNode(null);
      return;
    }
    setHeaderPortalNode(document.getElementById(headerPortalId));
  }, [chromeless, headerPortalId, reportHeading]);

  // Basin Report header consolidation: resolve the shell's title-suffix slot so
  // the currently selected basin's name can show right after the title.
  const [titleSuffixPortalNode, setTitleSuffixPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!chromeless || !titleSuffixPortalId) {
      setTitleSuffixPortalNode(null);
      return;
    }
    setTitleSuffixPortalNode(document.getElementById(titleSuffixPortalId));
  }, [chromeless, titleSuffixPortalId, reportHeading]);

  const CANVAS_STYLE = { display: "block", minHeight: "calc(100vh - var(--app-top-banner-height, 78px) - 66px)", background: "linear-gradient(90deg, #E8ECE9 0 268px, #fff 268px calc(100% - 268px), #E8ECE9 calc(100% - 268px) 100%)", overflowAnchor: "none" } as const;
  const LEFT_RAIL_STYLE = { position: "fixed" as const, top: "calc(var(--app-top-banner-height, 78px) + 66px)", bottom: 0, left: 0, width: 268, overflow: "auto", overflowAnchor: "none", background: "#E8ECE9", padding: "26px 22px", zIndex: 30, borderRight: "1px solid #D4DAD6" };
  const RIGHT_RAIL_STYLE = { position: "fixed" as const, top: "calc(var(--app-top-banner-height, 78px) + 66px)", right: 0, bottom: 0, width: 268, overflow: "auto", overflowAnchor: "none", background: "#E8ECE9", borderLeft: "1px solid #D4DAD6", padding: "26px 22px" };
  const CENTER_STYLE = { minHeight: "calc(100vh - var(--app-top-banner-height, 78px) - 66px)", marginLeft: 268, marginRight: 268, background: "#fff", overflowAnchor: "none", padding: "30px 30px 56px" } as const;

  if (!visibleDepartments.length || !indexes.length) {
    return (
      <div className="canvas" style={CANVAS_STYLE}>
        <EEReportStyles />
        <aside style={LEFT_RAIL_STYLE} />
        <aside style={RIGHT_RAIL_STYLE} />
        <main style={CENTER_STYLE}>
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <p style={{ color: "#6E7E96", fontSize: 14 }}>No department report data is available for this campaign yet.</p>
          </div>
        </main>
      </div>
    );
  }

  const dept = visibleDepartments.find((item) => item.id === deptId) ?? visibleDepartments[0];
  const curCamp = timeline.find((item) => item.id === currentCampaignId) ?? current;
  const previous = timeline.find((item) => item.id === priorCampaignId) ?? comparisons[comparisons.length - 1] ?? null;
  const campaigns = previous ? [previous, curCamp] : [curCamp];

  // Writing to the registry ref during render is side-effect-safe (no state
  // update) and keeps the composite export header in sync with active filters.
  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: `${unitLabel} Report`,
      client: exportClientLabel,
      filters: [dept?.name, curCamp?.labelLong || curCamp?.label].filter(
        (value): value is string => Boolean(value)
      ),
    });
  }
  const minN = data.segmentMinResponses ?? 5;
  const defaultVisualContext = {
    enabled: false,
    deptId,
    focus,
    priorCampaignId: previous?.id ?? "",
    campaignId: curCamp.id,
  };
  const resolveVisualContext = (visualId) => {
    if (!enableVisualLocks) return defaultVisualContext;
    const lock = visualLocks[visualId];
    return lock?.enabled ? lock : defaultVisualContext;
  };
  const toggleVisualLock = (visualId) => {
    setVisualLocks((prev) => {
      const existing = prev[visualId];
      if (existing?.enabled) {
        return { ...prev, [visualId]: { ...existing, enabled: false } };
      }
      return {
        ...prev,
        [visualId]: {
          enabled: true,
          deptId,
          focus,
          priorCampaignId: previous?.id ?? "",
          campaignId: curCamp.id,
        },
      };
    });
  };
  const buildLockButton = (visualId, label) => {
    if (unitLabel !== "Brand" || !enableVisualLocks) return null;
    const locked = Boolean(visualLocks[visualId]?.enabled);
    return (
      <button
        type="button"
        onClick={() => toggleVisualLock(visualId)}
        title={locked ? `${label} locked` : `${label} unlocked`}
        aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
        className="absolute bottom-3 right-3 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#8798AA] bg-white/90 text-[#3B4B63] shadow-[0_4px_10px_rgba(15,23,42,.12)]"
      >
        {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </button>
    );
  };

  const chartContext = resolveVisualContext("brand-chart");
  const tableContext = resolveVisualContext("statement-table");
  const chartDeptId = chartContext.deptId || deptId;
  const chartFocus = chartContext.focus || focus;
  const chartCampaign = timeline.find((item) => item.id === chartContext.campaignId) ?? curCamp;
  const tableDeptId = tableContext.deptId || deptId;
  const tableFocus = tableContext.focus || focus;
  const tableCampaign = timeline.find((item) => item.id === tableContext.campaignId) ?? curCamp;
  const tablePrevious =
    timeline.find((item) => item.id === tableContext.priorCampaignId) ??
    (tableContext.priorCampaignId ? comparisons.find((item) => item.id === tableContext.priorCampaignId) : null) ??
    null;
  const tableCampaigns = tablePrevious ? [tablePrevious, tableCampaign] : [tableCampaign];

  // Index / total / company scores all read the projection's person-average
  // cells. Nothing here is rebuilt by averaging statements or unit rows.
  const scoreCell = (cell, campaign) => {
    const value = valueFor(cell, campaign);
    return typeof value === "number" ? round1(value) : null;
  };
  const deptIndex = (index, campaign) => scoreCell(index.score?.byGroup?.[deptId], campaign);
  const deptTotal = (campaign) => scoreCell(overall?.byGroup?.[deptId], campaign);
  const companyStatement = (statement, campaign) => scoreCell(statement?.org, campaign);
  const companyIndex = (index, campaign) => scoreCell(index.score?.org, campaign);
  const companyOverall = (campaign) => scoreCell(overall?.org, campaign);
  const showVsOrg = unitLabel !== "Brand";
  const chartFocusEffective = fieldLayout ? chartIndexId : chartFocus;
  const activeIndex = indexes.find((index) => index.id === chartFocusEffective) ?? indexes[0] ?? null;
  const toggleStmtSort = (col: "score" | "vsorg") =>
    setStmtSort((prev) => (prev.col === col ? { col, dir: prev.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" }));
  const sortArrow = (col: "score" | "vsorg") =>
    fieldLayout && stmtSort.col === col ? (stmtSort.dir === "desc" ? " ↓" : " ↑") : "";
  const brandChartRows = activeIndex
    ? activeIndex.statements
        .map((statement) => {
          const value = valueFor(statement.byDept[chartDeptId], chartCampaign);
          const org = companyStatement(statement, chartCampaign);
          if (value == null || org == null) return null;
          return {
            id: statement.id,
            name: statement.text,
            value,
            delta: round1(value - org),
            org,
          };
        })
        .filter((row): row is { id: string; name: string; value: number; delta: number; org: number } => row != null)
        .sort((left, right) => right.value - left.value)
    : [];
  const allBrandValues = [...brandChartRows.map((row) => row.value), ...brandChartRows.map((row) => row.org)];
  const brandChartAxisMin = Math.floor((Math.min(...allBrandValues) - 2) / 5) * 5;
  const brandChartAxisMax = Math.ceil((Math.max(...allBrandValues) + 2) / 5) * 5;
  const brandChartAxisTicks = [];
  for (let tick = brandChartAxisMin; tick <= brandChartAxisMax; tick += 5) brandChartAxisTicks.push(tick);
  const brandChartAxis = {
    min: Number.isFinite(brandChartAxisMin) ? brandChartAxisMin : 0,
    max: Number.isFinite(brandChartAxisMax) ? brandChartAxisMax : 100,
    ticks: brandChartAxisTicks.length > 0 ? brandChartAxisTicks : [0, 20, 40, 60, 80, 100],
  };

  const total = deptTotal(curCamp);
  const previousTotal = previous ? deptTotal(previous) : null;
  const totalDelta = total == null || previousTotal == null ? null : round1(total - previousTotal);
  const enpsForCampaign = (campaign) => {
    const cell = data.enpsByDept?.[deptId];
    if (!cell || !campaign) return null;
    return campaign.isCurrent ? cell.current ?? null : cell.comparisons?.[campaign.id] ?? null;
  };
  const brandEnpsCurrent = unitLabel === "Brand" ? enpsForCampaign(curCamp) : null;
  const brandEnpsPrevious =
    unitLabel === "Brand" && previous ? enpsForCampaign(previous) : null;
  const brandEnpsDelta =
    brandEnpsCurrent == null || brandEnpsPrevious == null ? null : round1(brandEnpsCurrent - brandEnpsPrevious);
  const supervisorHeatmapForDept = unitLabel === "Brand" ? data.supervisorHeatmap?.byDept?.[deptId] : null;

  const orgTotal = companyOverall(curCamp);
  const vsOrg = total == null || orgTotal == null ? null : round1(total - orgTotal);
  // KPI items shared between the internal hero (default) and the header-portal
  // rendering used when a single consolidated header is requested (Basin Report).
  const kpiItems: { label: string; value: string; color?: string }[] = [
    { label: "Total Index", value: total == null ? "N/A" : total.toFixed(1) },
    { label: "vs Org", value: vsOrg == null ? "N/A" : f1(vsOrg), color: vsOrg == null ? "#6E7E96" : vsOrg >= 0 ? "#59885D" : "#D46A6A" },
    ...(hasComparison ? [{ label: "Change YoY", value: totalDelta == null ? "—" : f1(totalDelta), color: totalDelta == null ? "#6E7E96" : totalDelta >= 0 ? "#59885D" : "#D46A6A" }] : []),
    { label: "Responses", value: String(dept.responses) },
    ...(unitLabel === "Brand" ? [{ label: "ENPS", value: brandEnpsCurrent == null ? "N/A" : brandEnpsCurrent.toFixed(1), color: brandEnpsDelta == null ? "#152238" : brandEnpsDelta >= 0 ? "#9CB2A8" : "#C8B9B6" }] : []),
  ];
  // Basin Report pilot: the header now only needs response volume — the Index
  // Score Summary strip below covers total index / vs org per index instead.
  // Response Rate isn't computed yet, so it's a placeholder dash for now.
  const chromelessKpiItems: { label: string; value: string; color?: string }[] = [
    { label: "Responses", value: String(dept.responses) },
    { label: "Response Rate", value: "—" },
  ];

  // Basin Report pilot: Index Score Summary strip data, built from the same
  // current/prior campaign and dept selection driving the KPI strip above.
  const indexSummaryOverall: IndexDatum = {
    id: "__overall__",
    name: "Overall",
    score: total ?? 0,
    delta: totalDelta,
    diff: vsOrg ?? 0,
  };
  const indexSummaryIndexes: IndexDatum[] = indexes
    .map((index) => {
      const score = deptIndex(index, curCamp);
      if (score == null) return null;
      const prevScore = previous ? deptIndex(index, previous) : null;
      const delta = prevScore == null ? null : round1(score - prevScore);
      const org = companyIndex(index, curCamp);
      const diff = org == null ? 0 : round1(score - org);
      return { id: index.id, name: index.name, score, delta, diff };
    })
    .filter((item): item is IndexDatum => item != null);

  // Rail selectors, shared between the fixed left rail (default) and the
  // redesign shell's "Filters" tab portal (chromeless).
  const railControls = (
    <FilterStack>
      {chromeless ? (
        <EmbeddedFilterCard title={unitLabel}>
          <PillOptionRow
            value={deptId}
            onChange={setDeptId}
            options={visibleDepartments.map((item) => ({ id: item.id, label: item.name }))}
          />
          <p className="rs-hint" style={{ margin: "9px 2px 0" }}>{dept.location ? `${dept.location} · ` : ""}{dept.responses} responses</p>
        </EmbeddedFilterCard>
      ) : (
        <RailSection title={unitLabel} defaultOpen>
          <select className="rail-select" value={deptId} onChange={(event) => setDeptId(event.target.value)}>
            {visibleDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="rs-hint">{dept.location ? `${dept.location} · ` : ""}{dept.responses} responses</p>
        </RailSection>
      )}
      {hasComparison ? (
        chromeless ? (
          <EmbeddedFilterCard title="Campaign">
            <div className="flex flex-col gap-3">
              <div>
                <span className="mb-1.5 block text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8798AA]">Current</span>
                <PillOptionRow
                  value={curCamp.id}
                  onChange={setCurrentCampaignId}
                  options={timelineRecentFirst.map((campaign) => ({ id: campaign.id, label: campaign.labelLong || campaign.label }))}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8798AA]">Compared To</span>
                <PillOptionRow
                  value={previous?.id ?? ""}
                  onChange={setPriorCampaignId}
                  options={[
                    { id: "", label: "No comparison" },
                    ...timelineRecentFirst.filter((campaign) => campaign.id !== curCamp.id).map((campaign) => ({ id: campaign.id, label: campaign.labelLong || campaign.label })),
                  ]}
                />
              </div>
            </div>
          </EmbeddedFilterCard>
        ) : (
          <RailSection title="Campaign Selection">
            <div className="flex flex-col gap-3">
              <div>
                <span className="block text-center text-xs font-medium text-[#6E7E96]">Current</span>
                <select className="rail-select" value={curCamp.id} onChange={(event) => setCurrentCampaignId(event.target.value)}>
                  {timelineRecentFirst.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.labelLong || campaign.label}</option>)}
                </select>
              </div>
              <div>
                <span className="block text-center text-xs font-medium text-[#6E7E96]">Compared To</span>
                <select className="rail-select" value={previous?.id ?? ""} onChange={(event) => setPriorCampaignId(event.target.value)}>
                  {timelineRecentFirst.filter((campaign) => campaign.id !== curCamp.id).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.labelLong || campaign.label}</option>)}
                </select>
              </div>
            </div>
          </RailSection>
        )
      ) : null}
      {!fieldLayout ? (
      <RailSection title="Index">
        <div className="rs-stack">
          <button className={`index-btn${focus === ALL ? " active" : ""}`} onClick={() => setFocus(ALL)}>All indexes</button>
          {indexes.map((index) => <button key={index.id} className={`index-btn${focus === index.id ? " active" : ""}`} onClick={() => setFocus(index.id)}>{index.name}</button>)}
        </div>
      </RailSection>
      ) : null}
    </FilterStack>
  );

  return (
    <div
      className={basinReportSurface ? "canvas basin-surface-1b" : "canvas"}
      style={chromeless ? { display: "block", background: basinReportSurface ? "#F4F4EF" : "#fff" } : CANVAS_STYLE}
    >
      <EEReportStyles />
      {basinReportSurface ? <BasinSurfaceStyles /> : null}
      {chromeless ? (
        filtersPortalNode ? createPortal(railControls, filtersPortalNode) : null
      ) : (
        <>
          <aside style={LEFT_RAIL_STYLE}>
            <div className="client-card"><ClientMark client={client} /><div className="client-head">{reportHeading}</div></div>
            {railControls}
          </aside>

          <aside style={RIGHT_RAIL_STYLE}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8798AA", marginBottom: 10 }}>{unitLabel} Report</div>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: "#3B4B63" }}>
              Select a {unitLabel.toLowerCase()} from the left to view its index scores, statement results, and comparison to the organization average across campaigns.
            </p>
          </aside>
        </>
      )}

      <main style={chromeless ? { background: basinReportSurface ? "#F4F4EF" : "#fff", overflowAnchor: "none", padding: 0 } : CENTER_STYLE}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          {titleSuffixPortalNode
            ? createPortal(
                <>
                  <span style={{ color: "#8798AA", fontWeight: 700 }}> — </span>
                  <span style={{ color: "#3B4B63" }}>{dept.name}</span>
                </>,
                titleSuffixPortalNode
              )
            : null}
          {headerPortalNode ? (
            createPortal(
              // Inline, hardcoded equivalent of .kpi-strip/.kpi: those classes read
              // CSS custom properties scoped to `.canvas`, which this portal target
              // (rendered in the shell's header, outside `.canvas`) can't see.
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {chromelessKpiItems.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      minWidth: 104,
                      minHeight: 76,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: "10px 14px",
                      borderRadius: 16,
                      border: basinReportSurface ? "1px solid rgba(135,152,170,0.7)" : "1px solid #8798AA",
                      background: "#F5F7F8",
                      boxShadow: basinReportSurface
                        ? "0 2px 12px rgba(15,23,42,0.24), 0 1px 3px rgba(15,23,42,0.20)"
                        : "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)",
                    }}
                  >
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96" }}>{item.label}</div>
                    {/* DESIGN RULE: top-header KPI card values always use the dark
                        ink color, never the score-scale tint. See HeaderKpiPortal. */}
                    <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1, marginTop: 6, color: "#152238" }}>{item.value}</div>
                  </div>
                ))}
              </div>,
              headerPortalNode
            )
          ) : (
            <div className="hero">
              <div><h2>{dept.name}</h2><p className="hero-sub">{curCamp.labelLong}{previous ? ` (trend vs ${previous.label})` : ""}</p></div>
              <div className="kpi-strip">
                {kpiItems.map((item) => (
                  <div className="kpi" key={item.label}>
                    <div className="k-label">{item.label}</div>
                    <div className="k-value" style={{ color: item.color ?? undefined }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {chromeless && !hideIndexSummary ? (
            // EXPERIMENT: vertical section label in a narrow rail to the left
            // of the section instead of a horizontal line above it — same
            // .slabel look, just rotated and vertically centered against the
            // section's own height. Basin Report redesign only; easy to
            // revert to the plain sibling <p> above if it doesn't work.
            //
            // DESIGN RULE: space between stacked report sections (Index
            // Scores / Index Comparison / Statement Results, and the
            // Supervisor Heat Map below it) is doubled to 36px in the
            // redesign — was 18px, read as too tight. Applied wherever this
            // shell renders stacked report sections; see the matching gap-8
            // rule in ee-location-comparison.tsx.
            <SectionWithVerticalLabel label="Index Scores" wrapStyle={{ marginBottom: 36 }}>
              <RegisteredVisualExportFrame
                enabled={registryOn}
                order={5}
                label="Download scorecard"
                filename={buildDashboardExportFilename({
                  client: "dws",
                  perspective: `${unitLabel}-index-scorecard`,
                  campaign: tableCampaign.label,
                })}
                // 22px matches the gap between the header divider line and this
                // section (the shell header's marginBottom) — mirrored here as
                // left/right breathing room so the Overall card isn't flush
                // against the content edge.
                style={{ padding: "0 22px" }}
              >
                <IndexScoreSummary
                  overall={indexSummaryOverall}
                  indexes={indexSummaryIndexes}
                  scoreColor={scoreColor}
                  surfaceTreatment={basinReportSurface ? "1b" : undefined}
                  compact={compact}
                />
              </RegisteredVisualExportFrame>
            </SectionWithVerticalLabel>
          ) : null}

          {brandChartRows.length > 0 ? (
            fieldLayout ? (
              (() => {
                const comparisonRow = (
                  <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
                    {/* A single-index report (e.g. the DWS Supervisor report,
                        scoped to just the Supervisor index) has nothing to
                        switch between — drop the rail entirely and let the
                        chart take the full width. */}
                    {indexes.length > 1 ? (
                      <IndexRailTabs indexes={indexes} activeId={chartIndexId} onSelect={setChartIndexId} compact={compact} surfaceTreatment={basinReportSurface ? "1b" : undefined} />
                    ) : null}
                    <RegisteredVisualExportFrame
                      enabled={registryOn}
                      order={10}
                      label="Download chart"
                      filename={buildDashboardExportFilename({
                        client: "dws",
                        perspective: `${unitLabel}-index-chart`,
                        campaign: chartCampaign.label,
                      })}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <div className="card relative" style={{ flex: 1, minWidth: 0 }}>
                        <div className="card-head flex items-center justify-between gap-4">
                          <h3 className="card-title">{activeIndex ? `${activeIndex.name} Statements` : "Statement Results"}</h3>
                        </div>
                        <div className="card-body">
                          <BrandComparisonChart rows={brandChartRows} axis={brandChartAxis} scoreColor={scoreColor} uniform compact={compact} benchmarkLabel={benchmarkLabel} />
                        </div>
                      </div>
                    </RegisteredVisualExportFrame>
                  </div>
                );
                return chromeless ? (
                  <SectionWithVerticalLabel label="Index Comparison" wrapStyle={{ marginBottom: 36 }}>
                    {comparisonRow}
                  </SectionWithVerticalLabel>
                ) : (
                  <div style={{ marginBottom: 18 }}>{comparisonRow}</div>
                );
              })()
            ) : (
              <RegisteredVisualExportFrame
                enabled={registryOn}
                order={10}
                label="Download chart"
                filename={buildDashboardExportFilename({
                  client: "dws",
                  perspective: `${unitLabel}-index-chart`,
                  campaign: chartCampaign.label,
                })}
              >
              <div className="card relative" style={{ marginBottom: 18 }}>
                <div className="card-head flex items-center justify-between gap-4">
                  <h3 className="card-title">{activeIndex ? `${activeIndex.name} Statements` : "Statement Results"}</h3>
                </div>
                <div className="card-body">
                  <BrandComparisonChart rows={brandChartRows} axis={brandChartAxis} scoreColor={scoreColor} benchmarkLabel={benchmarkLabel} />
                </div>
                {buildLockButton("brand-chart", "brand chart")}
              </div>
              </RegisteredVisualExportFrame>
            )
          ) : null}

          <SectionWithVerticalLabel label="Statement Results" active={chromeless}>
          <RegisteredVisualExportFrame
            enabled={registryOn}
            order={20}
            label="Download table"
            filename={buildDashboardExportFilename({
              client: "dws",
              perspective: `${unitLabel}-statement-results`,
              campaign: tableCampaign.label,
            })}
          >
          {!chromeless ? <p className="slabel" style={{ marginBottom: 8 }}>Statement Results</p> : null}
          <SingleVisualExportFrame
            enabled={enableSingleVisualExport}
            label="Download report"
            filename={buildDashboardExportFilename({
              client: "dws",
              perspective: `${unitLabel}-statement-results`,
              campaign: tableCampaign.label,
            })}
          >
          <div className="stmt-wrap relative" style={{ marginBottom: chromeless ? 36 : 18 }}>
            <table className="stmt-table">
              <thead><tr><th>{chromeless ? "Statements" : tableCampaign.label}{tablePrevious ? ` vs ${tablePrevious.label}` : ""}{fieldLayout ? "" : " · expand an index for statements"}</th>{tableCampaigns.map((campaign, campaignIndex) => <th key={campaign.id} className={`num${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} onClick={fieldLayout ? () => toggleStmtSort("score") : undefined} style={fieldLayout ? { cursor: "pointer", userSelect: "none" } : undefined}><DateHead campaign={campaign} />{sortArrow("score")}</th>)}{hasComparison ? <th className="num col-group-start">Delta</th> : null}{showVsOrg ? <th className="num col-group-start" onClick={fieldLayout ? () => toggleStmtSort("vsorg") : undefined} style={fieldLayout ? { cursor: "pointer", userSelect: "none" } : undefined}>vs Org{sortArrow("vsorg")}</th> : null}</tr></thead>
              <tbody>
                {chromeless ? (() => {
                  // Basin Report pilot: skip the index grouping entirely — the
                  // Index Comparison chart above already covers index vs org,
                  // so here every statement across every index is one flat,
                  // directly sortable list.
                  const flatStatements = indexes.flatMap((index) => index.statements);
                  const orderedFlat = (() => {
                    if (!stmtSort.col) return flatStatements;
                    const metric = (statement) => {
                      const value = valueFor(statement.byDept[tableDeptId], tableCampaign);
                      if (stmtSort.col === "score") return value;
                      const org = companyStatement(statement, tableCampaign);
                      return value == null || org == null ? null : value - org;
                    };
                    return [...flatStatements].sort((left, right) => {
                      const leftValue = metric(left);
                      const rightValue = metric(right);
                      if (leftValue == null && rightValue == null) return 0;
                      if (leftValue == null) return 1;
                      if (rightValue == null) return -1;
                      return stmtSort.dir === "desc" ? rightValue - leftValue : leftValue - rightValue;
                    });
                  })();
                  return orderedFlat.map((statement) => {
                    const curValue = valueFor(statement.byDept[tableDeptId], tableCampaign);
                    const prevStatementValue = tablePrevious ? valueFor(statement.byDept[tableDeptId], tablePrevious) : null;
                    const orgStatementValue = companyStatement(statement, tableCampaign);
                    const statementChange = curValue == null || prevStatementValue == null ? null : round1(curValue - prevStatementValue);
                    const statementVsOrg = curValue == null || orgStatementValue == null ? null : round1(curValue - orgStatementValue);
                    return <tr key={statement.id} className="stmt-row"><td className="stmt">{statement.text}</td>{tableCampaigns.map((campaign, campaignIndex) => { const value = valueFor(statement.byDept[tableDeptId], campaign); if (value == null) return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ color: "#6E7E96", background: "#F8FAFC" }}>N/A</td>; const color = scoreColor(value); return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}{hasComparison ? <td className="cell col-group-start col-group-end" style={statementChange == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(statementChange).bg, color: activeDeltaStyle(statementChange).text }}>{statementChange == null ? "—" : f1(statementChange)}</td> : null}{showVsOrg ? <td className="cell col-group-start" style={statementVsOrg == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(statementVsOrg).bg, color: activeDeltaStyle(statementVsOrg).text }}>{statementVsOrg == null ? "N/A" : f1(statementVsOrg)}</td> : null}</tr>;
                  });
                })() : (() => {
                  if (!fieldLayout || !stmtSort.col) return indexes;
                  const indexScore = (index) =>
                    scoreCell(index.score?.byGroup?.[tableDeptId], tableCampaign);
                  const metric = (index) => {
                    const cur = indexScore(index);
                    if (stmtSort.col === "score") return cur;
                    const org = companyIndex(index, tableCampaign);
                    return cur == null || org == null ? null : cur - org;
                  };
                  return [...indexes].sort((left, right) => {
                    const leftValue = metric(left);
                    const rightValue = metric(right);
                    if (leftValue == null && rightValue == null) return 0;
                    if (leftValue == null) return 1;
                    if (rightValue == null) return -1;
                    return stmtSort.dir === "desc" ? rightValue - leftValue : leftValue - rightValue;
                  });
                })().map((index) => {
                  const open = fieldLayout ? !collapsedIndexes.has(index.id) : tableFocus === index.id;
                  const deptIndexForTable = (targetIndex, campaign) =>
                    scoreCell(targetIndex.score?.byGroup?.[tableDeptId], campaign);
                  const cur = deptIndexForTable(index, tableCampaign);
                  const prevValue = tablePrevious ? deptIndexForTable(index, tablePrevious) : null;
                  const orgValue = companyIndex(index, tableCampaign);
                  const change = cur == null || prevValue == null ? null : round1(cur - prevValue);
                  const vsOrg = cur == null || orgValue == null ? null : round1(cur - orgValue);
                  const orderedStatements = (() => {
                    if (!fieldLayout || !stmtSort.col) return index.statements;
                    const metric = (statement) => {
                      const value = valueFor(statement.byDept[tableDeptId], tableCampaign);
                      if (stmtSort.col === "score") return value;
                      const org = companyStatement(statement, tableCampaign);
                      return value == null || org == null ? null : value - org;
                    };
                    return [...index.statements].sort((left, right) => {
                      const leftValue = metric(left);
                      const rightValue = metric(right);
                      if (leftValue == null && rightValue == null) return 0;
                      if (leftValue == null) return 1;
                      if (rightValue == null) return -1;
                      return stmtSort.dir === "desc" ? rightValue - leftValue : leftValue - rightValue;
                    });
                  })();
                  return (
                    <>
                      <tr className={`acc-head${open ? " acc-open" : ""}`} onClick={fieldLayout ? () => toggleCollapse(index.id) : () => setFocus(open ? ALL : index.id)}>
                        <td><div className="acc-name"><span className="acc-chev"><Chevron /></span><span className="acc-title">{index.name}</span></div></td>
                        {tableCampaigns.map((campaign, campaignIndex) => {
                          const value = deptIndexForTable(index, campaign);
                          if (value == null) {
                            return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ color: "#6E7E96", background: "#F8FAFC" }}>N/A</td>;
                          }
                          const color = scoreColor(value);
                          return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>;
                        })}
                        {hasComparison ? <td className="cell col-group-start col-group-end" style={change == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(change).bg, color: activeDeltaStyle(change).text }}>{change == null ? "—" : f1(change)}</td> : null}
                        {showVsOrg ? <td className="cell col-group-start" style={vsOrg == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(vsOrg).bg, color: activeDeltaStyle(vsOrg).text }}>{vsOrg == null ? "N/A" : f1(vsOrg)}</td> : null}
                      </tr>
                      {open && orderedStatements.map((statement) => {
                        const curValue = valueFor(statement.byDept[tableDeptId], tableCampaign);
                        const prevStatementValue = tablePrevious ? valueFor(statement.byDept[tableDeptId], tablePrevious) : null;
                        const orgStatementValue = companyStatement(statement, tableCampaign);
                        const statementChange = curValue == null || prevStatementValue == null ? null : round1(curValue - prevStatementValue);
                        const statementVsOrg = curValue == null || orgStatementValue == null ? null : round1(curValue - orgStatementValue);
                        return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td>{tableCampaigns.map((campaign, campaignIndex) => { const value = valueFor(statement.byDept[tableDeptId], campaign); if (value == null) return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ color: "#6E7E96", background: "#F8FAFC" }}>N/A</td>; const color = scoreColor(value); return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}{hasComparison ? <td className="cell col-group-start col-group-end" style={statementChange == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(statementChange).bg, color: activeDeltaStyle(statementChange).text }}>{statementChange == null ? "—" : f1(statementChange)}</td> : null}{showVsOrg ? <td className="cell col-group-start" style={statementVsOrg == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(statementVsOrg).bg, color: activeDeltaStyle(statementVsOrg).text }}>{statementVsOrg == null ? "N/A" : f1(statementVsOrg)}</td> : null}</tr>;
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
            {buildLockButton("statement-table", "statement table")}
          </div>
          </SingleVisualExportFrame>
          </RegisteredVisualExportFrame>
          </SectionWithVerticalLabel>

          {unitLabel === "Brand" &&
          supervisorHeatmapForDept &&
          supervisorHeatmapForDept.supervisors?.length > 0 &&
          supervisorHeatmapForDept.statements?.length > 0 ? (
            <>
              <p className="slabel" style={{ marginBottom: 8 }}>
                {data.supervisorHeatmap?.indexName || "Leadership"} Supervisor Heat Map
              </p>
              <div className="stmt-wrap" style={{ marginBottom: chromeless ? 36 : 18 }}>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 1180,
                      fontSize: 12.5,
                      tableLayout: "fixed",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: 560 }} />
                      {supervisorHeatmapForDept.supervisors.map((supervisor) => (
                        <col key={`sup-col-${supervisor.id}`} style={{ width: 86 }} />
                      ))}
                      <col style={{ width: 78 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th
                          style={{
                            background: "#E2E8EF",
                            textAlign: "left",
                            padding: "11px 12px",
                            border: "1px solid #D3DDE7",
                            color: "#6E7E96",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Leadership Statement
                        </th>
                        {supervisorHeatmapForDept.supervisors.map((supervisor) => {
                          const split = splitSupervisorName(supervisor.name);
                          return (
                            <th
                              key={supervisor.id}
                              style={{
                                background: "#E2E8EF",
                                textAlign: "center",
                                padding: "11px 8px",
                                border: "1px solid #D3DDE7",
                                color: "#6E7E96",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                lineHeight: 1.1,
                                height: 52,
                              }}
                            >
                              <span className="block">
                                <span className="block">{split.top}</span>
                                <span className="block">{split.bottom}</span>
                              </span>
                            </th>
                          );
                        })}
                        <th
                          style={{
                            background: "#E2E8EF",
                            textAlign: "center",
                            padding: "11px 8px",
                            border: "1px solid #8798AA",
                            color: "#6E7E96",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Avg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisorHeatmapForDept.statements.map((statement) => {
                        // Unit average for the row is the projection's person
                        // average for this statement, not a mean of supervisor cells.
                        const rowAverage =
                          typeof statement.brandOverall === "number" ? round1(statement.brandOverall) : 0;
                        const rowAverageColor = scoreColor(rowAverage);
                        return (
                          <tr key={statement.id}>
                            <td
                              style={{
                                border: "1px solid #D3DDE7",
                                padding: "9px 12px",
                                color: "#152238",
                                lineHeight: 1.2,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {statement.text}
                            </td>
                            {supervisorHeatmapForDept.supervisors.map((supervisor) => {
                              const value = statement.scoresBySupervisor?.[supervisor.id] ?? 0;
                              const color = scoreColor(value);
                              return (
                                <td
                                  key={`${statement.id}-${supervisor.id}`}
                                  style={{
                                    border: "1px solid #D3DDE7",
                                    textAlign: "center",
                                    padding: "8px",
                                    background: color,
                                    color: textFor(color),
                                    fontWeight: 800,
                                  }}
                                >
                                  {value.toFixed(1)}
                                </td>
                              );
                            })}
                            <td
                              style={{
                                border: "1px solid #8798AA",
                                textAlign: "center",
                                padding: "8px",
                                background: rowAverageColor,
                                color: textFor(rowAverageColor),
                                fontWeight: 800,
                              }}
                            >
                              {rowAverage.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

          {(unitLabel === "Brand"
            ? segments.filter((segment) => {
                const context = resolveVisualContext(`segment-${segment.id}`);
                const lockedDept = context.deptId || deptId;
                return segment.groups.some((group) => {
                  const cell = group.byDept[lockedDept];
                  return Boolean(cell && cell.responses >= minN);
                });
              })
            : segments.filter((segment) =>
                segment.groups.some((group) => {
                  const cell = group.byDept[deptId];
                  return Boolean(cell && cell.responses >= minN);
                })
              )).length > 0 ? (
            <RegisteredVisualExportFrame
              enabled={registryOn}
              order={30}
              label="Download segments"
              filename={buildDashboardExportFilename({
                client: "dws",
                perspective: `${unitLabel}-results-by-segment`,
                campaign: curCamp.label,
              })}
            >
            <>
              <p className="slabel" style={{ marginBottom: 6 }}>Results by Segment · {current.label} favorability</p>
              <div className="coavg-note" style={{ marginBottom: 10 }}><span className="dash" /> Dotted line marks the company-wide average.</div>
              <div className="seg-grid">
                {(unitLabel === "Brand"
                  ? segments.filter((segment) => {
                      const context = resolveVisualContext(`segment-${segment.id}`);
                      const lockedDept = context.deptId || deptId;
                      return segment.groups.some((group) => {
                        const cell = group.byDept[lockedDept];
                        return Boolean(cell && cell.responses >= minN);
                      });
                    })
                  : segments.filter((segment) =>
                      segment.groups.some((group) => {
                        const cell = group.byDept[deptId];
                        return Boolean(cell && cell.responses >= minN);
                      })
                    )).map((segment) => {
                  const context = resolveVisualContext(`segment-${segment.id}`);
                  const lockedDept = context.deptId || deptId;
                  const lockedCampaign = timeline.find((item) => item.id === context.campaignId) ?? curCamp;
                  return (
                    <SegmentCard
                      key={segment.id}
                      segment={segment}
                      deptId={lockedDept}
                      minN={minN}
                      companyAvg={companyOverall(lockedCampaign) ?? 0}
                      scoreColor={scoreColor}
                      lockButton={buildLockButton(`segment-${segment.id}`, `${segment.label} segment`)}
                    />
                  );
                })}
              </div>
            </>
            </RegisteredVisualExportFrame>
          ) : null}
        </div>
      </main>

      <aside className="rail right">
        <EEContextRail
          howToRead={hasComparison
            ? (showVsOrg
              ? `Cells are favorability points. Delta compares the selected survey to the prior survey; vs Org compares this ${unitLabel.toLowerCase()} to the company average.`
              : "Cells are favorability points. Delta compares the selected survey to the prior survey.")
            : (showVsOrg
              ? `Cells are favorability points. vs Org compares this ${unitLabel.toLowerCase()} to the company average.`
              : "Cells are favorability points.")}
          scale={scale}
          scoreLegendLabel="Score Scale (Yellow-Blue)"
          scoreLegendGradient="linear-gradient(90deg, #D7B35A 0%, #FFFFFF 50%, #3F5F86 100%)"
          deltaLegendGradient="linear-gradient(90deg, #D46A6A 0%, #F5EFEF 50%, #59885D 100%)"
        />
      </aside>
    </div>
  );
}

