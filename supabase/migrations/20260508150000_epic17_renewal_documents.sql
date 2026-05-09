-- Epic 17, Story 17.2: Renewal Brief PDF — Track generated PDFs

CREATE TABLE IF NOT EXISTS public.renewal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  csm_id uuid NOT NULL REFERENCES auth.users(id),
  pdf_url text NOT NULL,
  document_type text DEFAULT 'renewal_brief' CHECK (document_type IN ('renewal_brief', 'custom')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_documents_account_id ON public.renewal_documents(account_id);
CREATE INDEX idx_renewal_documents_csm_id ON public.renewal_documents(csm_id);
CREATE INDEX idx_renewal_documents_generated_at ON public.renewal_documents(generated_at);

ALTER TABLE public.renewal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view renewal documents for their accounts"
  ON public.renewal_documents FOR SELECT
  USING (account_id IN (
    SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
  ));

CREATE POLICY "CSM can insert renewal documents for their accounts"
  ON public.renewal_documents FOR INSERT
  WITH CHECK (account_id IN (
    SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
  ) AND csm_id = auth.uid());

-- Update function
CREATE OR REPLACE FUNCTION public.fn_update_renewal_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_renewal_documents_updated_at ON public.renewal_documents;
CREATE TRIGGER trigger_update_renewal_documents_updated_at
  BEFORE UPDATE ON public.renewal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_renewal_documents_updated_at();
