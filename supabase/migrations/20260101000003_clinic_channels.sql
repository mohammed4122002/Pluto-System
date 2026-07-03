-- 3.3 Clinic communication channels
CREATE TABLE clinic_channels (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id        UUID REFERENCES clinics(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL
                   CHECK (channel IN ('whatsapp','telegram','messenger','instagram','facebook')),
  is_enabled       BOOLEAN DEFAULT FALSE,
  -- WhatsApp (Meta Business API)
  wa_phone_number  TEXT,
  wa_phone_id      TEXT,          -- Phone Number ID from Meta
  wa_waba_id       TEXT,          -- WhatsApp Business Account ID
  wa_access_token  TEXT,          -- Permanent System User Token
  wa_verify_token  TEXT,          -- For webhook verification
  wa_webhook_url   TEXT,          -- Auto-generated: n8n webhook URL
  -- Telegram
  tg_bot_token     TEXT,
  tg_chat_id       TEXT,
  -- Messenger / Facebook
  fb_page_id       TEXT,
  fb_page_token    TEXT,
  -- Instagram
  ig_account_id    TEXT,
  ig_access_token  TEXT,
  -- Shared
  last_verified_at TIMESTAMPTZ,
  verified         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
