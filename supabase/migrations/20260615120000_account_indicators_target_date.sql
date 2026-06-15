-- Data-alvo das metas (indicadores) do cliente: quando a meta deve ser atingida.
-- Aditiva e nullable — metas existentes ficam sem data até serem editadas.
ALTER TABLE account_indicators ADD COLUMN IF NOT EXISTS target_date date;
