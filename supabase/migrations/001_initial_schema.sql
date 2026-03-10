-- ============================================================
-- North Star Partners — Initial Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- =========================
-- ORGANIZATIONS (Clients)
-- =========================
create table organizations (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text unique not null,
  domain        text,
  logo_url      text,
  industry      text,
  employee_count integer,
  contact_name  text,
  contact_email text,
  status        text not null default 'active'
                check (status in ('active','paused','archived')),
  settings      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- =========================
-- USERS (Admin + Client contacts)
-- =========================
create table users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text unique not null,
  full_name       text,
  role            text not null default 'client_viewer'
                  check (role in ('super_admin','admin','analyst','client_admin','client_viewer')),
  organization_id uuid references organizations(id),
  avatar_url      text,
  last_sign_in    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- =========================
-- MAGIC LINK TOKENS
-- =========================
create table magic_link_tokens (
  id              uuid primary key default uuid_generate_v4(),
  token           text unique not null,
  user_id         uuid references users(id),
  organization_id uuid references organizations(id) not null,
  email           text not null,
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_at      timestamptz default now()
);
create index idx_mlt_token on magic_link_tokens(token);
create index idx_mlt_expires on magic_link_tokens(expires_at);

-- =========================
-- PRODUCT MODULES
-- =========================
create table product_modules (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  icon        text,
  is_active   boolean default true,
  config      jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

-- =========================
-- CAMPAIGNS / PROJECTS
-- =========================
create table campaigns (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id),
  product_module_id uuid references product_modules(id),
  name              text not null,
  description       text,
  status            text not null default 'draft'
                    check (status in ('draft','collecting','paused','analyzing','complete','archived')),
  config            jsonb default '{}'::jsonb,
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_by        uuid references users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index idx_campaigns_org on campaigns(organization_id);

-- =========================
-- SURVEY CONFIGURATIONS
-- =========================
create table surveys (
  id                  uuid primary key default uuid_generate_v4(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  title               text not null,
  description         text,
  surveymonkey_id     text,
  surveymonkey_url    text,
  status              text not null default 'draft'
                      check (status in ('draft','active','closed','archived')),
  question_config     jsonb not null default '[]'::jsonb,
  distribution_config jsonb default '{}'::jsonb,
  response_count      integer default 0,
  opens_at            timestamptz,
  closes_at           timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index idx_surveys_campaign on surveys(campaign_id);
create index idx_surveys_sm on surveys(surveymonkey_id);

-- =========================
-- SURVEY RESPONSES (raw)
-- =========================
create table survey_responses (
  id            uuid primary key default uuid_generate_v4(),
  survey_id     uuid not null references surveys(id) on delete cascade,
  campaign_id   uuid not null references campaigns(id),
  respondent_id text,
  sm_response_id text,
  raw_data      jsonb,
  submitted_at  timestamptz,
  created_at    timestamptz default now()
);
create index idx_responses_survey on survey_responses(survey_id);
create index idx_responses_campaign on survey_responses(campaign_id);

-- =========================
-- RESPONSE ANSWERS (normalized)
-- =========================
create table response_answers (
  id                uuid primary key default uuid_generate_v4(),
  response_id       uuid not null references survey_responses(id) on delete cascade,
  question_key      text not null,
  question_text     text,
  answer_value      text,
  numeric_value     numeric,
  dimension         text,
  category          text,
  sub_category      text,
  created_at        timestamptz default now()
);
create index idx_answers_response on response_answers(response_id);
create index idx_answers_question on response_answers(question_key);
create index idx_answers_category on response_answers(category, sub_category);

-- =========================
-- AGGREGATED METRICS (pre-computed)
-- =========================
create table aggregated_metrics (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid not null references campaigns(id),
  survey_id       uuid references surveys(id),
  metric_type     text not null,
  category        text,
  sub_category    text,
  dimension       text,
  value           numeric not null,
  sample_size     integer,
  metadata        jsonb default '{}'::jsonb,
  period_start    timestamptz,
  period_end      timestamptz,
  computed_at     timestamptz default now()
);
create index idx_agg_campaign on aggregated_metrics(campaign_id);
create index idx_agg_type on aggregated_metrics(metric_type, category);

-- =========================
-- REPORTS
-- =========================
create table reports (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid references campaigns(id),
  organization_id uuid not null references organizations(id),
  title           text not null,
  description     text,
  report_type     text not null default 'dashboard'
                  check (report_type in ('dashboard','pdf','presentation','custom')),
  layout_config   jsonb default '{}'::jsonb,
  data_config     jsonb default '{}'::jsonb,
  status          text default 'draft'
                  check (status in ('draft','published','archived')),
  published_at    timestamptz,
  pdf_url         text,
  created_by      uuid references users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_reports_org on reports(organization_id);
create index idx_reports_campaign on reports(campaign_id);

-- =========================
-- REPORT SHARES
-- =========================
create table report_shares (
  id              uuid primary key default uuid_generate_v4(),
  report_id       uuid not null references reports(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  shared_with     uuid references users(id),
  access_level    text default 'view'
                  check (access_level in ('view','comment','edit')),
  expires_at      timestamptz,
  created_at      timestamptz default now()
);
create index idx_shares_report on report_shares(report_id);
create index idx_shares_org on report_shares(organization_id);

-- =========================
-- AUTO-UPDATE TIMESTAMPS
-- =========================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated before update on organizations
  for each row execute function update_updated_at();
create trigger trg_users_updated before update on users
  for each row execute function update_updated_at();
create trigger trg_campaigns_updated before update on campaigns
  for each row execute function update_updated_at();
create trigger trg_surveys_updated before update on surveys
  for each row execute function update_updated_at();
create trigger trg_reports_updated before update on reports
  for each row execute function update_updated_at();
