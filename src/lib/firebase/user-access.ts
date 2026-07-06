export interface PerspectiveFilterRule {
  perspectiveId: string;
  field: string;
  allowedValues: string[];
}

export interface EmployeeExperienceUserAccess {
  dashboardAccessMode: "full" | "restricted";
  allowedDashboardAssetIds: string[];
  perspectiveAccessMode: "full" | "restricted";
  allowedPerspectiveIds: string[];
  brandReportAccessMode: "full" | "restricted";
  brandReportAllowedBrands: string[];
  perspectiveFilterRules: PerspectiveFilterRule[];
}

export const DASHBOARD_ACCESS_OPTIONS = [
  { id: "integration-dashboard", label: "Integration Effectiveness" },
  { id: "csg-integration-dashboard", label: "CSG Integration Effectiveness" },
  { id: "collaboration-dashboard", label: "Collaboration" },
  { id: "tf-collaboration", label: "Top Flight Collaboration" },
  { id: "dws-employee-experience", label: "DWS Employee Experience" },
  { id: "employee-experience", label: "Employee Experience" },
] as const;

export const EE_PERSPECTIVE_ACCESS_OPTIONS = [
  { id: "integration.overview", label: "Integration - Overview" },
  { id: "integration.longitudinalTrends", label: "Integration - Longitudinal Trends" },
  { id: "integration.statementTrends", label: "Integration - Statement Trends" },
  { id: "integration.protectPrioritize", label: "Integration - Protect & Prioritize" },
  { id: "integration.brandReport", label: "Integration - Brand Report" },
  { id: "integration.employeeVoice", label: "Integration - Employee Voice" },
  { id: "exec-overview", label: "Campaign Overview" },
  { id: "ee-campaign-results", label: "Detailed Results" },
  { id: "ee-historical-report", label: "Detailed History" },
  { id: "exec-location", label: "Heat Maps" },
  { id: "ee-location-comparison", label: "Brand Comparison" },
  { id: "ee-department-comparison", label: "Job / Department Comparison" },
  { id: "ee-supervisor-comparison", label: "Supervisor Comparison" },
  { id: "ee-enps", label: "ENPS" },
  { id: "hr-open-text", label: "Open Text (Executive)" },
  { id: "ee-brand-report", label: "Brand Report" },
  { id: "hr-supervisor", label: "Supervisor Reports" },
  { id: "ee-department-report", label: "Job Category Report" },
  { id: "ee-unit-department-report", label: "Department Report" },
  { id: "ee-brand-open-text", label: "Open Text (Brand)" },
] as const;

const DASHBOARD_ACCESS_IDS: Set<string> = new Set(
  DASHBOARD_ACCESS_OPTIONS.map((option) => option.id)
);

const EE_PERSPECTIVE_ACCESS_IDS: Set<string> = new Set(
  EE_PERSPECTIVE_ACCESS_OPTIONS.map((option) => option.id)
);

const EE_PERSPECTIVE_ID_ALIASES: Record<string, string[]> = {
  "open-text": ["hr-open-text", "ee-brand-open-text"],
  "open text": ["hr-open-text", "ee-brand-open-text"],
  "open text (executive)": ["hr-open-text"],
  "open-text-executive": ["hr-open-text"],
  "open text executive": ["hr-open-text"],
  "open text (brand)": ["ee-brand-open-text"],
  "open-text-brand": ["ee-brand-open-text"],
  "open text brand": ["ee-brand-open-text"],
  "employeeexperience.opentext": ["hr-open-text", "ee-brand-open-text"],
};

function sanitizeList(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizePerspectiveIdAlias(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const normalized = trimmed.toLowerCase();
  const exactMatch = Array.from(EE_PERSPECTIVE_ACCESS_IDS).find(
    (id) => id.toLowerCase() === normalized
  );
  if (exactMatch) {
    return [exactMatch];
  }

  const aliases = EE_PERSPECTIVE_ID_ALIASES[normalized] ?? [];
  return aliases.filter((alias) => EE_PERSPECTIVE_ACCESS_IDS.has(alias));
}

function sanitizePerspectiveAccessIds(values: unknown) {
  return Array.from(
    new Set(
      sanitizeList(values).flatMap((value) => normalizePerspectiveIdAlias(value))
    )
  );
}

function sanitizePerspectiveFilterRules(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => {
      const raw = value as {
        perspectiveId?: unknown;
        field?: unknown;
        allowedValues?: unknown;
      };
      const perspectiveId =
        typeof raw.perspectiveId === "string" ? raw.perspectiveId.trim() : "";
      const field = typeof raw.field === "string" ? raw.field.trim() : "";
      const allowedValues = sanitizeList(raw.allowedValues);
      if (!perspectiveId || !field || allowedValues.length === 0) {
        return null;
      }
      return { perspectiveId, field, allowedValues } satisfies PerspectiveFilterRule;
    })
    .filter((rule): rule is PerspectiveFilterRule => Boolean(rule));
}

export function resolveAllowedValuesForPerspective(
  access: EmployeeExperienceUserAccess | undefined,
  perspectiveIds: string[],
  fieldAliases: string[]
) {
  if (!access) {
    return [];
  }

  const perspectiveIdSet = new Set(perspectiveIds.map((value) => value.trim().toLowerCase()));
  const aliasSet = new Set(fieldAliases.map((value) => value.trim().toLowerCase()));
  const values = new Set<string>();
  access.perspectiveFilterRules.forEach((rule) => {
    const perspectiveId = rule.perspectiveId.trim().toLowerCase();
    const field = rule.field.trim().toLowerCase();
    if (!perspectiveIdSet.has(perspectiveId) || !aliasSet.has(field)) {
      return;
    }
    rule.allowedValues.forEach((value) => values.add(value));
  });
  return Array.from(values);
}

export function sanitizeEmployeeExperienceUserAccess(
  input: unknown
): EmployeeExperienceUserAccess {
  const raw = (input ?? {}) as {
    dashboardAccessMode?: unknown;
    allowedDashboardAssetIds?: unknown;
    perspectiveAccessMode?: unknown;
    allowedPerspectiveIds?: unknown;
    brandReportAccessMode?: unknown;
    brandReportAllowedBrands?: unknown;
    perspectiveFilterRules?: unknown;
  };
  const allowedDashboardAssetIds = sanitizeList(raw.allowedDashboardAssetIds).filter((value) =>
    DASHBOARD_ACCESS_IDS.has(value)
  );
  const allowedPerspectiveIds = sanitizePerspectiveAccessIds(raw.allowedPerspectiveIds);
  const brandReportAllowedBrands = sanitizeList(raw.brandReportAllowedBrands);
  const perspectiveFilterRules = sanitizePerspectiveFilterRules(raw.perspectiveFilterRules);
  const dashboardAccessMode =
    raw.dashboardAccessMode === "restricted" ||
    (raw.dashboardAccessMode !== "full" && allowedDashboardAssetIds.length > 0)
      ? "restricted"
      : "full";
  const perspectiveAccessMode =
    raw.perspectiveAccessMode === "restricted" ||
    (raw.perspectiveAccessMode !== "full" && allowedPerspectiveIds.length > 0)
      ? "restricted"
      : "full";
  const brandReportAccessMode =
    raw.brandReportAccessMode === "restricted" ||
    (raw.brandReportAccessMode !== "full" && brandReportAllowedBrands.length > 0)
      ? "restricted"
      : "full";

  return {
    dashboardAccessMode,
    allowedDashboardAssetIds,
    perspectiveAccessMode,
    allowedPerspectiveIds,
    brandReportAccessMode,
    brandReportAllowedBrands,
    perspectiveFilterRules:
      perspectiveFilterRules.length > 0
        ? perspectiveFilterRules
        : brandReportAllowedBrands.length > 0
          ? [
              {
                perspectiveId: "integration.brandReport",
                field: "company",
                allowedValues: brandReportAllowedBrands,
              },
              {
                perspectiveId: "ee-brand-report",
                field: "company",
                allowedValues: brandReportAllowedBrands,
              },
            ]
          : [],
  };
}

