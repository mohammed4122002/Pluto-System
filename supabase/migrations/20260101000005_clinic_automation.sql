-- 3.5 Clinic automation settings
CREATE TABLE clinic_automation (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id             UUID UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  reminder_enabled      BOOLEAN DEFAULT TRUE,
  reminder_hours_before INTEGER DEFAULT 2,          -- hours before appointment
  reminder_message_ar   TEXT,                       -- Arabic message template
  reminder_message_en   TEXT,
  rating_enabled        BOOLEAN DEFAULT TRUE,
  rating_delay_hours    INTEGER DEFAULT 1,           -- hours after appointment end
  rating_message_ar     TEXT,
  working_hours_start   TIME DEFAULT '08:00',
  working_hours_end     TIME DEFAULT '20:00',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
