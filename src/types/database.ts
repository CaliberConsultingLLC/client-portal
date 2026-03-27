// Database types matching Supabase schema (001_initial_schema.sql)

export type UserRole =
  | "super_admin"
  | "admin"
  | "analyst"
  | "client_admin"
  | "client_viewer"
  | "nsp_admin";
export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type SurveyStatus = "draft" | "active" | "closed";
export type ReportStatus = "draft" | "published" | "archived";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  industry: string | null;
  size_range?: string | null;
  employee_count?: number | null;
  logo_url: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  primary_contact_email?: string | null;
  status?: "active" | "paused" | "archived";
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  auth_id?: string | null;
  org_id?: string | null;
  organization_id?: string | null;
  role: UserRole;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_login_at?: string | null;
  last_sign_in?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  org_id: string;
  product_module_id: string | null;
  name: string;
  description: string | null;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  organization?: Organization;
  product_module?: ProductModule;
  surveys?: Survey[];
}

export interface Survey {
  id: string;
  campaign_id: string;
  surveymonkey_id: string | null;
  title: string;
  status: SurveyStatus;
  response_count: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  campaign?: Campaign;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  surveymonkey_response_id: string | null;
  respondent_email: string | null;
  respondent_metadata: Record<string, unknown>;
  submitted_at: string;
  raw_data: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

export interface ResponseAnswer {
  id: string;
  response_id: string;
  question_key: string;
  question_text: string | null;
  answer_value: string | null;
  answer_numeric: number | null;
  dimension: string | null;
  trait: string | null;
}

export interface AggregatedMetric {
  id: string;
  campaign_id: string;
  org_id: string;
  dimension: string;
  trait: string | null;
  metric_name: string;
  metric_value: number;
  sample_size: number;
  computed_at: string;
  breakdown: Record<string, unknown>;
}

export interface Report {
  id: string;
  campaign_id: string;
  title: string;
  status: ReportStatus;
  config: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  campaign?: Campaign;
}

export interface ReportShare {
  id: string;
  report_id: string;
  org_id: string;
  shared_by: string;
  access_token: string;
  expires_at: string | null;
  created_at: string;
}

export interface ProductModule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface MagicLinkToken {
  id: string;
  email: string;
  token_hash: string;
  org_id: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// ── Collaboration Campaign ──────────────────────────────────
export type CollabCampaignStatus = "draft" | "processing" | "ready" | "error";

export interface CollabCampaign {
  id: string;
  org_id: string;
  campaign_id: string | null;
  name: string;
  slug: string;
  status: CollabCampaignStatus;
  config: Record<string, unknown>;
  respondent_count: number;
  department_count: number;
  processed_data: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  organization?: Organization;
}
