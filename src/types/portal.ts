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

export interface PortalWorkspace {
  id: string;
  name: string;
  welcomeTitle: string;
  welcomeBody: string;
  assets: PortalAsset[];
}
