export type PortalAssetType = "dashboard" | "report" | "document" | "resource";
export type PortalAssetStatus = "active" | "coming_soon" | "draft";

export interface PortalClient {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  isDemo?: boolean;
}

export interface PortalAsset {
  id: string;
  title: string;
  description: string;
  type: PortalAssetType;
  status: PortalAssetStatus;
  href?: string;
  previewHref?: string;
  updatedLabel?: string;
  tags?: string[];
}

export interface PortalDashboardAssignment {
  id: string;
  clientId: string;
  dashboardInstanceId: string;
  assetId: string;
  title: string;
  description: string;
  href: string;
  previewHref?: string;
  status: "active" | "draft" | "hidden";
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PortalDashboardFamily =
  | "collaboration"
  | "integration"
  | "employee_experience";

export type PortalDashboardStatus = "active" | "draft" | "archived";
export type PortalDashboardInstanceStatus = "active" | "inactive" | "draft";
export type PortalReportStatus = "active" | "draft" | "archived";
export type PortalDashboardDataMappingStatus = "draft" | "validated" | "error";

export interface PortalDashboard {
  id: string;
  assetId: string;
  family: PortalDashboardFamily;
  title: string;
  versionLabel?: string | null;
  categoryIds?: string[];
  categoryLabels?: string[];
  description: string;
  status: PortalDashboardStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalDashboardDataSource {
  kind: "synthetic_demo" | "firebase_csv_workspace" | "manual";
  label: string;
  sourceClientId?: string | null;
  notes?: string | null;
}

export interface PortalDashboardSettings {
  status: PortalDashboardInstanceStatus;
  visibilityThreshold?: number | null;
  hiddenDimensionIds?: string[];
  /**
   * Marks this dashboard instance as migrated to the v2 portal layout
   * (currently built for DWS Field only — see the
   * `clientScope.key === "dws-field"` shell-mount gate in
   * dashboard-implementation.tsx) as its permanent default, instead of the
   * classic layout. This is a one-way migration marker, not a reversible
   * feature preference — it is set once per instance via the dashboard
   * instances API or a one-off admin script, not exposed as a day-to-day
   * settings toggle. The `?layout=redesign` URL param remains available
   * separately as a manual debug override on any instance.
   *
   * Kept as a plain boolean rather than a `layoutVersion` enum since there is
   * currently only one v2 layout; if a distinct alternate layout is ever
   * needed, this can be widened to an enum (mirroring the `status` field
   * pattern above) without breaking callers that just check truthiness.
   */
  redesignEnabled?: boolean;
}

export interface PortalDashboardDataMappingValidation {
  missingRequiredFields: string[];
  warnings: string[];
  lastValidatedAt?: string | null;
}

export interface PortalDashboardDataMapping {
  schemaId: string;
  status: PortalDashboardDataMappingStatus;
  fieldMappings: Record<string, string>;
  notes?: string | null;
  validation: PortalDashboardDataMappingValidation;
}

export interface PortalDashboardInstance {
  id: string;
  dashboardId: string;
  assetId: string;
  family: PortalDashboardFamily;
  title: string;
  description: string;
  previewHref?: string;
  internalNotes?: string | null;
  logoUrl?: string | null;
  dataSource: PortalDashboardDataSource;
  dataMapping?: PortalDashboardDataMapping | null;
  settings: PortalDashboardSettings;
  perspectiveCount: number;
  reportCount: number;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalDashboardAccessGrant {
  id: string;
  clientId: string;
  dashboardInstanceId: string;
  status: "active" | "draft" | "hidden";
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PerspectiveLibraryItem {
  id: string;
  dashboardId: string;
  family: PortalDashboardFamily;
  title: string;
  versionLabel?: string | null;
  description: string;
  rendererKey: string;
  defaultCategoryIds?: string[];
  defaultCategoryLabels?: string[];
  notes?: string | null;
  status: "active" | "draft";
  createdAt?: string;
  updatedAt?: string;
}

export interface PerspectiveInstance {
  id: string;
  dashboardInstanceId: string;
  libraryItemId: string;
  title: string;
  description: string;
  rendererKey: string;
  order: number;
  categoryIds?: string[];
  categoryLabels?: string[];
  isCustomized?: boolean;
  status: "active" | "draft";
  createdAt?: string;
  updatedAt?: string;
}

export type DashboardPerspectiveInstance = PerspectiveInstance;

export interface PortalReport {
  id: string;
  dashboardId: string;
  perspectiveId?: string | null;
  title: string;
  versionLabel?: string | null;
  description: string;
  status: PortalReportStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportInstance {
  id: string;
  reportId: string;
  dashboardId: string;
  perspectiveId?: string | null;
  clientId: string;
  title: string;
  description: string;
  versionLabel?: string | null;
  status: "active" | "draft";
  campaignLabel?: string | null;
  publishedOn?: string | null;
  href?: string | null;
  downloadHref?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalWorkspace {
  id: string;
  name: string;
  welcomeTitle: string;
  welcomeBody: string;
  assets: PortalAsset[];
}
