"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Users, Layers, SlidersHorizontal } from "lucide-react";
import { CollaborationDashboardClient } from "@/app/collaboration/[slug]/dashboard-client";
import {
  ActionPrioritiesTab,
  CiHotspotsTab,
  CriticalRelationshipsTab,
  DepartmentCdrsReportTab,
  DepartmentCiReportTab,
  Department360Tab,
  DepartmentSelector,
  DepartmentSegmentLensTab,
  DemoCdrsReportTab,
  DemoCiReportTab,
  ExecutiveSummaryTab,
  SegmentSignalsTab,
} from "@/components/collaboration/demo-report-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  buildDemoCollaborationData,
  buildDemoRespondents,
  DEMO_GENERATIONS,
  DEMO_ROLES,
  DEMO_SCENARIOS,
  DEMO_TENURE_BANDS,
  deriveScenarioWithDepartmentCount,
  filterDemoRespondents,
  type DemoFilters,
  type DemoRespondent,
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
import { getDataBoxSurfaceStyle } from "@/lib/collaboration/data-box-surface";
import {
  filterCollaborationModeSections,
  filterCollaborationTabIds,
  filterCollaborationTabs,
} from "@/lib/collaboration/perspective-access";
import {
  isCollaborationDepartmentLens,
  resolveCollaborationDepartmentOptions,
  type EmployeeExperienceUserAccess,
} from "@/lib/firebase/user-access";

interface SegmentCardProps {
  title: string;
  counts: Array<{ label: string; filtered: number; total: number }>;
}

function SegmentCard({ title, counts }: SegmentCardProps) {
  return (
    <Card className="border-border-strong">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-[0.18em] text-text-secondary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {counts.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2"
          >
            <span className="text-sm text-text-primary">{item.label}</span>
            <span className="text-xs font-semibold text-text-secondary">
              {item.filtered}/{item.total}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function buildCounts(
  allRespondents: DemoRespondent[],
  filteredRespondents: DemoRespondent[],
  values: readonly string[],
  accessor: (respondent: DemoRespondent) => string
) {
  return values.map((value) => ({
    label: value,
    filtered: filteredRespondents.filter((respondent) => accessor(respondent) === value)
      .length,
    total: allRespondents.filter((respondent) => accessor(respondent) === value)
      .length,
  }));
}

export function CollaborationDemoEnvironment({
  portalAccess,
}: {
  portalAccess?: EmployeeExperienceUserAccess;
} = {}) {
  const searchParams = useSearchParams();
  const [scenarioId, setScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const [seed, setSeed] = useState("northstar-demo-01");
  const [departmentCountInput, setDepartmentCountInput] = useState("");
  const [respondentTargetInput, setRespondentTargetInput] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(
    DEMO_SCENARIOS[0].departments[0]
  );
  const [reportFilters, setReportFilters] = useState<DemoFilters>({
    role: "all",
    generation: "all",
    tenure: "all",
    department: "all",
  });
  const [filters, setFilters] = useState<DemoFilters>({
    role: "all",
    generation: "all",
    tenure: "all",
    department: "all",
  });
  const [executiveRelationshipRanking, setExecutiveRelationshipRanking] = useState<
    string[]
  >(["", "", ""]);

  const baseScenario =
    DEMO_SCENARIOS.find((entry) => entry.id === scenarioId) ?? DEMO_SCENARIOS[0];
  const departmentCountValue =
    departmentCountInput || String(baseScenario.defaultDepartmentCount);
  const departmentCount = Math.max(
    4,
    Math.min(
      baseScenario.departments.length,
      Number.parseInt(departmentCountValue, 10) || baseScenario.defaultDepartmentCount
    )
  );
  const scenario = useMemo(
    () => deriveScenarioWithDepartmentCount(baseScenario, departmentCount),
    [baseScenario, departmentCount]
  );
  const selectableDepartments = useMemo(
    () => resolveCollaborationDepartmentOptions(scenario.departments, portalAccess),
    [scenario.departments, portalAccess]
  );
  const departmentLens = isCollaborationDepartmentLens(portalAccess);
  const effectiveSelectedDepartment = selectableDepartments.includes(selectedDepartment)
    ? selectedDepartment
    : selectableDepartments[0] ?? scenario.departments[0];
  const respondentTargetValue = respondentTargetInput || String(scenario.respondentTarget);
  const respondentTarget = Math.max(
    scenario.departments.length,
    Number.parseInt(respondentTargetValue, 10) || scenario.respondentTarget
  );

  const allRespondents = useMemo(
    () => buildDemoRespondents(scenario, seed, { respondentTarget }),
    [scenario, seed, respondentTarget]
  );

  useEffect(() => {
    if (departmentLens && reportFilters.department !== "all") {
      setReportFilters((prev) => ({ ...prev, department: "all" }));
    }
    if (departmentLens && filters.department !== "all") {
      setFilters((prev) => ({ ...prev, department: "all" }));
    }
  }, [departmentLens, filters.department, reportFilters.department]);
  const filteredRespondents = useMemo(
    () => filterDemoRespondents(allRespondents, filters),
    [allRespondents, filters]
  );
  const data = useMemo(
    () => buildDemoCollaborationData(filteredRespondents, scenario.departments),
    [filteredRespondents, scenario.departments]
  );
  const reportFilteredRespondents = useMemo(
    () => filterDemoRespondents(allRespondents, reportFilters),
    [allRespondents, reportFilters]
  );
  const reportData = useMemo(
    () =>
      buildDemoCollaborationData(reportFilteredRespondents, scenario.departments, {
        minimumResponses: 2,
      }),
    [reportFilteredRespondents, scenario.departments]
  );
  const relationships = useMemo(
    () => buildRelationshipInsights(filteredRespondents, scenario.departments),
    [filteredRespondents, scenario.departments]
  );
  const rankedRelationshipOptions = useMemo(
    () =>
      relationships
        .slice()
        .sort((left, right) => right.riskIndex - left.riskIndex)
        .map((relationship) => ({
          id: relationship.id,
          label: relationship.departments,
        })),
    [relationships]
  );
  const prioritizedRelationships = useMemo(() => {
    const rankMap = new Map<string, number>();
    executiveRelationshipRanking.forEach((id, index) => {
      if (id) rankMap.set(id, index);
    });

    return relationships.slice().sort((left, right) => {
      const leftRank = rankMap.has(left.id) ? rankMap.get(left.id)! : Number.MAX_SAFE_INTEGER;
      const rightRank = rankMap.has(right.id)
        ? rankMap.get(right.id)!
        : Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return right.riskIndex - left.riskIndex;
    });
  }, [relationships, executiveRelationshipRanking]);
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
      buildDepartmentPriorityRows(
        filteredRespondents,
        scenario.departments,
        effectiveSelectedDepartment
      ),
    [filteredRespondents, scenario.departments, effectiveSelectedDepartment]
  );
  const questionInsights = useMemo(
    () => buildQuestionInsights(filteredRespondents, effectiveSelectedDepartment),
    [filteredRespondents, effectiveSelectedDepartment]
  );
  const partnerHotspots = useMemo(
    () =>
      buildPartnerQuestionHotspots(
        filteredRespondents,
        scenario.departments,
        effectiveSelectedDepartment
      ),
    [filteredRespondents, scenario.departments, effectiveSelectedDepartment]
  );
  const roleSummary = useMemo(
    () => buildSegmentSummary(filteredRespondents, data, "role"),
    [filteredRespondents, data]
  );
  const generationSummary = useMemo(
    () => buildSegmentSummary(filteredRespondents, data, "generation"),
    [filteredRespondents, data]
  );
  const tenureSummary = useMemo(
    () => buildSegmentSummary(filteredRespondents, data, "tenure"),
    [filteredRespondents, data]
  );
  const departmentIncomingRoleSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        filteredRespondents,
        effectiveSelectedDepartment,
        "role",
        "incoming"
      ),
    [filteredRespondents, effectiveSelectedDepartment]
  );
  const departmentIncomingGenerationSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        filteredRespondents,
        effectiveSelectedDepartment,
        "generation",
        "incoming"
      ),
    [filteredRespondents, effectiveSelectedDepartment]
  );
  const departmentIncomingTenureSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        filteredRespondents,
        effectiveSelectedDepartment,
        "tenure",
        "incoming"
      ),
    [filteredRespondents, effectiveSelectedDepartment]
  );
  const departmentOutgoingRoleSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        filteredRespondents,
        effectiveSelectedDepartment,
        "role",
        "outgoing"
      ),
    [filteredRespondents, effectiveSelectedDepartment]
  );
  const departmentOutgoingGenerationSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        filteredRespondents,
        effectiveSelectedDepartment,
        "generation",
        "outgoing"
      ),
    [filteredRespondents, effectiveSelectedDepartment]
  );
  const departmentOutgoingTenureSummary = useMemo(
    () =>
      buildDepartmentSegmentSummary(
        filteredRespondents,
        effectiveSelectedDepartment,
        "tenure",
        "outgoing"
      ),
    [filteredRespondents, effectiveSelectedDepartment]
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

  const roleCounts = useMemo(
    () => buildCounts(allRespondents, filteredRespondents, DEMO_ROLES, (item) => item.role),
    [allRespondents, filteredRespondents]
  );
  const generationCounts = useMemo(
    () =>
      buildCounts(
        allRespondents,
        filteredRespondents,
        DEMO_GENERATIONS,
        (item) => item.generation
      ),
    [allRespondents, filteredRespondents]
  );
  const tenureCounts = useMemo(
    () =>
      buildCounts(
        allRespondents,
        filteredRespondents,
        DEMO_TENURE_BANDS,
        (item) => item.tenure
      ),
    [allRespondents, filteredRespondents]
  );

  const previewRows = useMemo(
    () =>
      filteredRespondents.slice(0, 12).map((respondent) => ({
        id: respondent.id,
        respondent: respondent.id,
        department: respondent.department,
        role: respondent.role,
        generation: respondent.generation,
        tenure: respondent.tenure,
      })),
    [filteredRespondents]
  );

  const previewColumns = [
    { key: "respondent", header: "Respondent ID" },
    { key: "department", header: "Department" },
    { key: "role", header: "Role" },
    { key: "generation", header: "Generation" },
    { key: "tenure", header: "Tenure" },
  ];
  const showDemoLab = searchParams.get("demoLab") === "open";
  const demoModeSections = useMemo(
    () =>
      filterCollaborationModeSections(
        [
          {
            id: "executive",
            label: "Executive",
            tabIds: [
              "overview",
              "executive-summary",
              "critical-relationships",
              "cdrs-heatmap",
              "cdrs",
              "ci",
              "ci-hotspots",
              "segment-signals",
            ],
          },
          {
            id: "department",
            label: "Department",
            tabIds: [
              "department-360",
              "dept",
              "department-ci-report",
              "action-priorities",
            ],
          },
        ],
        portalAccess
      ),
    [portalAccess]
  );
  const demoTabOrder = useMemo(
    () =>
      filterCollaborationTabIds(
        [
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
          "action-priorities",
        ],
        portalAccess
      ),
    [portalAccess]
  );

  const updateExecutiveRelationshipRanking = (slot: number, value: string) => {
    setExecutiveRelationshipRanking((current) => {
      const next = [...current];
      const duplicateIndex = next.findIndex(
        (entry, entryIndex) => entry === value && entryIndex !== slot
      );

      if (duplicateIndex >= 0) {
        next[duplicateIndex] = "";
      }

      next[slot] = value;
      return next;
    });
  };

  const demoControls = (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardHeader className="gap-4 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border-strong">
                  Synthetic demo data
                </Badge>
                <Badge variant="secondary">Scenario driven</Badge>
                <Badge variant="secondary">Segment ready</Badge>
              </div>
              <CardTitle className="text-2xl font-extrabold">
                Demo Control Center
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                This environment uses synthetic respondent-level data so you can
                pivot the narrative quickly without exposing client information.
                Change the scenario, active department count, seed, total
                respondent count, and employee segments, then use the other tabs
                to see the recalculated analytics.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="border-border-strong"
              onClick={() =>
                setSeed(`northstar-demo-${Math.floor(Math.random() * 10000)}`)
              }
            >
              <RefreshCw className="h-4 w-4" />
              Reshuffle Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-7">
            <Select
              label="Scenario"
              value={scenarioId}
              onChange={(event) => {
                const nextScenario =
                  DEMO_SCENARIOS.find((entry) => entry.id === event.target.value) ??
                  DEMO_SCENARIOS[0];
                setScenarioId(nextScenario.id);
                setSelectedDepartment(nextScenario.departments[0]);
                setDepartmentCountInput("");
                setRespondentTargetInput("");
                setReportFilters({
                  role: "all",
                  generation: "all",
                  tenure: "all",
                  department: "all",
                });
                setExecutiveRelationshipRanking(["", "", ""]);
              }}
              className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
            >
              {DEMO_SCENARIOS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>
            <Input
              label="Departments"
              type="number"
              min={4}
              max={baseScenario.departments.length}
              value={departmentCountValue}
              onChange={(event) => setDepartmentCountInput(event.target.value)}
              className="rounded-2xl border-border-strong focus-visible:ring-nsp-blue-500/15"
            />
            <Input
              label="Seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              className="rounded-2xl border-border-strong focus-visible:ring-nsp-blue-500/15"
            />
            <Input
              label="Total Respondents"
              type="number"
              min={scenario.departments.length}
              value={respondentTargetValue}
              onChange={(event) => setRespondentTargetInput(event.target.value)}
              className="rounded-2xl border-border-strong focus-visible:ring-nsp-blue-500/15"
            />
            <Select
              label="Role"
              value={filters.role}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  role: event.target.value as DemoFilters["role"],
                }))
              }
              className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
            >
              <option value="all">All roles</option>
              {DEMO_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
            <Select
              label="Generation"
              value={filters.generation}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  generation: event.target.value as DemoFilters["generation"],
                }))
              }
              className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
            >
              <option value="all">All generations</option>
              {DEMO_GENERATIONS.map((generation) => (
                <option key={generation} value={generation}>
                  {generation}
                </option>
              ))}
            </Select>
            <Select
              label="Tenure"
              value={filters.tenure}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  tenure: event.target.value as DemoFilters["tenure"],
                }))
              }
              className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
            >
              <option value="all">All tenure bands</option>
              {DEMO_TENURE_BANDS.map((tenure) => (
                <option key={tenure} value={tenure}>
                  {tenure}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <Card
              className="border-border-strong bg-surface-3"
              style={getDataBoxSurfaceStyle()}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Active respondents
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold text-text-primary">
                  {filteredRespondents.length}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  of {allRespondents.length} generated employees
                </p>
              </CardContent>
            </Card>

            <Card
              className="border-border-strong bg-surface-3"
              style={getDataBoxSurfaceStyle()}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Layers className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Departments
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold text-text-primary">
                  {scenario.departments.length}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  of {baseScenario.departments.length} available in this scenario
                </p>
              </CardContent>
            </Card>

            <Card className="border-border-strong bg-surface-2">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Storyline
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-base font-bold text-text-primary">
                  {scenario.label}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {scenario.description}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border-strong bg-surface-2">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Seed state
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-base font-bold text-text-primary">{seed}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Total respondents set to {respondentTarget}.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SegmentCard title="Role mix" counts={roleCounts} />
            <SegmentCard title="Generation mix" counts={generationCounts} />
            <SegmentCard title="Tenure mix" counts={tenureCounts} />
          </div>

          <Card className="border-border-strong">
            <CardHeader>
              <CardTitle>Executive Relationship Ordering</CardTitle>
              <CardDescription>
                Rank the department relationships leadership considers most vital. The
                executive relationship reports will surface these pairings first.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((slot) => (
                <Select
                  key={slot}
                  label={`Priority ${slot + 1}`}
                  value={executiveRelationshipRanking[slot] || "none"}
                  onChange={(event) =>
                    updateExecutiveRelationshipRanking(
                      slot,
                      event.target.value === "none" ? "" : event.target.value
                    )
                  }
                  className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
                >
                  <option value="none">No manual ranking</option>
                  {rankedRelationshipOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border-strong">
            <CardHeader>
              <CardTitle>Respondent Explorer</CardTitle>
              <CardDescription>
                Each synthetic employee row includes the segmentation columns you
                requested: Role, Generation, and Tenure. This gives you a clean
                base for future cut views without exposing client data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={previewColumns}
                data={previewRows}
                emptyMessage="No synthetic respondents match the current filters."
              />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );

  return demoModeSections.length === 0 ? (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Card className="border-border-strong">
        <CardContent className="px-6 py-8 text-sm text-text-secondary">
          No Collaboration perspectives are assigned to this user.
        </CardContent>
      </Card>
    </div>
  ) : (
    <CollaborationDashboardClient
      data={data}
      campaignName={scenario.campaignName}
      organizationName={scenario.organizationName}
      tabRowAction={
        <DepartmentSelector
          departments={selectableDepartments}
          value={effectiveSelectedDepartment}
          onChange={setSelectedDepartment}
          label=""
          ariaLabel="Department Lens"
          className="min-w-[240px] bg-white"
        />
      }
      tabRowActionModeId="department"
      floatingPanel={showDemoLab ? demoControls : null}
      modeSections={demoModeSections}
      tabOverrides={[
        {
          id: "cdrs-heatmap",
          label: "Heatmap",
        },
        {
          id: "cdrs",
          content: (
            <DemoCdrsReportTab
              data={reportData}
              filters={reportFilters}
              onFiltersChange={setReportFilters}
              roles={DEMO_ROLES}
              generations={DEMO_GENERATIONS}
              tenures={DEMO_TENURE_BANDS}
              matchingRespondents={reportFilteredRespondents.length}
            />
          ),
        },
        {
          id: "ci",
          content: (
            <DemoCiReportTab
              data={reportData}
              filters={reportFilters}
              onFiltersChange={setReportFilters}
              roles={DEMO_ROLES}
              generations={DEMO_GENERATIONS}
              tenures={DEMO_TENURE_BANDS}
              matchingRespondents={reportFilteredRespondents.length}
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
      tabOrder={demoTabOrder}
      extraTabs={filterCollaborationTabs([
        {
          id: "executive-summary",
          label: "Executive Summary",
          content: (
            <ExecutiveSummaryTab
              data={data}
              kpis={executiveKpis}
              narrative={executiveNarrative}
              relationships={prioritizedRelationships}
            />
          ),
        },
        {
          id: "critical-relationships",
          label: "Critical Relationships",
          content: (
            <CriticalRelationshipsTab relationships={prioritizedRelationships} />
          ),
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
              respondents={filteredRespondents}
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
              respondents={filteredRespondents}
              departments={data.meta.departments}
              organizationName={scenario.organizationName}
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
      ], portalAccess)}
    />
  );
}


