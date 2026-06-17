-- Bucket público para re-hospedar anexos/imagens dos chamados do HelpDesk (durabilidade:
-- não depender do CDN externo cdn.livechat-files.com). Upload via service role (sync);
-- leitura pública (URLs renderizam direto na tela de detalhe).
INSERT INTO storage.buckets (id, name, public)
VALUES ('helpdesk-attachments', 'helpdesk-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read helpdesk-attachments" ON storage.objects;
CREATE POLICY "Public read helpdesk-attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'helpdesk-attachments');
