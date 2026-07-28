// Index 6 (transparent) is special-cased in the viewer — only append new
// presets after it so persisted decks keep their colors.
export const READOUT_COLOR_PRESETS = [
  { bg: "#FFFFFF", border: "#DCE3DD", label: "#6E7E96", text: "#3B4B63" },
  { bg: "#F1F8F3", border: "#CDE6D5", label: "#2F9151", text: "#3B4B63" },
  { bg: "#F0F5FA", border: "#D5E2EE", label: "#5E7898", text: "#3B4B63" },
  { bg: "#FBF5E3", border: "#EAD9A8", label: "#8A6A1F", text: "#5A4A28" },
  { bg: "#242424", border: "#3A3A3A", label: "#E8CC70", text: "rgba(255,255,255,0.82)" },
  { bg: "#3B4B63", border: "#4C5F7C", label: "#AFC4DC", text: "rgba(255,255,255,0.85)" },
  { bg: "transparent", border: "transparent", label: "#6E7E96", text: "#3B4B63" },
  // Portal-palette additions — toned-down shades of the collaboration red,
  // Caliber emerald, steel blue, gold, and a warm sand neutral.
  { bg: "#F8ECEA", border: "#E8CFC9", label: "#A2483A", text: "#5C3B34" },
  { bg: "#8E4237", border: "#7C382E", label: "#EFCEC7", text: "rgba(255,255,255,0.88)" },
  { bg: "#386B45", border: "#2F5A38", label: "#CBE4D1", text: "rgba(255,255,255,0.88)" },
  { bg: "#5E7898", border: "#526986", label: "#D7E2EE", text: "rgba(255,255,255,0.9)" },
  { bg: "#C9A24B", border: "#B48D38", label: "#5C4715", text: "#3A2E12" },
  { bg: "#F4F1EA", border: "#E0D9C8", label: "#8A7B5E", text: "#4A4436" },
] as const;

/** Cover focus-card accents (Roman numeral + border only). */
export const READOUT_FOCUS_ACCENTS = [
  { id: "green", label: "Green", color: "#2F9151" },
  { id: "blue", label: "Blue", color: "#5E7898" },
  { id: "gold", label: "Gold", color: "#C99A3C" },
  { id: "red", label: "Red", color: "#C96B60" },
] as const;

export const READOUT_FOCUS_ACCENT_DEFAULT = READOUT_FOCUS_ACCENTS[2].color;

/** Slide status-pill color options (bg / text / matching header dot). */
export const READOUT_PILL_PRESETS = [
  { id: "green", label: "Green", bg: "#E7F2EB", fg: "#2F9151", dot: "#2F9151" },
  { id: "blue", label: "Blue", bg: "#E9F0F7", fg: "#5E7898", dot: "#5E7898" },
  { id: "gold", label: "Gold", bg: "#FBF5E3", fg: "#8A6A1F", dot: "#C99A3C" },
  { id: "red", label: "Red", bg: "#F8EAEA", fg: "#A2483A", dot: "#C96B60" },
] as const;

export const READOUT_TEXT_SIZES = [
  { body: "13px", lineHeight: "1.55", subtitle: "10px" },
  { body: "19px", lineHeight: "1.45", subtitle: "12px" },
  { body: "31px", lineHeight: "1.25", subtitle: "14px" },
  { body: "40px", lineHeight: "1.18", subtitle: "15px" },
] as const;

/** Data-point value sizes — includes one step larger than text cards. */
export const READOUT_DATAPOINT_SIZES = [
  { value: "28px", lineHeight: "1.1", subtitle: "11px" },
  { value: "36px", lineHeight: "1.08", subtitle: "12px" },
  { value: "48px", lineHeight: "1.05", subtitle: "13px" },
  { value: "64px", lineHeight: "1.02", subtitle: "14px" },
] as const;

export const READOUT_PERSPECTIVES = [
  "Employee Experience",
  "Collaboration",
  "Open Text Insights",
  "Workspace Map",
  "Census",
] as const;

/** EE perspectives available for slide deep-links. */
export const READOUT_EE_PERSPECTIVE_OPTIONS = [
  { id: "exec-overview", label: "Campaign Overview" },
  { id: "ee-campaign-results", label: "Detailed Results" },
  { id: "ee-historical-report", label: "Detailed History" },
  { id: "exec-location", label: "Heat Maps" },
  { id: "hr-open-text", label: "Open Text" },
  { id: "ee-brand-report", label: "Brand / Basin Report" },
  { id: "ee-location-comparison", label: "Brand / Basin Comparison" },
  { id: "ee-unit-department-report", label: "Department Report" },
  { id: "ee-department-comparison", label: "Department Comparison" },
  { id: "ee-department-report", label: "Role / Job Category Report" },
  { id: "ee-role-comparison", label: "Role Comparison" },
  { id: "hr-supervisor", label: "Supervisor Report" },
  { id: "ee-supervisor-comparison", label: "Supervisor Comparison" },
  { id: "ee-division-report", label: "Division Report" },
  { id: "ee-division-comparison", label: "Division Comparison" },
  { id: "ee-enps", label: "ENPS" },
] as const;

/** Collaboration perspectives / tabs available for slide deep-links. */
export const READOUT_COLLAB_PERSPECTIVE_OPTIONS = [
  { id: "overview", label: "Overview" },
  { id: "executive-summary", label: "Executive Summary" },
  { id: "cdrs-heatmap", label: "CDRS Heatmap" },
  { id: "cdrs", label: "CDRS" },
  { id: "ci", label: "CI" },
  { id: "segment-signals", label: "Segment Signals" },
  { id: "department-360", label: "Dept 360" },
  { id: "dept", label: "Department Report" },
  { id: "department-ci-report", label: "CI Report" },
  { id: "comments", label: "Comments" },
] as const;

export type DashboardLinkFilterField =
  | "campaign"
  | "prior"
  | "location"
  | "department"
  | "index"
  | "brand"
  | "supervisor";

/** Which optional filters apply for a selected dashboard family + perspective. */
export function dashboardLinkFilterFields(
  family: string | null | undefined,
  perspectiveId: string | null | undefined
): Array<{ key: DashboardLinkFilterField; label: string }> {
  const id = perspectiveId || "";
  if (family === "collaboration") {
    if (
      id === "dept" ||
      id === "department-360" ||
      id === "department-ci-report" ||
      id === "comments"
    ) {
      return [{ key: "department", label: "Department" }];
    }
    return [];
  }

  if (family && family !== "employee_experience") return [];

  const fields: Array<{ key: DashboardLinkFilterField; label: string }> = [
    { key: "campaign", label: "Campaign" },
    { key: "prior", label: "Prior campaign" },
  ];

  if (
    id.includes("location") ||
    id.includes("brand") ||
    id.includes("segment") ||
    id === "exec-location" ||
    id === "hr-open-text" ||
    id === "ee-enps"
  ) {
    fields.push({ key: "location", label: "Location / Basin" });
    fields.push({ key: "brand", label: "Brand" });
  }
  if (
    id.includes("department") ||
    id.includes("unit-department") ||
    id.includes("role") ||
    id === "exec-overview" ||
    id === "ee-campaign-results"
  ) {
    fields.push({ key: "department", label: "Department" });
  }
  if (id.includes("supervisor") || id === "hr-supervisor") {
    fields.push({ key: "supervisor", label: "Supervisor" });
  }
  if (
    id === "ee-campaign-results" ||
    id === "ee-historical-report" ||
    id === "hr-index-dive" ||
    id === "exec-location" ||
    id.includes("comparison") ||
    id.includes("report")
  ) {
    fields.push({ key: "index", label: "Index" });
  }

  return fields;
}

export function romanNumeral(n: number) {
  const table: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = n;
  let out = "";
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      out += symbol;
      remaining -= value;
    }
  }
  return out || "I";
}

export function employeeExperienceAssetHref(clientId: string) {
  if (clientId === "dws") return "/portal/dashboards/employee-experience--dws";
  if (clientId === "dws-field") return "/portal/dashboards/employee-experience--dws-field";
  return `/portal/dashboards/employee-experience--${clientId}`;
}

export function perspectiveHref(persp: string, clientId: string) {
  switch (persp) {
    case "Employee Experience":
    case "Open Text Insights":
      return employeeExperienceAssetHref(clientId);
    case "Collaboration":
      return "/portal/dashboards/collaboration-dashboard";
    case "Workspace Map":
      return "/portal/workspace-map";
    case "Census":
      return "/portal/census";
    default:
      return employeeExperienceAssetHref(clientId);
  }
}

export type DashboardDeepLinkInput = {
  assetId?: string | null;
  href?: string | null;
  family?: string | null;
  product?: string | null;
  perspectiveId?: string | null;
  campaign?: string | null;
  prior?: string | null;
  location?: string | null;
  department?: string | null;
  index?: string | null;
  brand?: string | null;
  supervisor?: string | null;
};

export type DashboardReturnContext = {
  /** Absolute portal path back to the readout (e.g. /portal/readouts/abc/modify). */
  returnTo?: string | null;
  /** Readout slide index (0 = cover). */
  slide?: number | null;
};

/** Only allow in-app readout/insights return paths. */
export function sanitizeReadoutReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const path = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (
    !path.startsWith("/portal/readouts/") &&
    !path.startsWith("/portal/insights/")
  ) {
    return null;
  }
  return path;
}

function resolveDeepLinkBase(clientId: string, link?: DashboardDeepLinkInput | null) {
  if (link?.href?.trim()) return link.href.trim();
  if (link?.assetId?.trim()) return `/portal/dashboards/${link.assetId.trim()}`;

  const family = link?.family;
  if (family === "collaboration" || link?.product === "collaboration") {
    return "/portal/dashboards/collaboration-dashboard";
  }
  if (link?.product === "workspace-map") return "/portal/workspace-map";
  if (link?.product === "census") return "/portal/census";
  return employeeExperienceAssetHref(clientId);
}

/** Build a portal dashboard URL with optional perspective + filter query params. */
export function buildDashboardDeepLink(
  clientId: string,
  link?: DashboardDeepLinkInput | null,
  returnContext?: DashboardReturnContext | null
) {
  const base = resolveDeepLinkBase(clientId, link);
  const family =
    link?.family ||
    (link?.product === "collaboration"
      ? "collaboration"
      : link?.product === "employee-experience" || !link?.product
        ? "employee_experience"
        : link?.product);

  const params = new URLSearchParams();
  const entries: Array<[string, string | null | undefined]> = [
    ["perspective", link?.perspectiveId],
    ["campaign", link?.campaign],
    ["prior", link?.prior],
    ["location", link?.location],
    ["department", link?.department],
    ["index", link?.index],
    ["brand", link?.brand],
    ["supervisor", link?.supervisor],
  ];

  // Collaboration only needs perspective (+ optional department).
  const allowed =
    family === "collaboration"
      ? new Set(["perspective", "department"])
      : family === "employee_experience" || family === "employee-experience" || !family
        ? new Set(entries.map(([key]) => key))
        : new Set(["perspective"]);

  for (const [key, value] of entries) {
    if (!allowed.has(key)) continue;
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }

  const safeReturnTo = sanitizeReadoutReturnTo(returnContext?.returnTo);
  if (safeReturnTo) params.set("returnTo", safeReturnTo);
  if (
    typeof returnContext?.slide === "number" &&
    Number.isFinite(returnContext.slide) &&
    returnContext.slide >= 0
  ) {
    params.set("slide", String(Math.floor(returnContext.slide)));
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Build the href used by the dashboard "Back to readout" control. */
export function buildReadoutReturnHref(
  returnTo: string | null | undefined,
  slide: string | null | undefined
) {
  const safeReturnTo = sanitizeReadoutReturnTo(returnTo);
  if (!safeReturnTo) return null;
  const params = new URLSearchParams();
  if (slide && /^\d+$/.test(slide)) params.set("slide", slide);
  const qs = params.toString();
  return qs ? `${safeReturnTo}?${qs}` : safeReturnTo;
}
