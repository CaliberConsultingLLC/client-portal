"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { CollaborationDashboardClient } from "@/app/collaboration/[slug]/dashboard-client";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

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

// ── Left-rail kit (matches the Employee Experience demo left nav) ──────────────

function RailClientCard({
  logoUrl,
  organizationName,
  reportName,
}: {
  logoUrl: string;
  organizationName: string;
  reportName: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#8798AA] bg-white px-4 pb-4 pt-[18px] text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="mx-auto w-[180px] rounded-[14px] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`${organizationName} logo`}
          className="block h-auto w-full object-contain"
        />
      </div>
      <p className="mt-3 text-[11.5px] font-bold uppercase leading-[1.35] tracking-[0.1em] text-text-primary">
        {reportName}
      </p>
    </div>
  );
}

function RailReportNav({
  sections,
  activeMode,
  activeTab,
  onModeChange,
  onTabChange,
  labelFor,
}: {
  sections: DashboardModeSection[];
  activeMode: string;
  activeTab: string;
  onModeChange: (id: string) => void;
  onTabChange: (id: string) => void;
  labelFor: (id: string) => string;
}) {
  const active = sections.find((section) => section.id === activeMode) ?? sections[0];
  if (!active) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#8798AA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="border-b border-border-subtle px-4 py-3">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-text-muted">
          Reports
        </span>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="flex gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => onModeChange(section.id)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                section.id === active.id
                  ? "bg-[#D7B35A] text-[#242424]"
                  : "border border-[#D4DAD6] bg-[#F5F7F5] text-[#3B4B63] hover:border-[#386B45] hover:bg-[#386B45] hover:text-white"
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          {active.tabIds.map((id) => {
            const isActive = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors",
                  isActive
                    ? "border border-[#8798AA] bg-white text-text-primary shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                    : "border border-transparent text-text-secondary hover:bg-[#EEF2EE]"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    isActive ? "bg-[#C99A3C]" : "bg-[#C8D2CF]"
                  )}
                />
                {labelFor(id)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RailSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#8798AA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-text-muted">
          {title}
        </span>
        <ChevronRight
          className={`h-4 w-4 text-text-muted transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="border-t border-border-subtle px-4 pb-4 pt-3">{children}</div>
      ) : null}
    </div>
  );
}

function RailSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

function RightRailGuidance({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <RailSection title={title} defaultOpen>
      <div className="space-y-3">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-text-secondary">
            {paragraph}
          </p>
        ))}
      </div>
    </RailSection>
  );
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
        prompts.map((prompt) => {
          const entries = deptComments.filter((comment) => comment.prompt === prompt);
          return (
            <Card key={prompt} className="border-border-strong">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-text-primary">
                  {prompt}
                </CardTitle>
                <CardDescription>{entries.length} responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-border-strong bg-surface-2 p-4"
                  >
                    <p className="text-sm leading-relaxed text-text-primary">
                      “{entry.text}”
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border-strong">
                        {entry.fromDepartment}
                      </Badge>
                      {entry.role ? (
                        <Badge variant="secondary">{entry.role}</Badge>
                      ) : null}
                      {entry.generation ? (
                        <Badge variant="secondary">{entry.generation}</Badge>
                      ) : null}
                      {entry.tenure ? (
                        <Badge variant="secondary">{entry.tenure}</Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
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

const PERSPECTIVE_LABELS: Record<string, string> = {
  overview: "Overview",
  "executive-summary": "Executive Summary",
  "cdrs-heatmap": "Heatmap",
  cdrs: "CDRS",
  ci: "CI",
  "segment-signals": "Segment Signals",
  "department-360": "Dept 360",
  dept: "CDRS Report",
  "department-ci-report": "CI Report",
  "department-segments": "Dept Segments",
  comments: "Comments",
};

export function LiveCollaborationDashboard({
  dataset,
  organizationName,
  campaignName,
  logoUrl = "/top-flight-logo.png",
}: LiveCollaborationDashboardProps) {
  const { departments, respondents, comments, data, ciQuestions, roles, generations, tenures } =
    dataset;

  const [selectedDepartment, setSelectedDepartment] = useState(departments[0] ?? "");
  const [reportFilters, setReportFilters] = useState<LiveFilters>(ALL_FILTERS);
  const [activeMode, setActiveMode] = useState("executive");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCiStatement, setSelectedCiStatement] = useState<number | "all">("all");

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

  const reportName = PERSPECTIVE_LABELS[activeTab] ?? "Collaboration";
  const guidance =
    PERSPECTIVE_GUIDANCE[activeTab] ?? {
      title: "About this report",
      paragraphs: ["Use the Reports panel to change perspective or filter the active segment."],
    };
  const showDepartmentSection = activeMode === "department";
  const showCiStatementSection = activeTab === "department-ci-report";
  const showSegmentSection = activeTab === "cdrs" || activeTab === "ci";
  const hasFilters = showDepartmentSection || showCiStatementSection || showSegmentSection;
  const segmentActive =
    reportFilters.department !== "all" ||
    reportFilters.role !== "all" ||
    reportFilters.generation !== "all" ||
    reportFilters.tenure !== "all";

  // Left rail: client identity only. Filters + report navigation live on the right.
  const leftRail = (
    <div className="space-y-3 xl:sticky xl:top-6 xl:self-start">
      <RailClientCard
        logoUrl={logoUrl}
        organizationName={organizationName}
        reportName={reportName}
      />
    </div>
  );

  const filterSections = hasFilters ? (
    <RailSection title="Filters">
      <div className="space-y-4">
        {showDepartmentSection ? (
          <RailSelect
            label="Selected department"
            value={effectiveSelectedDepartment}
            onChange={setSelectedDepartment}
          >
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </RailSelect>
        ) : null}
        {showCiStatementSection ? (
          <RailSelect
            label="Flow chart focus"
            value={selectedCiStatement === "all" ? "all" : String(selectedCiStatement)}
            onChange={(value) =>
              setSelectedCiStatement(value === "all" ? "all" : Number(value))
            }
          >
            <option value="all">All statements (aggregate)</option>
            {selectedDeptCiStatements.map((statement, index) => (
              <option key={statement.question} value={String(index)}>
                {succinctCiStatementLabel(statement.question)}
              </option>
            ))}
          </RailSelect>
        ) : null}
        {showSegmentSection ? (
          <>
            <RailSelect
              label="Department"
              value={reportFilters.department}
              onChange={(value) => setReportFilters((prev) => ({ ...prev, department: value }))}
            >
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </RailSelect>
            <RailSelect
              label="Role"
              value={reportFilters.role}
              onChange={(value) => setReportFilters((prev) => ({ ...prev, role: value }))}
            >
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </RailSelect>
            <RailSelect
              label="Generation"
              value={reportFilters.generation}
              onChange={(value) => setReportFilters((prev) => ({ ...prev, generation: value }))}
            >
              <option value="all">All generations</option>
              {generations.map((generation) => (
                <option key={generation} value={generation}>
                  {generation}
                </option>
              ))}
            </RailSelect>
            <RailSelect
              label="Tenure"
              value={reportFilters.tenure}
              onChange={(value) => setReportFilters((prev) => ({ ...prev, tenure: value }))}
            >
              <option value="all">All tenures</option>
              {tenures.map((tenure) => (
                <option key={tenure} value={tenure}>
                  {tenure}
                </option>
              ))}
            </RailSelect>
            <p className="text-xs text-text-muted">
              {reportFilteredRespondents.length} matching respondent
              {reportFilteredRespondents.length === 1 ? "" : "s"}
            </p>
            {segmentActive ? (
              <button
                type="button"
                onClick={() => setReportFilters(ALL_FILTERS)}
                className="w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-xs font-semibold text-text-secondary transition hover:bg-surface-2"
              >
                Reset
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </RailSection>
  ) : null;

  // Right rail: report groupings (navigation) + active filters + guidance.
  const rightRail = (
    <div className="space-y-3 xl:sticky xl:top-6 xl:self-start">
      <RailReportNav
        sections={MODE_SECTIONS}
        activeMode={activeMode}
        activeTab={activeTab}
        onModeChange={(id) => {
          const nextSection = MODE_SECTIONS.find((section) => section.id === id);
          if (!nextSection) return;
          setActiveMode(nextSection.id);
          setActiveTab(nextSection.tabIds[0] ?? "");
        }}
        onTabChange={setActiveTab}
        labelFor={(id) => PERSPECTIVE_LABELS[id] ?? id}
      />
      {filterSections}
      <RightRailGuidance title={guidance.title} paragraphs={guidance.paragraphs} />
    </div>
  );

  return (
    <CollaborationDashboardClient
      data={data}
      campaignName={campaignName}
      organizationName={organizationName}
      leftRailOverride={leftRail}
      rightRailOverride={rightRail}
      hideTitleRow
      hideRibbonNav
      centerBackgroundClassName="bg-[#F4F4EF]"
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
