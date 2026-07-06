-- Staff Telegram notification linking: a staff member sends "ربط-<their id>"
-- to the clinic bot, and the webhook stores their chat id here. On AI
-- escalation the Transfer-to-Staff tool DMs every linked staff of the clinic.
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS notify_chat_id TEXT;
