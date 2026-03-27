export interface IntegrationQuestionMetric {
  id: string;
  itemId: number;
  shortLabel: string;
  statement: string;
  score: number;
  favorablePct: number;
  concernPct: number;
  responseCount: number;
}

export interface IntegrationDimensionMetric {
  id: string;
  label: string;
  score: number;
  favorablePct: number;
  questionIds: string[];
}

export interface IntegrationGroupMetric {
  id: string;
  label: string;
  respondentCount: number;
  score: number;
  favorablePct: number;
}

export interface IntegrationPriority {
  id: string;
  title: string;
  detail: string;
  action: string;
  score: number;
}

export interface IntegrationVoiceEntry {
  id: string;
  respondentId: string;
  brand: string;
  department: string;
  campaign: string;
  text: string;
}

export interface IntegrationCommentTheme {
  id: string;
  label: string;
  mentionCount: number;
  synopsis: string;
  sample: string[];
}

export interface IntegrationHeatmap {
  rows: string[];
  columns: string[];
  data: Array<{ department: string; scores: Record<string, number | null> }>;
  rowTotals: Record<string, number>;
  columnTotals: Record<string, number>;
}

export interface IntegrationBrandReport {
  selectedBrand: string;
  respondentCount: number;
  integrationIndex: number;
  favorablePct: number;
  concernPct: number;
  questionMetrics: IntegrationQuestionMetric[];
  departmentMetrics: IntegrationGroupMetric[];
  jobTitleMetrics: IntegrationGroupMetric[];
  departmentHeatmap: IntegrationHeatmap;
  jobTitleHeatmap: IntegrationHeatmap;
  priorities: IntegrationPriority[];
  strengths: IntegrationPriority[];
  voice: {
    improvement: IntegrationVoiceEntry[];
    strengths: IntegrationVoiceEntry[];
    preserve: IntegrationVoiceEntry[];
    additional: IntegrationVoiceEntry[];
  };
}

export interface IntegrationDashboardData {
  meta: {
    organizationName: string;
    totalRespondents: number;
    totalBrands: number;
    totalCampaigns: number;
    totalDepartments: number;
    brands: string[];
    campaigns: string[];
    dataSourceLabel: string;
  };
  overview: {
    integrationIndex: number;
    favorablePct: number;
    concernPct: number;
    assessment: string;
    summary: string;
  };
  questionMetrics: IntegrationQuestionMetric[];
  dimensionMetrics: IntegrationDimensionMetric[];
  departmentMetrics: IntegrationGroupMetric[];
  jobTitleMetrics: IntegrationGroupMetric[];
  campaignDateMetrics: IntegrationGroupMetric[];
  brandMetrics: IntegrationGroupMetric[];
  campaignMetrics: IntegrationGroupMetric[];
  heatmaps: {
    campaigns: IntegrationHeatmap;
    brands: IntegrationHeatmap;
    departments: IntegrationHeatmap;
    jobTitles: IntegrationHeatmap;
    campaignDates: IntegrationHeatmap;
  };
  brandReports: IntegrationBrandReport[];
  priorities: IntegrationPriority[];
  strengths: IntegrationPriority[];
  commentThemes: IntegrationCommentTheme[];
  voice: {
    improvement: IntegrationVoiceEntry[];
    strengths: IntegrationVoiceEntry[];
    preserve: IntegrationVoiceEntry[];
    additional: IntegrationVoiceEntry[];
  };
}
