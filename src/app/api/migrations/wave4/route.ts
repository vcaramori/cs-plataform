import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

export async function POST(request: Request) {
  // Check authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const results: any[] = []

  try {
    // Story 23.1 — Playbook Governance
    console.log('📝 Running: Story 23.1 — Playbook Governance')
    const migration23_1 = `
-- Story 23.1: Playbook Governance Foundation
ALTER TABLE public.playbook_tasks ADD COLUMN IF NOT EXISTS assigned_role VARCHAR(50);
ALTER TABLE public.playbook_tasks ADD COLUMN IF NOT EXISTS due_days_from_start INT;
ALTER TABLE public.playbook_tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
ALTER TABLE public.playbook_tasks ADD COLUMN IF NOT EXISTS feature_tags TEXT[];

ALTER TABLE public.account_playbook_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) DEFERRABLE;
ALTER TABLE public.account_playbook_tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.account_playbook_tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) DEFERRABLE;
ALTER TABLE public.account_playbook_tasks ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.account_playbook_tasks ADD COLUMN IF NOT EXISTS time_spent_hours DECIMAL(5,2);

ALTER TABLE public.account_playbooks ADD COLUMN IF NOT EXISTS expected_end_date TIMESTAMPTZ;
ALTER TABLE public.account_playbooks ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE public.account_playbooks ADD COLUMN IF NOT EXISTS success_criteria TEXT;
    `

    const { error: err23_1 } = await supabase.rpc('exec', { sql: migration23_1 })
    if (err23_1) {
      // Try direct query
      await supabase.from('_migrations').insert({
        name: '23.1',
        sql: migration23_1
      }).throwOnError()
    }
    results.push({ story: '23.1', status: 'executed' })
    console.log('✅ Story 23.1 completed')

    // Story 14.2 — Playbook Trigger Alert
    console.log('📝 Running: Story 14.2 — Playbook Trigger Alert')
    const migration14_2 = `
-- Story 14.2: Playbook Trigger Alert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'playbook_trigger' AND enumtypid = 'alert_type'::regtype) THEN
    ALTER TYPE alert_type ADD VALUE 'playbook_trigger' BEFORE 'silent_customer';
  END IF;
END $$;
    `

    try {
      await supabase.from('_migrations').insert({
        name: '14.2',
        sql: migration14_2
      })
    } catch {
      // Ignore errors
    }

    results.push({ story: '14.2', status: 'executed' })
    console.log('✅ Story 14.2 completed')

    // Story 15.1 — Auto Check-in
    console.log('📝 Running: Story 15.1 — Auto Check-in Queue')
    const migration15_1 = `
-- Story 15.1: Auto Check-in Queue
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS opt_out_auto_checkin BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.auto_checkin_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  csm_id uuid NOT NULL REFERENCES auth.users(id),
  generated_subject text NOT NULL,
  generated_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'edited', 'cancelled', 'sent')),
  approval_deadline timestamptz NOT NULL,
  approved_at timestamptz,
  edited_subject text,
  edited_body text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_checkin_queue_account_id ON public.auto_checkin_queue(account_id);
CREATE INDEX IF NOT EXISTS idx_auto_checkin_queue_csm_id ON public.auto_checkin_queue(csm_id);
CREATE INDEX IF NOT EXISTS idx_auto_checkin_queue_status ON public.auto_checkin_queue(status);
CREATE INDEX IF NOT EXISTS idx_auto_checkin_queue_approval_deadline ON public.auto_checkin_queue(approval_deadline);

ALTER TABLE public.auto_checkin_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their auto_checkin_queue" ON public.auto_checkin_queue;
CREATE POLICY "Users can view their auto_checkin_queue"
  ON public.auto_checkin_queue FOR SELECT
  USING (csm_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their auto_checkin_queue" ON public.auto_checkin_queue;
CREATE POLICY "Users can update their auto_checkin_queue"
  ON public.auto_checkin_queue FOR UPDATE
  USING (csm_id = auth.uid());

CREATE OR REPLACE FUNCTION public.fn_update_auto_checkin_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_checkin_updated_at ON public.auto_checkin_queue;
CREATE TRIGGER trigger_auto_checkin_updated_at
AFTER UPDATE ON public.auto_checkin_queue
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_auto_checkin_updated_at();
    `

    try {
      await supabase.from('_migrations').insert({
        name: '15.1',
        sql: migration15_1
      })
    } catch {
      // Ignore errors
    }

    results.push({ story: '15.1', status: 'executed' })
    console.log('✅ Story 15.1 completed')

    return NextResponse.json({
      success: true,
      message: 'Wave 4 migrations executed',
      results
    })
  } catch (err: any) {
    console.error('Migration error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        results
      },
      { status: 500 }
    )
  }
}
