export type CollaborationPerspectiveAccessOption = {
  id: string;
  label: string;
};

type CollaborationPerspectiveAccess = {
  perspectiveAccessMode?: "full" | "restricted";
  allowedPerspectiveIds?: string[];
};

export const COLLABORATION_DASHBOARD_BASE_IDS = new Set([
  "collaboration-dashboard",
  "tf-collaboration",
]);

/** Runtime tab IDs used by the collaboration dashboard (demo + live). */
export const COLLABORATION_PERSPECTIVE_ACCESS_OPTIONS: CollaborationPerspectiveAccessOption[] = [
  { id: "overview", label: "Overview" },
  { id: "executive-summary", label: "Executive Summary" },
  { id: "critical-relationships", label: "Critical Relationships" },
  { id: "cdrs-heatmap", label: "Heatmap" },
  { id: "cdrs", label: "CDRS" },
  { id: "ci", label: "CI" },
  { id: "ci-hotspots", label: "CI Hotspots" },
  { id: "segment-signals", label: "Segment Signals" },
  { id: "department-360", label: "Dept 360" },
  { id: "dept", label: "CDRS Report" },
  { id: "department-ci-report", label: "CI Report" },
  { id: "comments", label: "Comments" },
  { id: "action-priorities", label: "Action Priorities" },
];

const COLLABORATION_PERSPECTIVE_ACCESS_IDS = new Set(
  COLLABORATION_PERSPECTIVE_ACCESS_OPTIONS.map((option) => option.id)
);

/** Library / renderer keys that should resolve to the live tab IDs. */
export const COLLABORATION_PERSPECTIVE_ID_ALIASES: Record<string, string[]> = {
  "collaboration-overview": ["overview"],
  "collaboration.overview": ["overview"],
  "collaboration-cdrs-heatmap": ["cdrs-heatmap"],
  "collaboration.cdrsheatmap": ["cdrs-heatmap"],
  "collaboration-cdrs": ["cdrs"],
  "collaboration.cdrs": ["cdrs"],
  "collaboration-ci": ["ci"],
  "collaboration.ci": ["ci"],
  "collaboration-department-report": ["dept"],
  "collaboration.departmentreport": ["dept"],
};

export function isCollaborationDashboardAsset(assetId: string) {
  const base = assetId.split("--")[0] ?? assetId;
  return COLLABORATION_DASHBOARD_BASE_IDS.has(base);
}

export function listCollaborationPerspectiveOptionsForAsset(assetId: string) {
  return isCollaborationDashboardAsset(assetId)
    ? COLLABORATION_PERSPECTIVE_ACCESS_OPTIONS
    : [];
}

export function expandCollaborationPerspectiveAccessId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const normalized = trimmed.toLowerCase();
  const exactMatch = COLLABORATION_PERSPECTIVE_ACCESS_OPTIONS.find(
    (option) => option.id.toLowerCase() === normalized
  );
  if (exactMatch) {
    return [exactMatch.id];
  }

  const aliases = COLLABORATION_PERSPECTIVE_ID_ALIASES[normalized] ?? [];
  return aliases.filter((alias) => COLLABORATION_PERSPECTIVE_ACCESS_IDS.has(alias));
}

export function isCollaborationPerspectiveAccessRestricted(
  access?: CollaborationPerspectiveAccess
) {
  return (
    access?.perspectiveAccessMode === "restricted" ||
    (access?.allowedPerspectiveIds?.length ?? 0) > 0
  );
}

export function resolveAllowedCollaborationTabIds(
  access?: CollaborationPerspectiveAccess
): Set<string> | null {
  if (!isCollaborationPerspectiveAccessRestricted(access)) {
    return null;
  }

  const allowed = new Set<string>();
  (access?.allowedPerspectiveIds ?? []).forEach((value) => {
    expandCollaborationPerspectiveAccessId(value).forEach((id) => allowed.add(id));
  });
  return allowed;
}

export function filterCollaborationTabIds(
  tabIds: string[],
  access?: CollaborationPerspectiveAccess
) {
  const allowed = resolveAllowedCollaborationTabIds(access);
  if (!allowed) {
    return tabIds;
  }
  return tabIds.filter((id) => allowed.has(id));
}

export function filterCollaborationModeSections<
  T extends { id: string; label: string; tabIds: string[] },
>(sections: T[], access?: CollaborationPerspectiveAccess) {
  const allowed = resolveAllowedCollaborationTabIds(access);
  if (!allowed) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      tabIds: section.tabIds.filter((id) => allowed.has(id)),
    }))
    .filter((section) => section.tabIds.length > 0);
}

export function filterCollaborationTabs<T extends { id: string }>(
  tabs: T[],
  access?: CollaborationPerspectiveAccess
) {
  const allowed = resolveAllowedCollaborationTabIds(access);
  if (!allowed) {
    return tabs;
  }
  return tabs.filter((tab) => allowed.has(tab.id));
}
