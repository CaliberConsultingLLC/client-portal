import {
  COLLABORATION_PERSPECTIVE_ACCESS_OPTIONS,
  expandCollaborationPerspectiveAccessId,
  listCollaborationPerspectiveOptionsForAsset,
} from "@/lib/collaboration/perspective-access";
import {
  ALL_EMPLOYEE_EXPERIENCE_PERSPECTIVE_ACCESS_OPTIONS,
  listEmployeeExperiencePerspectiveOptionsForAsset,
} from "@/lib/employee-experience/perspective-access";

export interface PerspectiveFilterRule {
  perspectiveId: string;
  field: string;
  allowedValues: string[];
}

/** One filter field + values applied across all perspectives for a user. */
export interface SharedFilterRule {
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
  /** Shared filter applied to every perspective (preferred admin UX). */
  sharedFilterRule: SharedFilterRule | null;
  /** Legacy/per-perspective rules — still honored when present. */
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
  ...ALL_EMPLOYEE_EXPERIENCE_PERSPECTIVE_ACCESS_OPTIONS,
  ...COLLABORATION_PERSPECTIVE_ACCESS_OPTIONS,
] as const;

export function listPerspectiveAccessOptionsForDashboardAsset(assetId: string) {
  const base = assetId.split("--")[0] ?? assetId;
  if (base === "integration-dashboard" || base === "csg-integration-dashboard") {
    return EE_PERSPECTIVE_ACCESS_OPTIONS.filter((option) =>
      option.id.startsWith("integration.")
    );
  }
  const collaborationOptions = listCollaborationPerspectiveOptionsForAsset(assetId);
  if (collaborationOptions.length > 0) {
    return collaborationOptions;
  }
  return listEmployeeExperiencePerspectiveOptionsForAsset(assetId);
}

export type FilterFieldOption = {
  id: string;
  label: string;
};

const COLLABORATION_FILTER_FIELD_OPTIONS: FilterFieldOption[] = [
  { id: "department", label: "Department" },
  { id: "role", label: "Role" },
  { id: "generation", label: "Generation" },
  { id: "tenure", label: "Tenure" },
];

const INTEGRATION_FILTER_FIELD_OPTIONS: FilterFieldOption[] = [
  { id: "brand", label: "Brand" },
];

const DWS_FILTER_FIELD_OPTIONS: FilterFieldOption[] = [
  { id: "location", label: "Basin / Location" },
  { id: "department", label: "Department" },
  { id: "division", label: "Division" },
  { id: "supervisor", label: "Supervisor" },
  { id: "leadership", label: "Leadership Role" },
  { id: "fieldCategory", label: "Job Category" },
  { id: "jobTitle", label: "Job Title" },
  { id: "tenure", label: "Tenure" },
];

const CSG_FILTER_FIELD_OPTIONS: FilterFieldOption[] = [
  { id: "brand", label: "Brand" },
  { id: "department", label: "Department" },
  { id: "supervisor", label: "Supervisor" },
  { id: "jobTitle", label: "Job Title" },
  { id: "fieldCategory", label: "Job Category" },
];

export const FILTER_RULE_FIELD_OPTIONS = [
  ...new Set(
    [
      ...COLLABORATION_FILTER_FIELD_OPTIONS,
      ...INTEGRATION_FILTER_FIELD_OPTIONS,
      ...DWS_FILTER_FIELD_OPTIONS,
      ...CSG_FILTER_FIELD_OPTIONS,
    ].map((option) => option.id)
  ),
] as const;

export function listFilterFieldOptionsForDashboardAsset(assetId: string): FilterFieldOption[] {
  const base = normalizeDashboardAssetId(assetId);
  if (base === "collaboration-dashboard" || base === "tf-collaboration") {
    return COLLABORATION_FILTER_FIELD_OPTIONS;
  }
  if (base === "integration-dashboard" || base === "csg-integration-dashboard") {
    return INTEGRATION_FILTER_FIELD_OPTIONS;
  }
  if (base === "dws-employee-experience") {
    return DWS_FILTER_FIELD_OPTIONS;
  }
  if (base === "employee-experience") {
    return CSG_FILTER_FIELD_OPTIONS;
  }
  return [];
}

export function resolveFilterFieldOptionsForDashboards(dashboardIds: string[]) {
  const byId = new Map<string, FilterFieldOption>();
  dashboardIds.forEach((dashboardId) => {
    listFilterFieldOptionsForDashboardAsset(dashboardId).forEach((option) => {
      if (!byId.has(option.id)) {
        byId.set(option.id, option);
      }
    });
  });
  return Array.from(byId.values());
}

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

/** Map admin filter field names onto respondent properties. */
const FILTER_FIELD_TO_RESPONDENT_KEY: Record<string, string> = {
  company: "location",
  brand: "location",
  location: "location",
  site: "location",
  department: "department",
  division: "division",
  supervisor: "supervisor",
  jobtitle: "jobTitle",
  fieldcategory: "fieldCategory",
  leadership: "leadership",
  role: "role",
  generation: "generation",
  tenure: "tenure",
  ratetype: "rateType",
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

function sanitizeDelimitedValues(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .flatMap((value) =>
          typeof value === "string" ? value.split(/\r?\n/) : []
        )
        .map((value) => value.trim())
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

  const collaborationMatches = expandCollaborationPerspectiveAccessId(trimmed);
  if (collaborationMatches.length > 0) {
    return collaborationMatches;
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
      const allowedValues = sanitizeDelimitedValues(raw.allowedValues);
      if (!perspectiveId || !field || allowedValues.length === 0) {
        return null;
      }
      return { perspectiveId, field, allowedValues } satisfies PerspectiveFilterRule;
    })
    .filter((rule): rule is PerspectiveFilterRule => Boolean(rule));
}

function sanitizeSharedFilterRule(value: unknown): SharedFilterRule | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as { field?: unknown; allowedValues?: unknown };
  const field = typeof raw.field === "string" ? raw.field.trim() : "";
  const allowedValues = sanitizeDelimitedValues(raw.allowedValues);
  if (!field || allowedValues.length === 0) {
    return null;
  }

  return { field, allowedValues };
}

export function normalizeDashboardAssetId(assetId: string) {
  return assetId.split("--")[0] ?? assetId;
}

/** Match stored allow-list IDs against assignment asset IDs (including `--client` suffixes). */
export function isDashboardAssetAllowed(assetId: string, allowedIds: Iterable<string>) {
  const allowed = new Set(Array.from(allowedIds));
  if (allowed.size === 0) {
    return false;
  }
  if (allowed.has(assetId)) {
    return true;
  }

  const base = normalizeDashboardAssetId(assetId);
  if (allowed.has(base)) {
    return true;
  }

  for (const allowedId of allowed) {
    if (normalizeDashboardAssetId(allowedId) === base) {
      return true;
    }
  }

  return false;
}

export function mapFilterFieldToRespondentKey(field: string) {
  return FILTER_FIELD_TO_RESPONDENT_KEY[field.trim().toLowerCase()] ?? null;
}

export function valueMatchesAllowedFilterValues(
  value: string,
  allowedValues: Iterable<string>
) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const allowed = Array.from(allowedValues);
  if (allowed.some((entry) => entry === trimmed)) {
    return true;
  }

  const lower = trimmed.toLowerCase();
  return allowed.some((entry) => entry.trim().toLowerCase() === lower);
}

export function filterRecordsBySharedFilter<T extends object>(
  records: T[],
  access: EmployeeExperienceUserAccess | undefined
): T[] {
  const shared = access?.sharedFilterRule;
  if (!shared || shared.allowedValues.length === 0) {
    return records;
  }

  const key = mapFilterFieldToRespondentKey(shared.field);
  if (!key) {
    return records;
  }

  return records.filter((record) =>
    valueMatchesAllowedFilterValues(
      String((record as Record<string, unknown>)[key] ?? ""),
      shared.allowedValues
    )
  );
}

export function isCollaborationDepartmentLens(
  access: EmployeeExperienceUserAccess | undefined
) {
  const shared = access?.sharedFilterRule;
  if (!shared || shared.allowedValues.length === 0) {
    return false;
  }
  return mapFilterFieldToRespondentKey(shared.field) === "department";
}

export function filterCollaborationRespondentsByUserAccess<T extends object>(
  respondents: T[],
  access: EmployeeExperienceUserAccess | undefined
): T[] {
  // Department is a view lens (which team this leader owns). Incoming CDRS is
  // rated BY other departments, so stripping those respondents zeros the data.
  if (isCollaborationDepartmentLens(access)) {
    return respondents;
  }
  return filterRecordsBySharedFilter(respondents, access);
}

export function resolveCollaborationDepartmentOptions(
  departments: string[],
  access: EmployeeExperienceUserAccess | undefined
) {
  const shared = access?.sharedFilterRule;
  if (!isCollaborationDepartmentLens(access) || !shared) {
    return departments;
  }
  return departments.filter((department) =>
    valueMatchesAllowedFilterValues(department, shared.allowedValues)
  );
}

export function filterCollaborationCommentsByUserAccess<
  T extends {
    aboutDepartment: string;
    fromDepartment: string;
    role: string;
    generation: string;
    tenure: string;
  },
>(comments: T[], access: EmployeeExperienceUserAccess | undefined): T[] {
  const shared = access?.sharedFilterRule;
  if (!shared || shared.allowedValues.length === 0) {
    return comments;
  }

  const key = mapFilterFieldToRespondentKey(shared.field);
  if (!key) {
    return comments;
  }

  if (key === "department") {
    return comments.filter((comment) =>
      valueMatchesAllowedFilterValues(comment.aboutDepartment, shared.allowedValues)
    );
  }

  return comments.filter((comment) =>
    valueMatchesAllowedFilterValues(
      String((comment as Record<string, unknown>)[key] ?? ""),
      shared.allowedValues
    )
  );
}

/**
 * Resolve allowed filter values for a perspective.
 * Perspective-specific rules win when present; otherwise the shared rule applies.
 */
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
  const perspectiveValues = new Set<string>();
  let hasPerspectiveRule = false;

  access.perspectiveFilterRules.forEach((rule) => {
    const perspectiveId = rule.perspectiveId.trim().toLowerCase();
    const field = rule.field.trim().toLowerCase();
    if (!perspectiveIdSet.has(perspectiveId) || !aliasSet.has(field)) {
      return;
    }
    hasPerspectiveRule = true;
    rule.allowedValues.forEach((value) => perspectiveValues.add(value));
  });

  if (hasPerspectiveRule) {
    return Array.from(perspectiveValues);
  }

  const shared = access.sharedFilterRule;
  if (shared && aliasSet.has(shared.field.trim().toLowerCase())) {
    return [...shared.allowedValues];
  }

  return [];
}

/** Apply shared (+ brand-style) access filters to EE respondents before dashboard render. */
export function filterRespondentsByUserAccess<T extends { location: string }>(
  respondents: T[],
  access: EmployeeExperienceUserAccess | undefined
): T[] {
  if (!access) {
    return respondents;
  }

  let next = respondents;

  const sharedFiltered = filterRecordsBySharedFilter(
    next as object[],
    access
  ) as T[];
  next = sharedFiltered;

  const ruleBasedAllowedBrands = resolveAllowedValuesForPerspective(
    access,
    ["ee-brand-report", "integration.brandReport"],
    ["company", "brand", "location", "site"]
  );
  const brandRestricted =
    ruleBasedAllowedBrands.length > 0 ||
    access.brandReportAccessMode === "restricted" ||
    access.brandReportAllowedBrands.length > 0;

  if (brandRestricted) {
    const allowedBrandSet = new Set(
      ruleBasedAllowedBrands.length > 0
        ? ruleBasedAllowedBrands
        : access.brandReportAllowedBrands
    );
    next = next.filter((respondent) => allowedBrandSet.has(respondent.location));
  }

  return next;
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
    sharedFilterRule?: unknown;
    perspectiveFilterRules?: unknown;
  };
  // Allow catalog IDs and instance asset IDs (e.g. employee-experience--dws).
  const allowedDashboardAssetIds = sanitizeList(raw.allowedDashboardAssetIds).filter((value) => {
    const base = normalizeDashboardAssetId(value);
    return DASHBOARD_ACCESS_IDS.has(value) || DASHBOARD_ACCESS_IDS.has(base) || value.includes("--");
  });
  const allowedPerspectiveIds = sanitizePerspectiveAccessIds(raw.allowedPerspectiveIds);
  const brandReportAllowedBrands = sanitizeList(raw.brandReportAllowedBrands);
  const sharedFilterRule = sanitizeSharedFilterRule(raw.sharedFilterRule);
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

  const migratedPerspectiveRules =
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
        : [];

  return {
    dashboardAccessMode,
    allowedDashboardAssetIds,
    perspectiveAccessMode,
    allowedPerspectiveIds,
    brandReportAccessMode,
    brandReportAllowedBrands,
    sharedFilterRule,
    perspectiveFilterRules: migratedPerspectiveRules,
  };
}
