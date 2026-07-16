-- New clinics should start as 'active' (نشِط), not 'trial'. The Add-Clinic
-- flow doesn't set status explicitly — it relies on the column default — so
-- flipping the default is enough for every clinic created from now on.
-- Existing rows are unaffected by a default change; they were already set
-- to 'active' by an earlier data update.
ALTER TABLE clinics ALTER COLUMN status SET DEFAULT 'active';
