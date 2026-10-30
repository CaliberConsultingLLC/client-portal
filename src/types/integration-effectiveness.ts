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

/** One row of a campaign-over-campaign comparison table. Scores are null when
 * the row has no (or too few) responses in that campaign. */
export interface IntegrationTrendRow {
  id: string;
  label: string;
  respondentCount: number;
  campaign1: number | null;
  campaign2: number | null;
  campaign3: number | null;
  /** All campaigns pooled. */
  overall: number | null;
  /** Responses behind this row, per campaign. */
  counts: { campaign1: number; campaign2: number; campaign3: number };
}

export interface IntegrationBrandTrend {
  index: IntegrationTrendRow;
  questions: IntegrationTrendRow[];
  departments: IntegrationTrendRow[];
  jobTitles: IntegrationTrendRow[];
}

/** Statement-by-group heatmaps for one brand/campaign scope. */
export interface IntegrationHeatmapScope {
  brands: IntegrationHeatmap;
  departments: IntegrationHeatmap;
  jobTitles: IntegrationHeatmap;
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
  /** Campaign-over-campaign movement for this brand. */
  trend: IntegrationBrandTrend;
  /** Statement metrics for one campaign (keyed "Campaign 1".."Campaign 3"). */
  questionMetricsByCampaign: Record<string, IntegrationQuestionMetric[]>;
  priorities: IntegrationPriority[];
  strengths: IntegrationPriority[];
  voice: {
    improvement: IntegrationVoiceEntry[];
    strengths: IntegrationVoiceEntry[];
    preserve: IntegrationVoiceEntry[];
    additional: IntegrationVoiceEntry[];
  };
}

export interface IntegrationLongitudinalSeries {
  id: string;
  label: string;
  campaign1: number | null;
  campaign2: number | null;
  campaign3: number | null;
}

export interface IntegrationLongitudinalScope {
  organization: IntegrationLongitudinalSeries;
  brands: IntegrationLongitudinalSeries[];
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
  /** Organization-wide campaign movement. Statement rows carry the full statement text. */
  trends: {
    organization: IntegrationTrendRow;
    statements: IntegrationTrendRow[];
    brands: IntegrationTrendRow[];
  };
  /** Heatmaps keyed "<brand|all>::<campaign|all>". Campaign columns are ordered oldest to newest. */
  heatmapScopes: Record<string, IntegrationHeatmapScope>;
  /** Statement x Campaign heatmaps keyed by brand (or "all"). Columns run Campaign 1 -> newest. */
  campaignHeatmaps: Record<string, IntegrationHeatmap>;
  longitudinal?: {
    overall: IntegrationLongitudinalScope;
    statements: Record<string, IntegrationLongitudinalScope>;
    departments: Record<string, IntegrationLongitudinalScope>;
  };
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
