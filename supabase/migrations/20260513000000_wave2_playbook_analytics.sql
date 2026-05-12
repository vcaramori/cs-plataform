-- Migration for Playbooks Wave 2: Analytics & Task Management

-- 1. Add is_note_required to playbook_tasks
ALTER TABLE public.playbook_tasks ADD COLUMN is_note_required boolean DEFAULT false;

-- 2. Add assigned_to to account_playbook_tasks (ALREADY EXISTS from previous migration)
-- ALTER TABLE public.account_playbook_tasks ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- 3. Add due_date to account_playbooks (Expected completion date for the whole playbook)
ALTER TABLE public.account_playbooks ADD COLUMN due_date timestamptz;

-- 4. Create View or RPC for Template Performance
-- Returns avg completion time and success rate per template
CREATE OR REPLACE VIEW public.playbook_template_performance AS
SELECT 
    t.id AS template_id,
    t.name AS template_name,
    COUNT(p.id) AS total_executions,
    COUNT(p.id) FILTER (WHERE p.status = 'completed') AS completed_executions,
    CASE WHEN COUNT(p.id) > 0 THEN 
        (COUNT(p.id) FILTER (WHERE p.status = 'completed')::numeric / COUNT(p.id)::numeric) * 100 
    ELSE 0 END AS completion_rate,
    AVG(EXTRACT(EPOCH FROM (p.completed_at - p.started_at))/86400)::numeric(10,2) AS avg_completion_days
FROM 
    public.playbook_templates t
LEFT JOIN 
    public.account_playbooks p ON p.template_id = t.id
GROUP BY 
    t.id, t.name;

-- 5. Create View for Planned vs Realized
CREATE OR REPLACE VIEW public.playbook_planned_vs_realized AS
SELECT 
    p.id AS playbook_id,
    t.name AS template_name,
    a.name AS account_name,
    p.started_at,
    p.due_date AS planned_completion_date,
    p.completed_at AS actual_completion_date,
    p.status,
    CASE 
        WHEN p.completed_at IS NOT NULL AND p.due_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (p.completed_at - p.due_date))/86400
        WHEN p.completed_at IS NULL AND p.due_date IS NOT NULL AND p.due_date < now() THEN
            EXTRACT(EPOCH FROM (now() - p.due_date))/86400
        ELSE 0
    END AS delay_days
FROM 
    public.account_playbooks p
JOIN 
    public.playbook_templates t ON p.template_id = t.id
JOIN 
    public.accounts a ON p.account_id = a.id;
