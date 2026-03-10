/** Types for the Collaboration Campaign dashboard data. */

export interface CollaborationMeta {
  totalRespondents: number;
  totalDepartments: number;
  dwsAverageIncoming: number;
  dwsAverageOutgoing: number;
  dwsAverageOverall: number;
  departments: string[];
  ciQuestions: string[];
}

export interface QuestionScore {
  question: string;
  score: number;
  responseCount: number;
}

export interface DepartmentMetric {
  department: string;
  incomingCDRS: number;
  outgoingCDRS: number;
  collaborationIndex: number;
  incomingCount: number;
  outgoingCount: number;
  ciCount: number;
  questionScores: QuestionScore[];
}

export interface HeatmapRow {
  department: string;
  scores: Record<string, number | null>;
}

export interface DeptBreakdown {
  department: string;
  score: number;
  count: number;
}

export interface DepartmentDetail {
  department: string;
  incomingCDRS: number;
  outgoingCDRS: number;
  collaborationIndex: number;
  responseCount: number;
  incomingByDept: DeptBreakdown[];
  outgoingByDept: DeptBreakdown[];
  questionScores: QuestionScore[];
}

export interface CollaborationData {
  meta: CollaborationMeta;
  departmentMetrics: DepartmentMetric[];
  heatmapMatrix: HeatmapRow[];
  departmentDetails: DepartmentDetail[];
}
