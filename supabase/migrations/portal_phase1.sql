-- ============================================================
-- Portal do Cliente — Fase 1
-- Rodar no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Novas colunas em profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Tabela de convites do portal
CREATE TABLE IF NOT EXISTS portal_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  invited_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  token         TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS portal_invites_email_idx  ON portal_invites(email);
CREATE INDEX IF NOT EXISTS portal_invites_token_idx  ON portal_invites(token);
CREATE INDEX IF NOT EXISTS portal_invites_status_idx ON portal_invites(status);

-- 3. RLS em portal_invites
ALTER TABLE portal_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_invites_internal_select"
  ON portal_invites FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'internal'));

CREATE POLICY "portal_invites_internal_insert"
  ON portal_invites FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'internal'));

CREATE POLICY "portal_invites_internal_update"
  ON portal_invites FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'internal'));

-- 4. RLS support_tickets — cliente vê só os da sua conta
CREATE POLICY "portal_tickets_select"
  ON support_tickets FOR SELECT
  USING (
    account_id = (
      SELECT account_id FROM profiles
      WHERE id = auth.uid()
        AND user_type = 'external'
        AND portal_approved_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'internal'
    )
  );

-- 5. RLS sla_events — cliente vê eventos dos seus tickets
CREATE POLICY "portal_sla_events_select"
  ON sla_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      JOIN profiles p ON p.account_id = st.account_id
      WHERE st.id = sla_events.ticket_id
        AND p.id = auth.uid()
        AND (
          p.user_type = 'internal'
          OR (p.user_type = 'external' AND p.portal_approved_at IS NOT NULL)
        )
    )
  );
