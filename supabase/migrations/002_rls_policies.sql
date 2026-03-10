-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table users enable row level security;
alter table campaigns enable row level security;
alter table surveys enable row level security;
alter table survey_responses enable row level security;
alter table response_answers enable row level security;
alter table aggregated_metrics enable row level security;
alter table reports enable row level security;
alter table report_shares enable row level security;
alter table magic_link_tokens enable row level security;
alter table product_modules enable row level security;

-- =========================
-- HELPER FUNCTIONS
-- =========================

create or replace function get_user_role()
returns text as $$
  select role from users where id = auth.uid();
$$ language sql security definer stable;

create or replace function get_user_org_id()
returns uuid as $$
  select organization_id from users where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_nsp_admin()
returns boolean as $$
  select coalesce(get_user_role() in ('super_admin', 'admin', 'analyst'), false);
$$ language sql security definer stable;

-- =========================
-- ORGANIZATIONS
-- =========================
create policy "admins_all_orgs" on organizations
  for all using (is_nsp_admin());
create policy "clients_own_org" on organizations
  for select using (id = get_user_org_id());

-- =========================
-- USERS
-- =========================
create policy "admins_all_users" on users
  for all using (is_nsp_admin());
create policy "users_own_profile" on users
  for select using (id = auth.uid());

-- =========================
-- CAMPAIGNS
-- =========================
create policy "admins_all_campaigns" on campaigns
  for all using (is_nsp_admin());
create policy "clients_own_campaigns" on campaigns
  for select using (organization_id = get_user_org_id());

-- =========================
-- SURVEYS
-- =========================
create policy "admins_all_surveys" on surveys
  for all using (is_nsp_admin());
create policy "clients_own_surveys" on surveys
  for select using (
    campaign_id in (select id from campaigns where organization_id = get_user_org_id())
  );

-- =========================
-- SURVEY RESPONSES (admin only — confidential)
-- =========================
create policy "admins_all_responses" on survey_responses
  for all using (is_nsp_admin());

-- =========================
-- RESPONSE ANSWERS (admin only — confidential)
-- =========================
create policy "admins_all_answers" on response_answers
  for all using (is_nsp_admin());

-- =========================
-- AGGREGATED METRICS
-- =========================
create policy "admins_all_metrics" on aggregated_metrics
  for all using (is_nsp_admin());
create policy "clients_own_metrics" on aggregated_metrics
  for select using (
    campaign_id in (select id from campaigns where organization_id = get_user_org_id())
  );

-- =========================
-- REPORTS
-- =========================
create policy "admins_all_reports" on reports
  for all using (is_nsp_admin());
create policy "clients_shared_reports" on reports
  for select using (
    id in (select report_id from report_shares where organization_id = get_user_org_id())
  );

-- =========================
-- REPORT SHARES
-- =========================
create policy "admins_all_shares" on report_shares
  for all using (is_nsp_admin());
create policy "clients_own_shares" on report_shares
  for select using (organization_id = get_user_org_id());

-- =========================
-- MAGIC LINK TOKENS (admin only)
-- =========================
create policy "admins_all_tokens" on magic_link_tokens
  for all using (is_nsp_admin());

-- =========================
-- PRODUCT MODULES (read-only for everyone)
-- =========================
create policy "anyone_read_modules" on product_modules
  for select using (true);
create policy "admins_manage_modules" on product_modules
  for all using (is_nsp_admin());
