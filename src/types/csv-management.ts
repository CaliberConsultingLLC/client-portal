export type DataWorkspaceStatus = "ready" | "needs_setup" | "demo";
export type DataFileStatus = "configured" | "missing" | "sample";

export interface DataWorkspaceFile {
  id: string;
  label: string;
  description: string;
  status: DataFileStatus;
}

export interface ClientDataWorkspace {
  clientId: string;
  clientName: string;
  shortName: string;
  status: DataWorkspaceStatus;
  sourceOfTruth: string;
  storageTarget: string;
  linkedDashboards: string[];
  files: DataWorkspaceFile[];
  notes: string;
}
