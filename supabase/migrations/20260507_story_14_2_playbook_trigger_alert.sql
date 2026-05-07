-- Wave 4, Story 14.2: Playbook Trigger Alert
-- Add new alert type for when health score drops below 50

ALTER TYPE alert_type ADD VALUE 'playbook_trigger' BEFORE 'silent_customer';
