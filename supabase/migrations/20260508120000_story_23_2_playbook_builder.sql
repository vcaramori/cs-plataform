-- Adiciona a coluna ui_flow_json na tabela playbook_templates
ALTER TABLE playbook_templates 
ADD COLUMN IF NOT EXISTS ui_flow_json JSONB DEFAULT '{}'::JSONB;

-- Comentário para documentação
COMMENT ON COLUMN playbook_templates.ui_flow_json IS 'JSON do fluxo visual do Playbook Builder (ReactFlow nodes e edges)';
