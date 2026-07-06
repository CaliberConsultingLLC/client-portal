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
  /** Incoming CDRS rater count (other departments who rated this team). */
  responseCount: number;
  /** Unique raters who answered any CI question about this department (excl. self). */
  ciRaterCount: number;
  incomingByDept: DeptBreakdown[];
  outgoingByDept: DeptBreakdown[];
  /** Average CI from each rater department about this team (excl. self). */
  ciByDept: DeptBreakdown[];
  questionScores: QuestionScore[];
}

export interface CollaborationData {
  meta: CollaborationMeta;
  departmentMetrics: DepartmentMetric[];
  heatmapMatrix: HeatmapRow[];
  departmentDetails: DepartmentDetail[];
}
