export function slugifyExportSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildDashboardExportFilename(parts: {
  client?: string;
  perspective: string;
  campaign?: string;
}) {
  const segments = [parts.client, parts.perspective, parts.campaign]
    .filter((segment): segment is string => Boolean(segment?.trim()))
    .map(slugifyExportSegment);

  return `${segments.join("-") || "dashboard-visual"}.png`;
}

export const DASHBOARD_VISUAL_EXPORT_TARGET_ID = "dashboard-visual-export-root";
