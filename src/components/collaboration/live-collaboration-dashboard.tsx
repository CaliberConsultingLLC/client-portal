"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePersistedDashboardFilter } from "@/hooks/use-persisted-dashboard-filter";
import { buildDashboardFilterStoreKey } from "@/lib/portal/dashboard-filter-cookie";
import { CollaborationDashboardClient } from "@/app/collaboration/[slug]/dashboard-client";
import { EmbeddedFilterCard, PillOptionRow } from "@/components/dashboard/design-shell";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import {
  ActionPrioritiesTab,
  CiHotspotsTab,
  CriticalRelationshipsTab,
  DepartmentCdrsReportTab,
  DepartmentCiReportTab,
  Department360Tab,
  DemoCdrsReportTab,
  DemoCiReportTab,
  ExecutiveSummaryTab,
  ReportSummaryHeader,
  SegmentSignalsTab,
} from "@/components/collaboration/demo-report-tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  filterDemoRespondents,
  type DemoFilters,
  type DemoGeneration,
  type DemoRole,
  type DemoTenureBand,
} from "@/lib/collaboration/demo-data";
import {
  buildActionPriorities,
  buildDepartmentPriorityRows,
  buildDepartmentSegmentSummary,
  buildExecutiveKpis,
  buildExecutiveNarrative,
  buildPartnerQuestionHotspots,
  buildQuestionInsights,
  buildRelationshipInsights,
  buildSegmentSummary,
} from "@/lib/collaboration/demo-insights";
import {
  buildCollaborationDataFromRespondents,
  type CollaborationComment,
  type CollaborationDataset,
} from "@/lib/collaboration/collaboration-dataset";
import { succinctCiStatementLabel } from "@/lib/collaboration/display-format";

interface LiveFilters {
  department: string;
  role: string;
  generation: string;
  tenure: string;
}

const ALL_FILTERS: LiveFilters = { department: "all", role: "all", generation: "all", tenure: "all" };

interface DashboardModeSection {
  id: string;
  label: string;
  tabIds: string[];
}

const MODE_SECTIONS: DashboardModeSection[] = [
  {
    id: "executive",
    label: "Executive",
    tabIds: ["overview", "executive-summary", "cdrs-heatmap", "cdrs", "ci", "segment-signals"],
  },
  {
    id: "department",
    label: "Department",
    tabIds: ["department-360", "dept", "department-ci-report", "comments"],
  },
];

interface LiveCollaborationDashboardProps {
  dataset: CollaborationDataset;
  organizationName: string;
  campaignName: string;
  logoUrl?: string;
}

const PERSPECTIVE_GUIDANCE: Record<string, { title: string; paragraphs: string[] }> = {
  overview: {
    title: "How to read this",
    paragraphs: [
      "Overview summarizes enterprise-wide collaboration health before you drill into department or segment detail.",
      "Average CDRS reflects cross-department relationship strength. Average CI reflects collaboration quality on coordination, communication, and follow-through.",
    ],
  },
  "executive-summary": {
    title: "How to read this",
    paragraphs: [
      "Executive Summary highlights departments and relationship seams that need leadership ownership.",
      "Start with the lowest incoming CDRS and the largest perception gaps before moving to local coaching.",
    ],
  },
  "cdrs-heatmap": {
    title: "How to read this",
    paragraphs: [
      "Each cell shows how strongly the column department rates its working relationship with the row department.",
      "Use row and column totals to spot departments that are consistently strong or weak across the matrix.",
    ],
  },
  cdrs: {
    title: "How to read this",
    paragraphs: [
      "Incoming CDRS reflects how the active segment rates each department. Outgoing CDRS reflects how each department in the active segment rates the rest of the organization.",
      "This is the clearest way to see whether newer employees, managers, or executives are experiencing the enterprise differently.",
      "Use the gap between incoming and outgoing to decide whether the issue is local friction, enterprise drag, or a perception blind spot.",
    ],
  },
  ci: {
    title: "How to read this",
    paragraphs: [
      "Because collaboration index is perception-based, this view is best for uncovering which groups are experiencing coordination, communication, and follow-through differently.",
      "The heatmap highlights which dimensions are weakest by department under the active segment lens.",
      "Start with the weakest statement before trying to improve the overall index.",
    ],
  },
  "segment-signals": {
    title: "How to read this",
    paragraphs: [
      "This view is intentionally outgoing-only. It shows how different employee segments experience the rest of the organization.",
      "Use it to spot where trust or collaboration quality is breaking for a specific population before the issue becomes enterprise-wide.",
    ],
  },
  dept: {
    title: "How to read this",
    paragraphs: [
      "Incoming CDRS shows how other departments experience the selected team. Outgoing CDRS shows how that team rates its partners in return.",
      "The relationship map and gap metrics help identify where perception is misaligned across departments.",
    ],
  },
  "department-ci-report": {
    title: "How to read this",
    paragraphs: [
      "Collaboration Index scores reflect how employees experience working with the selected department across coordination, communication, and follow-through.",
      "Use the Statement selector in the left rail to filter the flow chart to a single CI question. Statement scores above always show the full index.",
    ],
  },
  "department-360": {
    title: "How to read this",
    paragraphs: [
      "Dept 360 combines CDRS and CI context with a narrative read on how the selected department is experienced.",
      "Use the department story and benchmark cards to decide where to protect strengths and repair weak seams.",
    ],
  },
  comments: {
    title: "How to read this",
    paragraphs: [
      "Open-text comments capture qualitative feedback about working with the selected department.",
      "Read themes across prompts before treating any single comment as representative of the whole team.",
    ],
  },
};

function CommentsTab({
  comments,
  departments,
  selectedDepartment,
}: {
  comments: CollaborationComment[];
  departments: string[];
  selectedDepartment: string;
}) {
  const deptComments = comments.filter(
    (comment) => comment.aboutDepartment === selectedDepartment
  );
  const prompts = Array.from(new Set(deptComments.map((comment) => comment.prompt)));
  const totalForDept = deptComments.length;

  return (
    <div className="space-y-6">
      <ReportSummaryHeader
        title="Comments"
        description={
          <>
            Open-text feedback about working with{" "}
            <span className="font-semibold text-text-primary">{selectedDepartment}</span>
            . Use the department selector in the left rail to switch teams.
          </>
        }
        metrics={[{ label: "Responses", value: totalForDept }]}
      />

      {totalForDept === 0 ? (
        <Card className="border-border-strong">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-bold text-text-primary">No comments yet</p>
            <p className="mt-2 text-sm text-text-secondary">
              No open-text feedback was submitted about {selectedDepartment}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt, promptIndex) => {
            const entries = deptComments.filter((comment) => comment.prompt === prompt);
            return (
              <RegisteredVisualExportFrame
                key={prompt}
                order={10 + promptIndex}
                label="Download comments"
                filename={`collaboration-comments-${promptIndex + 1}.png`}
              >
              <div
                className="overflow-hidden rounded-2xl border border-[rgba(135,152,170,0.7)] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.24),0_1px_3px_rgba(15,23,42,0.20)]"
              >
                <div className="border-b border-[#D3DDE7] bg-[#F1F4F7] px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E7E96]">
                    Question
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#152238]">{prompt}</p>
                  <p className="mt-1 text-xs text-[#6E7E96]">
                    {entries.length} response{entries.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="space-y-2 px-5 py-4">
                  {entries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-[#D3DDE7] bg-[#FAFCFD] px-3 py-2.5"
                    >
                      <p className="text-sm leading-relaxed text-[#152238]">{entry.text}</p>
                      <p className="mt-1 text-xs text-[#6E7E96]">
                        #{index + 1}
                        {entry.fromDepartment ? ` · ${entry.fromDepartment}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              </RegisteredVisualExportFrame>
            );
          })}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Departments with feedback:{" "}
        {departments
          .filter((dept) => comments.some((comment) => comment.aboutDepartment === dept))
          .join(", ") || "None"}
        .
      </p>
    </div>
  );
}

export function LiveCollaborationDashboard({
  dataset,
  organizationName,
  campaignName,
  logoUrl = "/top-flight-logo.png",
}: LiveCollaborationDashboardProps) {
  const { departments, respondents, comments, data, ciQuestions, roles, generations, tenures } =
    dataset;

  const filterStoreKey = buildDashboardFilterStoreKey(["collab", organizationName, campaignName]);
  const [selectedDepartment, setSelectedDepartment] = usePersistedDashboardFilter(
    filterStoreKey,
    "selectedDepartment",
    () => departments[0] ?? ""
  );
  const [reportFilters, setReportFilters] = usePersistedDashboardFilter<LiveFilters>(
    filterStoreKey,
    "reportFilters",
    ALL_FILTERS
  );
  const [activeMode, setActiveMode] = useState("executive");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCiStatement, setSelectedCiStatement] = usePersistedDashboardFilter<number | "all">(
    filterStoreKey,
    "selectedCiStatement",
    "all"
  );
  const searchParams = useSearchParams();
  const deepLinkAppliedRef = useRef(false);

  useEffect(() => {
    if (deepLinkAppliedRef.current || !searchParams) return;
    const perspectiveParam = searchParams.get("perspective");
    const departmentParam = searchParams.get("department");
    if (!perspectiveParam && !departmentParam) {
      deepLinkAppliedRef.current = true;
      return;
    }

    if (perspectiveParam) {
      const mode = MODE_SECTIONS.find((section) =>
        section.tabIds.includes(perspectiveParam)
      );
      if (mode) {
        setActiveMode(mode.id);
        setActiveTab(perspectiveParam);
      }
    }
    if (departmentParam && departments.includes(departmentParam)) {
      setSelectedDepartment(departmentParam);
    }
    deepLinkAppliedRef.current = true;
  }, [departments, searchParams]);

  const effectiveSelectedDepartment = departments.includes(selectedDepartment)
    ? selectedDepartment
    : departments[0] ?? "";

  useEffect(() => {
    setSelectedCiStatement("all");
  }, [effectiveSelectedDepartment]);

  const selectedDeptCiStatements = useMemo(() => {
    const detail = data.departmentDetails.find(
      (department) => department.department === effectiveSelectedDepartment
    );
    return detail?.questionScores ?? [];
  }, [data.departmentDetails, effectiveSelectedDepartment]);

  const reportFilteredRespondents = useMemo(
    () => filterDemoRespondents(respondents, reportFilters as unknown as DemoFilters),
    [respondents, reportFilters]
  );
  const reportData = useMemo(
    () =>
      buildCollaborationDataFromRespondents(
        reportFilteredRespondents,
        departments,
        ciQuestions
      ),
    [reportFilteredRespondents, departments, ciQuestions]
  );

  const relationships = useMemo(
    () => buildRelationshipInsights(respondents, departments),
    [respondents, departments]
  );
  const executiveKpis = useMemo(
    () => buildExecutiveKpis(data, relationships),
    [data, relationships]
  );
  const executiveNarrative = useMemo(
    () => buildExecutiveNarrative(data, relationships),
    [data, relationships]
  );
  const departmentRows = useMemo(
    () =>
      buildDepartmentPriorityRows(respondents, departments, effectiveSelectedDepartment),
    [respondents, departments, effectiveSelectedDepartment]
  );
  const questionInsights = useMemo(
    () => buildQuestionInsights(respondents, effectiveSelectedDepartment, ciQuestions),
    [respondents, effectiveSelectedDepartment, ciQuestions]
  );
  const partnerHotspots = useMemo(
    () =>
      buildPartnerQuestionHotspots(
        respondents,
        departments,
        effectiveSelectedDepartment,
        ciQuestions
      ),
    [respondents, departments, effectiveSelectedDepartment, ciQuestions]
  );
  const roleSummary = useMemo(
    () => buildSegmentSummary(respondents, data, "role"),
    [respondents, data]
  );
  const generationSummary = useMemo(
    () => buildSegmentSummary(respondents, data, "generation"),
    [respondents, data]
  );
  const tenureSummary = useMemo(
    () => buildSegmentSummary(respondents, data, "tenure"),
    [respondents, data]
  );
  const departmentIncomingRoleSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        respondents,
        effectiveSelectedDepartment,
        "role",
        "incoming"
      ),
    [respondents, effectiveSelectedDepartment]
  );
  const departmentIncomingGenerationSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        respondents,
        effectiveSelectedDepartment,
        "generation",
        "incoming"
      ),
    [respondents, effectiveSelectedDepartment]
  );
  const departmentIncomingTenureSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        respondents,
        effectiveSelectedDepartment,
        "tenure",
        "incoming"
      ),
    [respondents, effectiveSelectedDepartment]
  );
  const departmentOutgoingRoleSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        respondents,
        effectiveSelectedDepartment,
        "role",
        "outgoing"
      ),
    [respondents, effectiveSelectedDepartment]
  );
  const actionPriorities = useMemo(
    () =>
      buildActionPriorities(
        departmentRows,
        questionInsights,
        departmentOutgoingRoleSummary
      ),
    [departmentRows, questionInsights, departmentOutgoingRoleSummary]
  );

  const reportRoles = roles as unknown as readonly DemoRole[];
  const reportGenerations = generations as unknown as readonly DemoGeneration[];
  const reportTenures = tenures as unknown as readonly DemoTenureBand[];

  const orgAverageCi = useMemo(() => {
    const scores = data.departmentMetrics
      .map((metric) => metric.collaborationIndex)
      .filter((score) => score > 0);
    return scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
  }, [data.departmentMetrics]);

  const guidance =
    PERSPECTIVE_GUIDANCE[activeTab] ?? {
      title: "About this report",
      paragraphs: ["Use the Reports panel to change perspective or filter the active segment."],
    };
  // Department-scoped reports show " — {department}" after the title so it's
  // clear up top which team the report is built around.
  const DEPARTMENT_SCOPED_TABS = new Set([
    "department-360",
    "dept",
    "department-ci-report",
    "comments",
  ]);
  const reportTitleSuffix = DEPARTMENT_SCOPED_TABS.has(activeTab)
    ? effectiveSelectedDepartment
    : undefined;
  const showDepartmentSection = activeMode === "department";
  const showCiStatementSection = activeTab === "department-ci-report";
  const showSegmentSection = activeTab === "cdrs" || activeTab === "ci";
  const hasFilters = showDepartmentSection || showCiStatementSection || showSegmentSection;
  const segmentActive =
    reportFilters.department !== "all" ||
    reportFilters.role !== "all" ||
    reportFilters.generation !== "all" ||
    reportFilters.tenure !== "all";

  // Left rail (client identity) + report navigation are provided by the shared
  // design shell in CollaborationDashboardClient; we only feed filters/context.
  const filterSections = hasFilters ? (
    <div className="flex flex-col gap-3">
      {showDepartmentSection ? (
        <EmbeddedFilterCard title="Selected Department">
          <PillOptionRow
            value={effectiveSelectedDepartment}
            onChange={setSelectedDepartment}
            options={departments.map((department) => ({ id: department, label: department }))}
          />
        </EmbeddedFilterCard>
      ) : null}
      {showCiStatementSection ? (
        <EmbeddedFilterCard title="Flow Chart Focus">
          <select
            value={selectedCiStatement === "all" ? "all" : String(selectedCiStatement)}
            onChange={(event) =>
              setSelectedCiStatement(
                event.target.value === "all" ? "all" : Number(event.target.value)
              )
            }
            className="w-full rounded-xl border border-[#C8D2CF] bg-white px-3 py-2 text-sm font-semibold text-[#152238] focus:border-nsp-blue-300 focus:outline-none"
          >
            <option value="all">All statements (aggregate)</option>
            {selectedDeptCiStatements.map((statement, index) => (
              <option key={statement.question} value={String(index)}>
                {succinctCiStatementLabel(statement.question)}
              </option>
            ))}
          </select>
        </EmbeddedFilterCard>
      ) : null}
      {showSegmentSection ? (
        <>
          <EmbeddedFilterCard title="Department">
            <PillOptionRow
              value={reportFilters.department}
              onChange={(value) => setReportFilters((prev) => ({ ...prev, department: value }))}
              options={[
                { id: "all", label: "All" },
                ...departments.map((department) => ({ id: department, label: department })),
              ]}
            />
          </EmbeddedFilterCard>
          <EmbeddedFilterCard title="Role">
            <PillOptionRow
              value={reportFilters.role}
              onChange={(value) => setReportFilters((prev) => ({ ...prev, role: value }))}
              options={[
                { id: "all", label: "All" },
                ...roles.map((role) => ({ id: role, label: role })),
              ]}
            />
          </EmbeddedFilterCard>
          <EmbeddedFilterCard title="Generation">
            <PillOptionRow
              value={reportFilters.generation}
              onChange={(value) =>
                setReportFilters((prev) => ({ ...prev, generation: value }))
              }
              options={[
                { id: "all", label: "All" },
                ...generations.map((generation) => ({ id: generation, label: generation })),
              ]}
            />
          </EmbeddedFilterCard>
          <EmbeddedFilterCard title="Tenure">
            <PillOptionRow
              value={reportFilters.tenure}
              onChange={(value) => setReportFilters((prev) => ({ ...prev, tenure: value }))}
              options={[
                { id: "all", label: "All" },
                ...tenures.map((tenure) => ({ id: tenure, label: tenure })),
              ]}
            />
          </EmbeddedFilterCard>
          <div className="flex flex-col gap-2 px-0.5">
            <p style={{ fontSize: 11, color: "#8798AA" }}>
              {reportFilteredRespondents.length} matching respondent
              {reportFilteredRespondents.length === 1 ? "" : "s"}
            </p>
            {segmentActive ? (
              <button
                type="button"
                onClick={() => setReportFilters(ALL_FILTERS)}
                className="w-full rounded-xl border border-[#C8D2CF] bg-white px-3 py-2 text-center text-xs font-semibold text-[#3B4B63] transition hover:bg-[#F5F7F8]"
              >
                Reset
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  ) : null;

  // Report navigation is rendered by the shared design shell in
  // CollaborationDashboardClient; we only feed it filters + guidance slots.
  return (
    <CollaborationDashboardClient
      data={data}
      campaignName={campaignName}
      organizationName={organizationName}
      logoUrl={logoUrl}
      reportTitleSuffix={reportTitleSuffix}
      rightRailFilters={filterSections}
      rightRailGuidance={
        <div className="flex flex-col gap-2">
          {guidance.paragraphs.map((paragraph) => (
            <p key={paragraph} style={{ fontSize: 12, lineHeight: 1.5, color: "#3B4B63" }}>
              {paragraph}
            </p>
          ))}
        </div>
      }
      hideTitleRow
      activeModeId={activeMode}
      onActiveModeChange={setActiveMode}
      activeTabId={activeTab}
      onActiveTabChange={setActiveTab}
      modeSections={MODE_SECTIONS}
      tabOverrides={[
        { id: "cdrs-heatmap", label: "Heatmap" },
        {
          id: "cdrs",
          content: (
            <DemoCdrsReportTab
              data={reportData}
              filters={reportFilters as unknown as DemoFilters}
              onFiltersChange={(next) => setReportFilters(next as LiveFilters)}
              roles={reportRoles}
              generations={reportGenerations}
              tenures={reportTenures}
              matchingRespondents={reportFilteredRespondents.length}
              hideFilters
            />
          ),
        },
        {
          id: "ci",
          content: (
            <DemoCiReportTab
              data={reportData}
              filters={reportFilters as unknown as DemoFilters}
              onFiltersChange={(next) => setReportFilters(next as LiveFilters)}
              roles={reportRoles}
              generations={reportGenerations}
              tenures={reportTenures}
              matchingRespondents={reportFilteredRespondents.length}
              hideFilters
              orgAverageCi={orgAverageCi}
            />
          ),
        },
        {
          id: "dept",
          label: "CDRS Report",
          content: (
            <DepartmentCdrsReportTab
              data={data}
              selectedDepartment={effectiveSelectedDepartment}
              roleRows={departmentIncomingRoleSummary}
              generationRows={departmentIncomingGenerationSummary}
              tenureRows={departmentIncomingTenureSummary}
            />
          ),
        },
      ]}
      tabOrder={[
        "overview",
        "executive-summary",
        "critical-relationships",
        "cdrs-heatmap",
        "cdrs",
        "ci",
        "ci-hotspots",
        "segment-signals",
        "department-360",
        "dept",
        "department-ci-report",
        "comments",
        "action-priorities",
      ]}
      extraTabs={[
        {
          id: "executive-summary",
          label: "Executive Summary",
          content: (
            <ExecutiveSummaryTab
              data={data}
              kpis={executiveKpis}
              narrative={executiveNarrative}
              relationships={relationships}
            />
          ),
        },
        {
          id: "critical-relationships",
          label: "Critical Relationships",
          content: <CriticalRelationshipsTab relationships={relationships} />,
        },
        {
          id: "segment-signals",
          label: "Segment Signals",
          content: (
            <SegmentSignalsTab
              roleSummary={roleSummary}
              generationSummary={generationSummary}
              tenureSummary={tenureSummary}
            />
          ),
        },
        {
          id: "department-360",
          label: "Dept 360",
          content: (
            <Department360Tab
              data={data}
              selectedDepartment={effectiveSelectedDepartment}
              rows={departmentRows}
              questionInsights={questionInsights}
              respondents={respondents}
            />
          ),
        },
        {
          id: "department-ci-report",
          label: "CI Report",
          content: (
            <DepartmentCiReportTab
              data={data}
              selectedDepartment={effectiveSelectedDepartment}
              respondents={respondents}
              departments={departments}
              selectedStatementIndex={selectedCiStatement}
            />
          ),
        },
        {
          id: "ci-hotspots",
          label: "CI Hotspots",
          content: (
            <CiHotspotsTab
              selectedDepartment={effectiveSelectedDepartment}
              questionInsights={questionInsights}
              partnerHotspots={partnerHotspots}
            />
          ),
        },
        {
          id: "comments",
          label: "Comments",
          content: (
            <CommentsTab
              comments={comments}
              departments={departments}
              selectedDepartment={effectiveSelectedDepartment}
            />
          ),
        },
        {
          id: "action-priorities",
          label: "Action Priorities",
          content: (
            <ActionPrioritiesTab
              selectedDepartment={effectiveSelectedDepartment}
              priorities={actionPriorities}
              rows={departmentRows}
            />
          ),
        },
      ]}
    />
  );
}
