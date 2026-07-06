export interface EmployeeExperienceQuestionMetric {
  id: string;
  itemId: number;
  dimension: string;
  statement: string;
  score: number;
  previousScore: number | null;
  delta: number | null;
  responseCount: number;
  favorablePct: number;
}

export interface EmployeeExperienceQuestionDefinition {
  itemId: number;
  dimension: string;
  statement: string;
}

export interface EmployeeExperienceDimensionMetric {
  id: string;
  label: string;
  score: number;
  previousScore: number | null;
  delta: number | null;
  questionIds: string[];
}

export interface EmployeeExperienceGroupMetric {
  id: string;
  label: string;
  score: number;
  previousScore: number | null;
  delta: number | null;
  respondentCount: number;
}

export interface EmployeeExperienceCampaignMetric {
  id: string;
  label: string;
  score: number;
  respondentCount: number;
  order: number;
}

export interface EmployeeExperienceTrendPoint {
  label: string;
  order: number;
  overall: number;
  [key: string]: string | number;
}

export interface EmployeeExperienceRespondent {
  id: string;
  campaignRaw: string;
  campaignLabel: string;
  campaignTime: number;
  location: string;
  department: string;
  division: string;
  supervisor: string;
  jobTitle: string;
  fieldCategory: string;
  leadership: string;
  generation: string;
  rateType: string;
  tenure: string;
  rating: string;
  // Organizational role (e.g. Employee / Supervisor / Director) — distinct from job title/category.
  role?: string;
  scores: Record<number, number | null>;
  comments: {
    strengths: string;
    improvement: string;
    supervisor: string;
    acquisition: string;
  };
}

export interface EmployeeExperienceVoiceEntry {
  id: string;
  respondentId: string;
  campaign: string;
  department: string;
  location: string;
  supervisor: string;
  text: string;
}

export interface EmployeeExperienceCommentTheme {
  id: string;
  label: string;
  mentionCount: number;
  synopsis: string;
  sample: string[];
}

export interface EmployeeExperienceHeatmap {
  rows: string[];
  columns: string[];
  data: Array<{ department: string; scores: Record<string, number | null> }>;
  rowTotals: Record<string, number>;
  columnTotals: Record<string, number>;
}

export interface EmployeeExperienceSegmentReport {
  label: string;
  respondentCount: number;
  score: number;
  previousScore: number | null;
  delta: number | null;
  dimensionMetrics: EmployeeExperienceDimensionMetric[];
  questionMetrics: EmployeeExperienceQuestionMetric[];
}

export interface EmployeeExperienceDashboardData {
  meta: {
    organizationName: string;
    currentCampaignLabel: string;
    priorCampaignLabel: string | null;
    totalResponses: number;
    totalCampaigns: number;
    totalDepartments: number;
    totalSupervisors: number;
    campaigns: string[];
    dataSourceLabel: string;
    // Optional per-client override for the demographic "Results by Segment" dimensions.
    // When present, these (and only these) segment dimensions are built — keyed to real
    // database columns for the client. When absent, the default segment set is used.
    segmentFields?: Array<{ id: string; label: string; field: keyof EmployeeExperienceRespondent }>;
  };
  settings: {
    minimumSegmentSize: number;
    hiddenDimensionIds?: string[];
  };
  questions: EmployeeExperienceQuestionDefinition[];
  enpsDefinitions?: EmployeeExperienceQuestionDefinition[];
  respondents: EmployeeExperienceRespondent[];
  // External/partner respondents (e.g. AutoSEP) that are excluded from every
  // org-wide score and view, but surfaced in their own dedicated report.
  partnerRespondents?: EmployeeExperienceRespondent[];
  partnerLabel?: string;
  overview: {
    experienceIndex: number;
    previousIndex: number | null;
    delta: number | null;
    favorablePct: number;
    concernPct: number;
    assessment: string;
    summary: string;
  };
  questionMetrics: EmployeeExperienceQuestionMetric[];
  dimensionMetrics: EmployeeExperienceDimensionMetric[];
  campaignMetrics: EmployeeExperienceCampaignMetric[];
  trend: EmployeeExperienceTrendPoint[];
  departmentMetrics: EmployeeExperienceGroupMetric[];
  supervisorMetrics: EmployeeExperienceGroupMetric[];
  locationMetrics: EmployeeExperienceGroupMetric[];
  fieldUnitMetrics: EmployeeExperienceGroupMetric[];
  divisionMetrics: EmployeeExperienceGroupMetric[];
  leadershipMetrics: EmployeeExperienceGroupMetric[];
  heatmaps: {
    campaigns: EmployeeExperienceHeatmap;
    departments: EmployeeExperienceHeatmap;
    supervisors: EmployeeExperienceHeatmap;
    locations: EmployeeExperienceHeatmap;
    fieldUnits: EmployeeExperienceHeatmap;
  };
  departmentReports: EmployeeExperienceSegmentReport[];
  supervisorReports: EmployeeExperienceSegmentReport[];
  fieldUnitReports: EmployeeExperienceSegmentReport[];
  divisionReports: EmployeeExperienceSegmentReport[];
  commentThemes: EmployeeExperienceCommentTheme[];
  voice: {
    strengths: EmployeeExperienceVoiceEntry[];
    improvement: EmployeeExperienceVoiceEntry[];
    supervisor: EmployeeExperienceVoiceEntry[];
    acquisition: EmployeeExperienceVoiceEntry[];
  };
}
