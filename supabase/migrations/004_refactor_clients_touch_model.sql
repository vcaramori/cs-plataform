-- Nova tabela de clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Popula os clientes com base nas contas atuais (para não perder dados)
INSERT INTO public.clients (name, industry, website)
SELECT DISTINCT name, industry, website FROM public.accounts;

-- Associa accounts ao client
ALTER TABLE public.accounts ADD COLUMN client_id UUID REFERENCES public.clients(id);
UPDATE public.accounts a SET client_id = c.id FROM public.clients c WHERE c.name = a.name;

-- Adiciona modelo de touch
ALTER TABLE public.accounts ADD COLUMN touch_model TEXT DEFAULT 'Mid Touch' CHECK (touch_model IN ('High Touch', 'Mid Touch'));
UPDATE public.accounts SET touch_model = 'High Touch' WHERE segment = 'Enterprise';

-- Torna os campos antigos opcionais/desnecessários para quebra de compatibilidade segura
ALTER TABLE public.accounts ALTER COLUMN segment DROP NOT NULL;
ALTER TABLE public.contracts ALTER COLUMN service_type DROP NOT NULL;
ALTER TABLE public.contracts ALTER COLUMN contracted_hours_monthly DROP NOT NULL;
ALTER TABLE public.contracts ALTER COLUMN csm_hour_cost DROP NOT NULL;
ALTER TABLE public.accounts ALTER COLUMN industry DROP NOT NULL;
ALTER TABLE public.accounts ALTER COLUMN website DROP NOT NULL;
