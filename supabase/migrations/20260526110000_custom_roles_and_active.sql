-- Custom Roles Table and profiles active field
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed some dynamic custom roles
INSERT INTO public.custom_roles (name, description) VALUES
('Administrador', 'Acesso completo ao sistema e configurações'),
('CSM Senior', 'Gerenciamento de contas críticas e relatórios'),
('CSM', 'Atendimento às contas e gerenciamento de carteira'),
('Colaborador', 'Acesso operacional a chamados e NPS'),
('Externo', 'Acesso limitado para consulta de dados')
ON CONFLICT (name) DO NOTHING;

-- Add active field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Enable RLS and setup policies
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for custom_roles" ON public.custom_roles;
CREATE POLICY "Allow read for custom_roles" ON public.custom_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users on custom_roles" ON public.custom_roles;
CREATE POLICY "Allow all for authenticated users on custom_roles" ON public.custom_roles FOR ALL USING (true);
