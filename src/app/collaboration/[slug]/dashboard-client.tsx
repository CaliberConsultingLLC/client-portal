"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePersistedDashboardFilter } from "@/hooks/use-persisted-dashboard-filter";
import { buildDashboardFilterStoreKey } from "@/lib/portal/dashboard-filter-cookie";
import { useSearchParams } from "next/navigation";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { ScoreTable } from "@/components/collaboration/score-table";
import { ColorLegend } from "@/components/collaboration/color-legend";
import { DashboardCanvas, DashboardRibbon } from "@/components/dashboard/dashboard-shell";
import {
  VisualExportProvider,
  VisualExportMetaSetter,
} from "@/components/dashboard/visual-export-registry";
import { CompositeVisualExportButton } from "@/components/dashboard/composite-visual-export-button";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
import { getDataBoxSurfaceStyle } from "@/lib/collaboration/data-box-surface";
import { ReportSummaryHeader } from "@/components/collaboration/demo-report-tabs";
import {
  DashboardDesignShell,
  type DashboardShellView,
  EmbeddedFilterCard,
} from "@/components/dashboard/design-shell";
import {
  CollabHeaderPortalContext,
  COLLAB_HEADER_KPI_SLOT,
} from "@/components/collaboration/report-header-portal";
import { scoreScaleLegendGradient } from "@/components/collaboration/score-color-scale";

import type { CollaborationData } from "@/types/collaboration";

interface DashboardTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface DashboardModeSection {
  id: string;
  label: string;
  tabIds: string[];
}

interface DashboardProps {
  data: CollaborationData;
  campaignName: string;
  organizationName: string;
  /** Client logo shown in the design-shell left rail. */
  logoUrl?: string;
  tabRowAction?: ReactNode;
  tabRowActionModeId?: string;
  floatingPanel?: ReactNode;
  extraTabs?: Array<{
    id: string;
    label: string;
    content: ReactNode;
  }>;
  modeSections?: DashboardModeSection[];
  tabOverrides?: Array<{
    id: string;
    label?: string;
    content?: ReactNode;
  }>;
  tabOrder?: string[];
  /** When provided, replaces the built-in left rail entirely. */
  leftRailOverride?: ReactNode;
  /** When provided, replaces the built-in right rail. Pass null to remove it. */
  rightRailOverride?: ReactNode;
  /**
   * Filter controls slotted into the right rail beneath the report navigation
   * (design-shell mode). Callers pass their active filters here.
   */
  rightRailFilters?: ReactNode;
  /** Guidance/context slotted at the bottom of the right rail (design-shell mode). */
  rightRailGuidance?: ReactNode;
  /**
   * Appended after the report title in the shell header as " — {suffix}".
   * Used to surface the active department on department-scoped reports.
   */
  reportTitleSuffix?: string;
  /**
   * Design shell: tinted canvas, slim ribbon, and report navigation + filters
   * relocated to the right rail. Defaults on for all collaboration surfaces.
   */
  designShell?: boolean;
  /** Hide the redundant per-tab title row above the canvas content. */
  hideTitleRow?: boolean;
  /** Hide the category/perspective selectors in the top ribbon (moved to a rail). */
  hideRibbonNav?: boolean;
  /** Background of the center canvas column. Defaults to solid white (tinted under design shell). */
  centerBackgroundClassName?: string;
  /** Controlled active perspective (tab) id. */
  activeTabId?: string;
  onActiveTabChange?: (id: string) => void;
  /** Controlled active mode (category) id. */
  activeModeId?: string;
  onActiveModeChange?: (id: string) => void;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// ════════════════════════════════════════════════════════════
//  Main Dashboard Component
// ════════════════════════════════════════════════════════════
export function CollaborationDashboardClient({
  data,
  campaignName,
  organizationName,
  logoUrl,
  tabRowAction,
  tabRowActionModeId,
  floatingPanel,
  extraTabs = [],
  modeSections,
  tabOverrides = [],
  tabOrder,
  leftRailOverride,
  rightRailOverride,
  rightRailFilters,
  rightRailGuidance,
  reportTitleSuffix,
  designShell = true,
  hideTitleRow = false,
  hideRibbonNav = false,
  centerBackgroundClassName,
  activeTabId,
  onActiveTabChange,
  activeModeId,
  onActiveModeChange,
}: DashboardProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("overview");
  const [internalActiveMode, setInternalActiveMode] = useState(modeSections?.[0]?.id ?? "");
  const activeTab = activeTabId ?? internalActiveTab;
  const activeMode = activeModeId ?? internalActiveMode;
  const setActiveTab = (id: string) => {
    onActiveTabChange?.(id);
    if (activeTabId === undefined) setInternalActiveTab(id);
  };
  const setActiveMode = (id: string) => {
    onActiveModeChange?.(id);
    if (activeModeId === undefined) setInternalActiveMode(id);
  };
  const filterStoreKey = buildDashboardFilterStoreKey([
    "collab",
    organizationName,
    campaignName,
  ]);
  const [selectedDept, setSelectedDept] = usePersistedDashboardFilter(
    filterStoreKey,
    "selectedDept",
    () => data.departmentDetails[0]?.department ?? data.meta.departments[0] ?? ""
  );
  const searchParams = useSearchParams();
  const deepLinkAppliedRef = useRef(false);

  useEffect(() => {
    if (deepLinkAppliedRef.current || activeTabId !== undefined || !searchParams) return;
    const perspectiveParam = searchParams.get("perspective");
    const departmentParam = searchParams.get("department");
    if (!perspectiveParam && !departmentParam) {
      deepLinkAppliedRef.current = true;
      return;
    }

    if (perspectiveParam) {
      const mode = modeSections?.find((section) => section.tabIds.includes(perspectiveParam));
      if (mode) setActiveMode(mode.id);
      setActiveTab(perspectiveParam);
    }
    if (departmentParam) {
      const departments = data.meta.departments ?? [];
      if (departments.includes(departmentParam)) setSelectedDept(departmentParam);
    }
    deepLinkAppliedRef.current = true;
  }, [activeTabId, data.meta.departments, modeSections, searchParams]);

  const [departmentFiltersOpen, setDepartmentFiltersOpen] = useState(false);
  const overrideMap = new Map(tabOverrides.map((tab) => [tab.id, tab]));
  const defaultTabs: DashboardTab[] = [
    { id: "overview", label: "Overview", content: <OverviewTab data={data} /> },
    {
      id: "cdrs-heatmap",
      label: "CDRS Heatmap",
      content: <CdrsHeatmapTab data={data} />,
    },
    { id: "cdrs", label: "CDRS", content: <CdrsTab data={data} /> },
    { id: "ci", label: "CI", content: <CiTab data={data} /> },
    {
      id: "dept",
      label: "Department Report",
      content: <DeptTab data={data} selectedDept={selectedDept} />,
    },
  ];
  const mergedTabs = [
    ...defaultTabs.map((tab) => ({
      id: tab.id,
      label: overrideMap.get(tab.id)?.label ?? tab.label,
      content:
        overrideMap.get(tab.id)?.content !== undefined
          ? overrideMap.get(tab.id)?.content
          : tab.content,
    })),
    ...extraTabs,
  ];
  const tabs = tabOrder
    ? [
        ...tabOrder
          .map((id) => mergedTabs.find((tab) => tab.id === id))
          .filter((tab): tab is DashboardTab => Boolean(tab)),
        ...mergedTabs.filter((tab) => !tabOrder.includes(tab.id)),
      ]
    : mergedTabs;
  const activeModeSection =
    modeSections?.find((section) => section.id === activeMode) ?? modeSections?.[0];
  const visibleTabs = activeModeSection
    ? activeModeSection.tabIds
        .map((id) => tabs.find((tab) => tab.id === id))
        .filter((tab): tab is DashboardTab => Boolean(tab))
    : tabs;
  const resolvedActiveTabId =
    visibleTabs.find((tab) => tab.id === activeTab)?.id ?? visibleTabs[0]?.id ?? "";
  const activeTabContent =
    visibleTabs.find((tab) => tab.id === resolvedActiveTabId)?.content ?? null;
  const toolbarActionVisible =
    tabRowAction && (!tabRowActionModeId || activeModeSection?.id === tabRowActionModeId);
  const showDepartmentFilter = resolvedActiveTabId === "dept";
  const departmentFilterCard = (
    <Card>
      <button
        type="button"
        onClick={() => setDepartmentFiltersOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold uppercase tracking-wider text-text-primary">
            Department Filters
          </span>
          {departmentFiltersOpen ? (
            <span className="mt-0.5 block text-xs text-text-muted">
              Choose which department this report is built around.
            </span>
          ) : null}
        </span>
        <span className="rounded-full border border-border-strong px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {departmentFiltersOpen ? "Hide" : "Show"}
        </span>
      </button>
      {departmentFiltersOpen ? (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">
            Select Department
          </label>
          <select
            value={selectedDept}
            onChange={(event) => setSelectedDept(event.target.value)}
            className="w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-base font-semibold text-text-primary shadow-sm focus:border-nsp-blue-300 focus:ring-2 focus:ring-nsp-blue-500/15 focus:outline-none"
          >
            {data.meta.departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </Card>
  );

  const activeTabLabel =
    visibleTabs.find((tab) => tab.id === resolvedActiveTabId)?.label ?? "Dashboard";
  const exportFilename = buildDashboardExportFilename({
    client: organizationName || "collaboration",
    perspective: activeTabLabel,
    campaign: campaignName,
  });

  const handleModeChange = (nextModeId: string) => {
    const nextModeSection =
      modeSections?.find((section) => section.id === nextModeId) ?? modeSections?.[0];
    if (!nextModeSection) return;
    setActiveMode(nextModeSection.id);
    setActiveTab(nextModeSection.tabIds[0] ?? "");
  };

  // ── Universal design shell: left Views navigator, right Context/Filters ──
  if (designShell) {
    const shellViews: DashboardShellView[] =
      modeSections && modeSections.length > 0
        ? modeSections.map((section) => ({
            id: section.id,
            label: section.label,
            perspectives: section.tabIds
              .map((id) => tabs.find((tab) => tab.id === id))
              .filter((tab): tab is DashboardTab => Boolean(tab))
              .map((tab) => ({ id: tab.id, label: tab.label })),
          }))
        : [
            {
              id: "reports",
              label: "Reports",
              perspectives: tabs.map((tab) => ({ id: tab.id, label: tab.label })),
            },
          ];
    const activeViewId = activeModeSection?.id ?? shellViews[0]?.id ?? "";

    // Context slot: matches EE exactly — export-as-card, a "Score Scale" legend
    // card, and a "How to Read" card, all using the shared EmbeddedFilterCard.
    const shellContext = (
      <div className="flex flex-col gap-3">
        <CompositeVisualExportButton
          filename={exportFilename}
          logoUrl={logoUrl}
          skipGeneratedHeader
          asContextCard
        />
        <EmbeddedFilterCard title="Score Scale">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>3</span>
            <div
              className="h-3.5 flex-1 rounded-2xl border border-[#C8D2CF]"
              style={{ background: scoreScaleLegendGradient }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>9</span>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #EEF1EE" }}>
            <p
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#8798AA",
                marginBottom: 8,
              }}
            >
              Delta
            </p>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>Decline</span>
              <div
                className="h-3.5 flex-1 rounded-2xl border border-[#C8D2CF]"
                style={{
                  background: "linear-gradient(90deg, #D46A6A 0%, #F5EFEF 50%, #59885D 100%)",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>Gain</span>
            </div>
          </div>
        </EmbeddedFilterCard>
        <EmbeddedFilterCard title="How to Read">
          {rightRailGuidance ?? (
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#3B4B63" }}>
              {organizationName ? `${organizationName} — ` : ""}
              Cross-department relational strength and collaboration analytics built to help leaders
              understand connection quality, friction points, and where to focus action.
            </p>
          )}
        </EmbeddedFilterCard>
      </div>
    );

    // EE-styled fallback department filter for report routes that don't supply
    // their own right-rail filters (keeps the same EmbeddedFilterCard chrome).
    const departmentShellFilter = (
      <EmbeddedFilterCard title="Department">
        <select
          value={selectedDept}
          onChange={(event) => setSelectedDept(event.target.value)}
          className="w-full rounded-xl border border-[#C8D2CF] bg-white px-3 py-2 text-sm font-semibold text-[#152238] focus:border-nsp-blue-300 focus:outline-none"
        >
          {data.meta.departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </EmbeddedFilterCard>
    );

    const hasFilterContent =
      Boolean(rightRailFilters) || Boolean(toolbarActionVisible) || showDepartmentFilter;
    const shellFilters = hasFilterContent ? (
      <div className="flex flex-col gap-3">
        {toolbarActionVisible ? <div>{tabRowAction}</div> : null}
        {rightRailFilters ??
          (showDepartmentFilter && !toolbarActionVisible ? departmentShellFilter : null)}
      </div>
    ) : (
      <p style={{ fontSize: 12, color: "#8798AA" }}>No filters apply to this report.</p>
    );

    return (
      <VisualExportProvider active client={organizationName}>
        <VisualExportMetaSetter title={activeTabLabel} filters={[campaignName]} />
        <DashboardDesignShell
          clientName={organizationName || campaignName}
          logoUrl={logoUrl}
          clientSubline="Collaboration"
          campaignLabel={campaignName}
          eyebrow={activeModeSection?.label?.toUpperCase()}
          reportTitle={reportTitleSuffix ? `${activeTabLabel} — ${reportTitleSuffix}` : activeTabLabel}
          views={shellViews}
          activeViewId={activeViewId}
          activeReportId={resolvedActiveTabId}
          onSelectReport={(viewId, reportId) => {
            if (viewId !== activeViewId) setActiveMode(viewId);
            setActiveTab(reportId);
          }}
          contextSlot={shellContext}
          filtersSlot={shellFilters}
          headerExtraSlotId={COLLAB_HEADER_KPI_SLOT}
          thickerHeaderDivider
          basinReportSurface
        >
          {/* Providing the header slot id makes every ReportSummaryHeader portal
              its KPI tiles into the shell header and drop its inline title/box,
              so there is exactly one header per perspective (mirrors EE). One
              wrapper div keeps report grids deep enough to survive the shell's
              `.fr-embed > div > div` display:block reset. */}
          <CollabHeaderPortalContext.Provider value={COLLAB_HEADER_KPI_SLOT}>
            <div className="space-y-6">
              {floatingPanel}
              {activeTabContent}
            </div>
          </CollabHeaderPortalContext.Provider>
        </DashboardDesignShell>
      </VisualExportProvider>
    );
  }

  // ── Legacy chrome (ribbon + three-zone canvas) for non-shell consumers ──
  const leftRail =
    leftRailOverride !== undefined
      ? leftRailOverride
      : showDepartmentFilter
        ? <div className="lg:sticky lg:top-6 lg:self-start">{departmentFilterCard}</div>
        : undefined;

  return (
    <VisualExportProvider active client={organizationName}>
      <VisualExportMetaSetter title={activeTabLabel} filters={[campaignName]} />
      <DashboardRibbon
        title={campaignName}
        categories={
          hideRibbonNav
            ? []
            : (modeSections ?? []).map((section) => ({ id: section.id, label: section.label }))
        }
        activeCategoryId={activeModeSection?.id}
        onCategoryChange={handleModeChange}
        perspectives={
          hideRibbonNav ? [] : visibleTabs.map((tab) => ({ id: tab.id, label: tab.label }))
        }
        activePerspectiveId={resolvedActiveTabId}
        onPerspectiveChange={setActiveTab}
        legend={
          <div className="flex items-center gap-2.5">
            <ColorLegend />
            <CompositeVisualExportButton filename={exportFilename} />
          </div>
        }
      />
      <div>
      <DashboardCanvas
        leftRail={leftRail}
        centerBackgroundClassName={centerBackgroundClassName}
        rightRail={
          rightRailOverride !== undefined ? (
            rightRailOverride
          ) : (
            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card title="Report Context">
                <p className="text-sm leading-relaxed text-text-secondary">
                  {organizationName ? `${organizationName} — ` : ""}
                  Cross-department relational strength and collaboration analytics built to help leaders
                  understand connection quality, friction points, and where to focus action.
                </p>
              </Card>
            </div>
          )
        }
        maxWidthClassName="max-w-[1320px]"
      >
        {hideTitleRow ? null : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
            <h1 className="text-[18px] font-semibold uppercase leading-none tracking-[0.16em] text-[#2B2B2B] sm:text-[20px]">
              {visibleTabs.find((tab) => tab.id === resolvedActiveTabId)?.label ?? "Dashboard"}
            </h1>
            {toolbarActionVisible ? <div className="w-full max-w-[280px]">{tabRowAction}</div> : null}
          </div>
        )}
        {floatingPanel}
        {activeTabContent}
      </DashboardCanvas>
      </div>
    </VisualExportProvider>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 1: Overview
// ════════════════════════════════════════════════════════════
function OverviewTab({ data }: { data: CollaborationData }) {
  return (
    <div className="space-y-6">
      <ReportSummaryHeader
        title="Overview"
        description="This page explains how to read the collaboration dashboard. CDRS captures cross-department relationship strength; CI captures collaboration quality through statement-level feedback."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RegisteredVisualExportFrame
          order={10}
          label="Download card"
          filename={buildDashboardExportFilename({ client: "collaboration", perspective: "overview-cdrs" })}
          className="h-full"
        >
        <Card title="CDRS Overview" className="h-full text-center">
          <p className="mb-3 text-center text-[13px] leading-relaxed text-text-secondary">
            The Cross-Department Relationship Score (CDRS) measures how strongly
            departments perceive their alignment and working relationship with one
            another.
          </p>
          <p className="mb-3 text-center text-[13px] leading-relaxed text-text-secondary">
            <strong className="text-text-primary">Incoming CDRS</strong> shows how
            other departments rate the team listed.{" "}
            <strong className="text-text-primary">Outgoing CDRS</strong> shows how
            the listed team rated other departments.
          </p>
          <p className="mb-4 text-center text-[13px] italic leading-relaxed text-text-secondary">
            Together, these scores provide a broad sentiment of the working
            relationship between two departments.
          </p>

          <hr className="my-4 border-border-default" />

          <h3 className="mb-2 text-center font-serif text-base font-bold text-text-primary">
            Utilization
          </h3>
          <p className="mb-3 text-center text-[13px] leading-relaxed text-text-secondary">
            Use Incoming CDRS to benchmark expected relational strength across the
            organization and identify where support or intervention may be needed.
          </p>
          <p className="mb-2 text-center text-[12px] italic leading-relaxed text-text-secondary">
            Higher Incoming than Outgoing can suggest needs are not being surfaced
            clearly or addressed fully.
          </p>
          <p className="text-center text-[12px] italic leading-relaxed text-text-secondary">
            Lower Incoming than Outgoing can suggest a department may be unaware
            of the impact its approach is having on others.
          </p>
        </Card>
        </RegisteredVisualExportFrame>

        <RegisteredVisualExportFrame
          order={20}
          label="Download card"
          filename={buildDashboardExportFilename({ client: "collaboration", perspective: "overview-ci" })}
          className="h-full"
        >
        <Card title="Collaboration Index Overview" className="flex h-full flex-col justify-center text-center">
          <p className="mb-3 text-center text-[13px] leading-relaxed text-text-secondary">
            The Collaboration Index (CI) is a deeper, department-specific measure
            of collaboration quality based on optional quantitative and qualitative
            feedback.
          </p>
          <p className="mb-4 text-center text-[13px] italic leading-relaxed text-text-secondary">
            It includes question-level scoring that reveals strengths, challenges,
            and relationship dynamics with more nuance than the broad CDRS score.
          </p>
          <p className="mb-4 text-center text-[13px] leading-relaxed text-text-secondary">
            Because CI is built from multiple statements, it helps distinguish a
            relationship that is broadly strained from one that is only breaking
            down in a few specific operating behaviors.
          </p>

          <hr className="my-4 border-border-default" />

          <h3 className="mb-2 text-center font-serif text-base font-bold text-text-primary">
            Utilization
          </h3>
          <p className="mb-3 text-center text-[13px] leading-relaxed text-text-secondary">
            Use CI scores to recognize both holistic and department-specific
            feedback, facilitate open discussion about weaker relationships, and
            identify the best starting points for strategic shifts.
          </p>
          <p className="text-center text-[13px] leading-relaxed text-text-secondary">
            When paired with qualitative feedback, CI results make it easier to
            prioritize the 2-3 lowest-performing relationships and turn them into
            targeted action plans.
          </p>
        </Card>
        </RegisteredVisualExportFrame>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 2: Cross-Department Relational Strength
// ════════════════════════════════════════════════════════════
function CdrsTab({ data }: { data: CollaborationData }) {
  const incomingData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.incomingCDRS - a.incomingCDRS)
    .map((d) => ({ name: d.department, value: d.incomingCDRS }));

  const outgoingData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.outgoingCDRS - a.outgoingCDRS)
    .map((d) => ({ label: d.department, score: d.outgoingCDRS }));

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
      {/* Left: Overview text */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-orange-300 underline-offset-4">
            Overview
          </h2>
          <p className="mb-3 text-center text-[13px] italic text-text-secondary leading-relaxed">
            The Cross-Department Relationship Score (CDRS) measures how well
            departments perceive the strength of your alignment and working
            relationship.
          </p>
          <p className="mb-2 text-[13px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Incoming CDRS</strong> shows
            how other departments rate the team listed. The{" "}
            <strong className="text-text-primary">Outgoing CDRS</strong> shows
            how the listed team rated other departments.
          </p>
          <p className="mb-4 text-center text-[13px] italic text-text-secondary leading-relaxed">
            Together, these scores provide a broad sentiment of the working
            relationship between two departments.
          </p>

          <hr className="my-4 border-border-default" />

          <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-orange-300 underline-offset-4">
            Utilization
          </h2>
          <p className="mb-3 text-[13px] text-text-secondary leading-relaxed">
            The Incoming CDRS can be used broadly to{" "}
            <strong className="text-text-primary">benchmark</strong> the
            expected relational strength within the organization and{" "}
            <strong className="text-text-primary">
              target improvements fairly
            </strong>
            .
          </p>
          <p className="mb-3 text-[13px] text-text-secondary leading-relaxed">
            Separately, identifying{" "}
            <strong className="text-text-primary">gaps</strong> in the two
            scores can also highlight unique opportunities:
          </p>
          <p className="mb-2 text-[12px] italic text-text-secondary leading-relaxed">
            Teams with higher Incoming than Outgoing scores may not be
            communicating needs clearly or fully processing through concerns in a
            healthy manner.
          </p>
          <p className="text-[12px] italic text-text-secondary leading-relaxed">
            Teams with lower Incoming than Outgoing scores may be ignorant to
            their approach or the impact it&apos;s having on the individuals in
            other departments.
          </p>
        </Card>
      </div>

      {/* Center: Incoming CDRS bar chart */}
      <div className="lg:col-span-5">
        <RegisteredVisualExportFrame
          order={10}
          label="Download chart"
          filename={buildDashboardExportFilename({ client: "collaboration", perspective: "cdrs-incoming" })}
          className="h-full"
        >
          <Card title="Incoming CDRS" className="h-full">
            <GradientBarChart
              data={incomingData}
              average={data.meta.dwsAverageIncoming}
            />
            <p className="mt-2 text-center text-xs text-text-muted">
              Average: {formatScoreForDisplay(data.meta.dwsAverageIncoming)}
            </p>
          </Card>
        </RegisteredVisualExportFrame>
      </div>

      {/* Right: Outgoing CDRS table */}
      <div className="lg:col-span-4">
        <RegisteredVisualExportFrame
          order={20}
          label="Download table"
          filename={buildDashboardExportFilename({ client: "collaboration", perspective: "cdrs-outgoing" })}
          className="h-full"
        >
          <ScoreTable
            title="Outgoing CDRS"
            headers={["Dept", "Score"]}
            rows={outgoingData}
            className="h-full"
          />
        </RegisteredVisualExportFrame>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 3: Collaboration Index
// ════════════════════════════════════════════════════════════
function CiTab({ data }: { data: CollaborationData }) {
  const ciData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.collaborationIndex - a.collaborationIndex)
    .map((d) => ({ name: d.department, value: d.collaborationIndex }));
  const ciAverage = avg(
    data.departmentMetrics
      .map((metric) => metric.collaborationIndex)
      .filter((score) => score > 0)
  );

  // Aggregate CI question scores across all departments
  const aggregatedQuestions = data.meta.ciQuestions.map((q, qi) => {
    const scores = data.departmentMetrics
      .map((d) => d.questionScores[qi]?.score ?? 0)
      .filter((s) => s > 0);
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    return { label: q, score: Math.round(avgScore * 10) / 10 };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left: Overview text */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-orange-300 underline-offset-4">
              Overview
            </h2>
            <p className="mb-3 text-center text-[13px] italic text-text-secondary leading-relaxed">
              The Collaboration Index (CI) is a deeper, department-specific measure
              of collaboration quality. It is based on optional,
              department-selected feedback containing quantitative ratings and
              qualitative comments.
            </p>
            <p className="mb-4 text-[13px] italic text-text-secondary leading-relaxed">
              It includes 9 quantitative questions and 5 qualitative prompts,
              giving a more nuanced view of strengths, challenges, and
              relationship dynamics.
            </p>

            <hr className="my-4 border-border-default" />

            <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-orange-300 underline-offset-4">
              Utilization
            </h2>
            <p className="mb-3 text-[13px] text-text-secondary leading-relaxed">
              Use the Collaboration Index scores to recognize both{" "}
              <strong className="text-text-primary">holistic</strong> and{" "}
              <strong className="text-text-primary">department-specific</strong>{" "}
              feedback. Leverage team strengths and{" "}
              <strong className="text-text-primary">
                facilitate an open conversation
              </strong>{" "}
              about lower scores.
            </p>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Utilize department scores along with qualitative feedback to{" "}
              <strong className="text-text-primary">
                develop strategic shifts
              </strong>{" "}
              in your approach with the{" "}
              <strong className="text-text-primary">
                2-3 lowest-scoring departments
              </strong>{" "}
              shown.
            </p>
          </Card>
        </div>

        {/* Center: CI bar chart */}
        <div className="lg:col-span-5">
          <RegisteredVisualExportFrame
            order={10}
            label="Download chart"
            filename={buildDashboardExportFilename({ client: "collaboration", perspective: "ci-index" })}
            className="h-full"
          >
            <Card title="Departmental Collaboration Index" className="h-full">
              <GradientBarChart
                data={ciData}
                average={ciAverage}
                minValue={3}
                midpoint={6}
                maxValue={9}
              />
              <p className="mt-2 text-center text-xs text-text-muted">
                Average: {formatScoreForDisplay(ciAverage)}
              </p>
            </Card>
          </RegisteredVisualExportFrame>
        </div>

        {/* Right: CI Statements table */}
        <div className="lg:col-span-4">
          <RegisteredVisualExportFrame
            order={20}
            label="Download table"
            filename={buildDashboardExportFilename({ client: "collaboration", perspective: "ci-statements" })}
            className="h-full"
          >
            <ScoreTable
              title="CI Statements"
              headers={["Statement", "Collab Index"]}
              rows={aggregatedQuestions}
              showIndicator
              minValue={3}
              midpoint={6}
              maxValue={9}
              className="h-full"
            />
          </RegisteredVisualExportFrame>
        </div>
      </div>

      <CiHeatmapTab data={data} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 4: Heatmap
// ════════════════════════════════════════════════════════════
function CdrsHeatmapTab({ data }: { data: CollaborationData }) {
  // Sort departments by incoming CDRS
  const sortedDepts = data.departmentMetrics
    .slice()
    .sort((a, b) => b.incomingCDRS - a.incomingCDRS)
    .map((d) => d.department);

  const columnTotals: Record<string, number> = {};
  const rowTotals: Record<string, number> = {};

  for (const dept of data.meta.departments) {
    const metric = data.departmentMetrics.find((m) => m.department === dept);
    columnTotals[dept] = metric?.outgoingCDRS ?? 0;
    rowTotals[dept] = metric?.incomingCDRS ?? 0;
  }

  return (
    <div className="space-y-6">
      <ReportSummaryHeader
        title="Heatmap"
        description="Cross-department relational strength matrix. Each cell shows the average score the row department received from the column department."
        metrics={[
          { label: "Departments", value: sortedDepts.length },
          {
            label: "Avg Incoming",
            value: formatScoreForDisplay(data.meta.dwsAverageIncoming),
          },
          {
            label: "Avg Outgoing",
            value: formatScoreForDisplay(data.meta.dwsAverageOutgoing),
          },
        ]}
      />

      <RegisteredVisualExportFrame
        order={10}
        label="Download heat map"
        filename={buildDashboardExportFilename({ client: "collaboration", perspective: "cdrs-heatmap" })}
      >
      <Card
        title="Cross-Department Relational Strength Heatmap"
        subtitle="Each cell shows the average score that the row department received from the column department"
      >
      <HeatmapChart
        variant="chip"
        rows={sortedDepts}
        columns={sortedDepts}
        data={data.heatmapMatrix}
        columnTotals={columnTotals}
        rowTotals={rowTotals}
      />
    </Card>
    </RegisteredVisualExportFrame>
    </div>
  );
}

function CiHeatmapTab({ data }: { data: CollaborationData }) {
  const departments = data.departmentMetrics.map((metric) => metric.department);
  const ciQuestions = data.meta.ciQuestions;

  const ciHeatmapMatrix = data.departmentMetrics.map((metric) => ({
    department: metric.department,
    scores: Object.fromEntries(
      ciQuestions.map((question, index) => [
        question,
        metric.questionScores[index]?.score ?? null,
      ])
    ),
  }));

  const rowTotals = Object.fromEntries(
    data.departmentMetrics.map((metric) => [
      metric.department,
      metric.collaborationIndex,
    ])
  );

  const columnTotals = Object.fromEntries(
    ciQuestions.map((question, questionIndex) => [
      question,
      avg(
        data.departmentMetrics
          .map((metric) => metric.questionScores[questionIndex]?.score ?? 0)
          .filter((score) => score > 0)
      ),
    ])
  );

  return (
    <RegisteredVisualExportFrame
      order={30}
      label="Download heat map"
      filename={buildDashboardExportFilename({ client: "collaboration", perspective: "ci-heatmap" })}
    >
    <Card
      title="Collaboration Index Heatmap"
      subtitle="Each row shows a department's average score on each CI statement"
    >
      <HeatmapChart
        variant="chip"
        rows={departments}
        columns={ciQuestions}
        data={ciHeatmapMatrix}
        rowTotals={rowTotals}
        columnTotals={columnTotals}
        minValue={3}
        midpoint={6}
        maxValue={9}
      />
    </Card>
    </RegisteredVisualExportFrame>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 5: Department Report
// ════════════════════════════════════════════════════════════
function DeptTab({
  data,
  selectedDept,
}: {
  data: CollaborationData;
  selectedDept: string;
}) {
  const detail = useMemo(
    () => data.departmentDetails.find((d) => d.department === selectedDept),
    [data.departmentDetails, selectedDept]
  );

  if (!detail) return null;

  const incomingBars = detail.incomingByDept
    .filter((d) => d.count >= 2 && d.score > 0)
    .map((d) => ({ name: d.department, value: d.score }));

  const outgoingRows = detail.outgoingByDept
    .filter((d) => d.count >= 2 && d.score > 0)
    .map((d) => ({ label: d.department, score: d.score }));

  const questionRows = detail.questionScores.map((q) => ({
    label: q.question,
    score: q.score,
  }));

  const deptFile = (section: string) =>
    buildDashboardExportFilename({ client: "collaboration", perspective: `dept-${selectedDept}-${section}` });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <RegisteredVisualExportFrame order={10} label="Download summary" filename={deptFile("summary")} className="flex-1">
        <Card className="flex-1">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Selected Department
              </p>
              <p className="rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-lg font-bold text-text-primary shadow-sm">
                {selectedDept}
              </p>
            </div>
            <h2 className="font-serif text-3xl font-bold text-text-primary">
              {selectedDept}
            </h2>
            <div className="ml-auto flex gap-3">
              <KpiCard
                label="Incoming CDRS"
                value={detail.incomingCDRS}
                color="var(--color-nsp-blue-500)"
              />
              <KpiCard
                label="Responses"
                value={detail.responseCount}
                isCount
                color="var(--color-text-secondary)"
              />
              <KpiCard
                label="Outgoing CDRS"
                value={detail.outgoingCDRS}
                color="var(--color-text-primary)"
              />
            </div>
          </div>
        </Card>
        </RegisteredVisualExportFrame>
      </div>

      {/* Body: Overview + Charts */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-3">
          <RegisteredVisualExportFrame order={20} label="Download table" filename={deptFile("statements")} className="h-full">
            <ScoreTable
              title="Collaboration Index — Statements"
              headers={["Statement", "Score"]}
              rows={questionRows}
              showIndicator
              minValue={3}
              midpoint={6}
              maxValue={9}
              className="h-full"
            />
          </RegisteredVisualExportFrame>
        </div>

        <div className="lg:col-span-5">
          <RegisteredVisualExportFrame order={30} label="Download chart" filename={deptFile("incoming")} className="h-full">
            <Card title="Incoming CDRS" className="h-full">
              <GradientBarChart data={incomingBars} />
              <ColorLegend className="mt-3 justify-center" />
            </Card>
          </RegisteredVisualExportFrame>
        </div>

        <div className="lg:col-span-4">
          <RegisteredVisualExportFrame order={40} label="Download table" filename={deptFile("outgoing")} className="h-full">
            <Card title={`Outgoing CDRS — ${selectedDept}`} className="h-full">
              <ScoreTable
                title="Scores"
                headers={["Dept", "CDRS"]}
                rows={outgoingRows}
              />
              <div
                className="mt-4 rounded-2xl border border-border-strong bg-white px-4 py-3"
                style={getDataBoxSurfaceStyle()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">Total</span>
                  <span className="text-lg font-bold text-text-primary">
                    {formatScoreForDisplay(detail.outgoingCDRS)}
                  </span>
                </div>
              </div>
            </Card>
          </RegisteredVisualExportFrame>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Shared Components
// ════════════════════════════════════════════════════════════

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`nsp-card-shadow overflow-hidden rounded-2xl border border-border-strong bg-white p-5 ${className ?? ""}`}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  isCount,
}: {
  label: string;
  value: number;
  color: string;
  isCount?: boolean;
}) {
  return (
    <div
      className="min-w-[120px] rounded-2xl border border-border-strong bg-white px-5 py-3 text-center shadow-sm"
      style={getDataBoxSurfaceStyle()}
    >
      <p className="text-3xl font-extrabold" style={{ color }}>
        {isCount ? value : formatScoreForDisplay(value)}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
    </div>
  );
}
