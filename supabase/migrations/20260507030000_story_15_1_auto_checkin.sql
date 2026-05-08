-- Wave 4, Story 15.1: Auto Check-in by Silence Detection
-- Automatic check-in scheduling with approval workflow

-- Add opt_out flag to accounts
ALTER TABLE public.accounts ADD COLUMN opt_out_auto_checkin BOOLEAN DEFAULT false;

-- Create auto_checkin_queue table for managing check-in approval workflow
CREATE TABLE public.auto_checkin_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  csm_id uuid NOT NULL REFERENCES auth.users(id),

  -- Generated content
  generated_subject text NOT NULL,
  generated_body text NOT NULL,

  -- Workflow status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'edited', 'cancelled', 'sent')),

  -- Approval deadline (4 hours of business time)
  approval_deadline timestamptz NOT NULL,
  approved_at timestamptz,

  -- If edited before approval, store the changes
  edited_subject text,
  edited_body text,

  -- Sent timestamp
  sent_at timestamptz,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_auto_checkin_queue_account_id ON public.auto_checkin_queue(account_id);
CREATE INDEX idx_auto_checkin_queue_csm_id ON public.auto_checkin_queue(csm_id);
CREATE INDEX idx_auto_checkin_queue_status ON public.auto_checkin_queue(status);
CREATE INDEX idx_auto_checkin_queue_approval_deadline ON public.auto_checkin_queue(approval_deadline);

-- RLS Policies for auto_checkin_queue
ALTER TABLE public.auto_checkin_queue ENABLE ROW LEVEL SECURITY;

-- CSM can see only their own queue items
CREATE POLICY "Users can view their auto_checkin_queue"
  ON public.auto_checkin_queue FOR SELECT
  USING (csm_id = auth.uid());

-- CSM can update their own queue items (approve, edit, cancel)
CREATE POLICY "Users can update their auto_checkin_queue"
  ON public.auto_checkin_queue FOR UPDATE
  USING (csm_id = auth.uid());

-- System (service role) can insert items during cron job
-- This is handled by the cron API route with service role client

-- Trigger to update updated_at timestamp
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
