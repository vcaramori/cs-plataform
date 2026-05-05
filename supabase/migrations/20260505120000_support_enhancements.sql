-- F1-07: Urgency Scoring Columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level') THEN
        CREATE TYPE urgency_level AS ENUM ('high', 'medium', 'low');
    END IF;
END $$;

ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS urgency_score urgency_level DEFAULT NULL,
ADD COLUMN IF NOT EXISTS urgency_scored_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS urgency_reasoning jsonb DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_urgency_score ON public.support_tickets(urgency_score);

-- F1-08: Auto-Reopen on Customer Reply
CREATE OR REPLACE FUNCTION public.handle_auto_reopen_on_reply()
RETURNS TRIGGER AS $$
DECLARE
    v_ticket_status text;
BEGIN
    -- Get current ticket status
    SELECT status INTO v_ticket_status
    FROM public.support_tickets
    WHERE id = NEW.ticket_id;

    -- If ticket is closed and it's a reply (not a note)
    -- We assume any reply arriving on a closed ticket that isn't from a known CSM author_id is a customer re-opening it.
    -- Or more simply, any reply to a closed ticket reopens it in this business logic.
    IF v_ticket_status = 'closed' AND NEW.type = 'reply' THEN
        UPDATE public.support_tickets 
        SET status = 'open',
            closed_at = NULL
        WHERE id = NEW.ticket_id;

        -- Log event in ticket_events
        INSERT INTO public.ticket_events (ticket_id, event_type, payload, created_at)
        VALUES (
            NEW.ticket_id,
            'auto_reopened',
            jsonb_build_object(
                'reason', 'customer_reply',
                'message_id', NEW.id,
                'author_email', NEW.author_email
            ),
            now()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_reopen_on_reply ON public.support_ticket_messages;
CREATE TRIGGER trg_auto_reopen_on_reply
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_auto_reopen_on_reply();
