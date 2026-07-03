-- 3.9 Row Level Security
-- Platform users can only read their own clinic's data
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_db_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_automation ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

-- platform_users: a user must be able to read their own row (role lookup),
-- and the owner can see/manage every row.
CREATE POLICY "self_select" ON platform_users FOR SELECT
  USING (auth_id = auth.uid());

CREATE POLICY "owner_all" ON platform_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_id = auth.uid() AND role = 'owner'
    )
  );

-- Owner sees everything
CREATE POLICY "owner_all" ON clinics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_id = auth.uid() AND role = 'owner'
    )
  );

-- Clinic staff sees only their clinic
CREATE POLICY "clinic_staff_select" ON clinics FOR SELECT
  USING (
    id IN (
      SELECT clinic_id FROM platform_users
      WHERE auth_id = auth.uid()
    )
  );

-- Apply same pattern to all other clinic_id-based tables
CREATE POLICY "owner_all" ON clinic_channels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_id = auth.uid() AND role = 'owner'
    )
  );
CREATE POLICY "clinic_staff_select" ON clinic_channels FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM platform_users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "owner_all" ON clinic_db_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_id = auth.uid() AND role = 'owner'
    )
  );
CREATE POLICY "clinic_staff_select" ON clinic_db_config FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM platform_users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "owner_all" ON clinic_automation FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_id = auth.uid() AND role = 'owner'
    )
  );
CREATE POLICY "clinic_staff_select" ON clinic_automation FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM platform_users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "owner_all" ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_id = auth.uid() AND role = 'owner'
    )
  );
CREATE POLICY "clinic_staff_select" ON subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM platform_users
      WHERE auth_id = auth.uid()
    )
  );
