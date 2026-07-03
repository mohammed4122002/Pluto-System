-- 3.9 Row Level Security
--
-- Helper functions run as SECURITY DEFINER so policies can look up the
-- caller's role/clinic in platform_users WITHOUT re-triggering RLS on
-- platform_users itself (avoids "infinite recursion detected in policy").
CREATE OR REPLACE FUNCTION app_is_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_users
    WHERE auth_id = auth.uid() AND role = 'owner' AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION app_clinic_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT clinic_id FROM platform_users
  WHERE auth_id = auth.uid() AND is_active
  LIMIT 1;
$$;

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_db_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_automation ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_execution_log ENABLE ROW LEVEL SECURITY;

-- platform_users: users read their own row (role lookup after login);
-- the owner manages every row.
CREATE POLICY "self_select" ON platform_users FOR SELECT
  USING (auth_id = auth.uid());
CREATE POLICY "owner_all" ON platform_users FOR ALL
  USING (app_is_owner());

-- clinics
CREATE POLICY "owner_all" ON clinics FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON clinics FOR SELECT
  USING (id = app_clinic_id());

-- clinic_channels
CREATE POLICY "owner_all" ON clinic_channels FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON clinic_channels FOR SELECT
  USING (clinic_id = app_clinic_id());

-- clinic_db_config
CREATE POLICY "owner_all" ON clinic_db_config FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON clinic_db_config FOR SELECT
  USING (clinic_id = app_clinic_id());

-- clinic_automation
CREATE POLICY "owner_all" ON clinic_automation FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON clinic_automation FOR SELECT
  USING (clinic_id = app_clinic_id());

-- subscriptions
CREATE POLICY "owner_all" ON subscriptions FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON subscriptions FOR SELECT
  USING (clinic_id = app_clinic_id());

-- n8n_execution_log: owner sees all, clinic staff see their clinic's log
CREATE POLICY "owner_all" ON n8n_execution_log FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON n8n_execution_log FOR SELECT
  USING (clinic_id = app_clinic_id());
