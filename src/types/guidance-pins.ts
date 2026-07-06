export type GuidancePinAccent = "blue" | "red" | "green";

export interface DashboardGuidancePin {
  id: string;
  title: string;
  body: string;
  accent: GuidancePinAccent;
  order: number;
}

export interface DashboardGuidanceScope {
  id: string;
  dashboardInstanceId: string;
  perspectiveId: string;
  campaignLabel: string;
  filterKey: string;
  pins: DashboardGuidancePin[];
  updatedAt: string;
  updatedBy?: string | null;
}
