export type CensusUploadStatus = "ready" | "error";

export interface CensusUploadSummary {
  id: string;
  clientId: string;
  surveyId: string;
  surveyLabel: string;
  dashboardAssetId?: string | null;
  dashboardTitle?: string | null;
  fileName: string;
  rowCount: number;
  columns: string[];
  employeeIdColumn: string;
  departmentColumn?: string | null;
  rawStoragePath: string;
  processedStoragePath: string;
  status: CensusUploadStatus;
  uploadedByUid: string;
  uploadedByEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
}

export interface CensusPreview {
  upload: CensusUploadSummary | null;
  rows: Record<string, string>[];
  departmentCounts: Array<{
    department: string;
    employeeCount: number;
    responseCount?: number;
    responseRate?: number;
  }>;
}
