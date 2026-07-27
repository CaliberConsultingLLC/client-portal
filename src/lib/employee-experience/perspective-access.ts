export type EEPerspectiveAccessOption = {
  id: string;
  label: string;
};

type EEPerspectiveDef = {
  id: string;
  label: string;
  dividerBefore?: boolean;
};

type EEGroupDef = {
  id: string;
  label: string;
  perspectives: EEPerspectiveDef[];
};

type EEClientScopeKey = "csg" | "dws" | "dws-field";

export const CSG_EMPLOYEE_EXPERIENCE_GROUPS: EEGroupDef[] = [
  {
    id: "executive",
    label: "Executive & HR",
    perspectives: [
      { id: "exec-overview", label: "Campaign Overview" },
      { id: "ee-campaign-results", label: "Detailed Results" },
      { id: "ee-historical-report", label: "Detailed History" },
      { id: "exec-location", label: "Heat Maps" },
      { id: "ee-location-comparison", label: "Brand Comparison" },
      { id: "ee-enps", label: "ENPS" },
      { id: "hr-open-text", label: "Open Text" },
    ],
  },
  {
    id: "individual-reports",
    label: "Individual Reports",
    perspectives: [
      { id: "hr-supervisor", label: "Supervisor Report" },
      { id: "ee-department-report", label: "Job Category Report" },
      { id: "ee-unit-department-report", label: "Department Report" },
      { id: "ee-location-comparison", label: "Brand Comparison" },
      { id: "ee-department-comparison", label: "Job / Department Comparison" },
      { id: "ee-supervisor-comparison", label: "Supervisor Comparison" },
    ],
  },
  {
    id: "department",
    label: "Brand",
    perspectives: [
      { id: "ee-brand-report", label: "Brand Report" },
      { id: "ee-segment-breakdown", label: "Brand Breakdown" },
      { id: "ee-enps", label: "ENPS" },
      { id: "ee-brand-open-text", label: "Open Text" },
      { id: "ee-location-comparison", label: "Brand Comparison", dividerBefore: true },
    ],
  },
];

export const DWS_EMPLOYEE_EXPERIENCE_GROUPS: EEGroupDef[] = [
  {
    id: "executive",
    label: "Executive & HR",
    perspectives: [
      { id: "exec-overview", label: "Campaign Overview" },
      { id: "ee-campaign-results", label: "Detailed Results" },
      { id: "ee-historical-report", label: "Detailed History" },
      { id: "exec-location", label: "Heat Maps" },
      { id: "hr-open-text", label: "Open Text" },
    ],
  },
  {
    id: "division",
    label: "Division",
    perspectives: [
      { id: "ee-division-report", label: "Division Report" },
      { id: "ee-division-comparison", label: "Division Comparison" },
    ],
  },
  {
    id: "basin",
    label: "Basin",
    perspectives: [
      { id: "ee-brand-report", label: "Basin Report" },
      { id: "ee-location-comparison", label: "Basin Comparison" },
    ],
  },
  {
    id: "dept-group",
    label: "Department",
    perspectives: [
      { id: "ee-unit-department-report", label: "Department Report" },
      { id: "ee-department-comparison", label: "Department Comparison" },
    ],
  },
  {
    id: "role-group",
    label: "Role",
    perspectives: [
      { id: "ee-department-report", label: "Role Report" },
      { id: "ee-role-comparison", label: "Role Comparison" },
    ],
  },
  {
    id: "supervisor-group",
    label: "Supervisor",
    perspectives: [
      { id: "hr-supervisor", label: "Supervisor Report" },
      { id: "ee-supervisor-comparison", label: "Supervisor Comparison" },
    ],
  },
];

export const DWS_FIELD_EMPLOYEE_EXPERIENCE_GROUPS: EEGroupDef[] = [
  {
    id: "executive",
    label: "Executive & HR",
    perspectives: [
      { id: "exec-overview", label: "Campaign Overview" },
      { id: "ee-campaign-results", label: "Detailed Results" },
      { id: "ee-historical-report", label: "Detailed History" },
      { id: "exec-location", label: "Heat Maps" },
      { id: "hr-open-text", label: "Open Text" },
    ],
  },
  {
    id: "basin",
    label: "Basin",
    perspectives: [
      { id: "ee-brand-report", label: "Basin Report" },
      { id: "ee-location-comparison", label: "Basin Comparison" },
    ],
  },
  {
    id: "dept-group",
    label: "Department",
    perspectives: [
      { id: "ee-unit-department-report", label: "Department Report" },
      { id: "ee-department-comparison", label: "Department Comparison" },
    ],
  },
  {
    id: "role-group",
    label: "Role",
    perspectives: [
      { id: "ee-department-report", label: "Job Category Report" },
      { id: "ee-role-comparison", label: "Role Comparison" },
    ],
  },
  {
    id: "supervisor-group",
    label: "Supervisor",
    perspectives: [
      { id: "hr-supervisor", label: "Supervisor Report" },
      { id: "ee-supervisor-comparison", label: "Supervisor Comparison" },
    ],
  },
  {
    id: "autosep-group",
    label: "AutoSEP",
    perspectives: [{ id: "ee-autosep-report", label: "AutoSEP Report" }],
  },
];

const BREAKDOWN_INSERTIONS: Record<
  EEClientScopeKey,
  Partial<Record<string, { id: string; label: string; afterReportId: string }>>
> = {
  csg: {},
  dws: {
    division: { id: "ee-division-breakdown", label: "Division Breakdown", afterReportId: "ee-division-report" },
    basin: { id: "ee-segment-breakdown", label: "Basin Breakdown", afterReportId: "ee-brand-report" },
    "dept-group": { id: "ee-department-breakdown", label: "Department Breakdown", afterReportId: "ee-unit-department-report" },
    "role-group": { id: "ee-role-breakdown", label: "Role Breakdown", afterReportId: "ee-department-report" },
  },
  "dws-field": {
    basin: { id: "ee-segment-breakdown", label: "Basin Breakdown", afterReportId: "ee-brand-report" },
    "dept-group": { id: "ee-department-breakdown", label: "Department Breakdown", afterReportId: "ee-unit-department-report" },
    "role-group": { id: "ee-role-breakdown", label: "Job Category Breakdown", afterReportId: "ee-department-report" },
    "autosep-group": { id: "ee-autosep-breakdown", label: "AutoSEP Breakdown", afterReportId: "ee-autosep-report" },
  },
};

function baseGroupsForScope(scope: EEClientScopeKey): EEGroupDef[] {
  if (scope === "csg") return CSG_EMPLOYEE_EXPERIENCE_GROUPS;
  if (scope === "dws") return DWS_EMPLOYEE_EXPERIENCE_GROUPS;
  return DWS_FIELD_EMPLOYEE_EXPERIENCE_GROUPS;
}

function effectiveGroupsForScope(scope: EEClientScopeKey): EEGroupDef[] {
  const base = baseGroupsForScope(scope);
  const insertions = BREAKDOWN_INSERTIONS[scope];

  return base.map((group) => {
    const insertion = insertions[group.id];
    if (!insertion) return group;
    const reportIndex = group.perspectives.findIndex(
      (perspective) => perspective.id === insertion.afterReportId
    );
    const insertAt = reportIndex >= 0 ? reportIndex + 1 : group.perspectives.length;
    return {
      ...group,
      perspectives: [
        ...group.perspectives.slice(0, insertAt),
        { id: insertion.id, label: insertion.label },
        ...group.perspectives.slice(insertAt),
      ],
    };
  });
}

function uniquePerspectiveOptions(groups: EEGroupDef[]): EEPerspectiveAccessOption[] {
  const byId = new Set<string>();
  const options: EEPerspectiveAccessOption[] = [];
  groups.forEach((group) => {
    group.perspectives.forEach((perspective) => {
      if (byId.has(perspective.id)) return;
      byId.add(perspective.id);
      options.push({
        id: perspective.id,
        label:
          perspective.id === "hr-open-text"
            ? "Open Text (Executive)"
            : perspective.id === "ee-brand-open-text"
              ? "Open Text (Brand)"
              : perspective.label,
      });
    });
  });
  return options;
}

export function listEmployeeExperiencePerspectiveOptionsForAsset(
  assetId: string
): EEPerspectiveAccessOption[] {
  const base = assetId.split("--")[0] ?? assetId;
  if (base === "employee-experience") {
    return uniquePerspectiveOptions(effectiveGroupsForScope("csg"));
  }
  if (base === "dws-employee-experience") {
    const mergedGroups = [
      ...effectiveGroupsForScope("dws"),
      ...effectiveGroupsForScope("dws-field"),
    ];
    return uniquePerspectiveOptions(mergedGroups);
  }
  return [];
}

export const ALL_EMPLOYEE_EXPERIENCE_PERSPECTIVE_ACCESS_OPTIONS =
  uniquePerspectiveOptions([
    ...effectiveGroupsForScope("csg"),
    ...effectiveGroupsForScope("dws"),
    ...effectiveGroupsForScope("dws-field"),
  ]);
