-- Instant inbox updates: stream row changes to subscribed clinic staff.
-- RLS still applies to realtime, so staff only receive their own clinic's rows.
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;
