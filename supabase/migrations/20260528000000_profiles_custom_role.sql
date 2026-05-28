-- Vincula perfil ao sistema de custom roles configurável
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- Migração de dados: associa usuários existentes ao custom role pelo slug
-- Depende da migration 20260526110000_custom_roles_and_active.sql que seede os roles
UPDATE public.profiles SET custom_role_id = (
  SELECT id FROM public.custom_roles WHERE name = 'CSM Senior' LIMIT 1
)
WHERE role = 'csm_senior' AND custom_role_id IS NULL;

UPDATE public.profiles SET custom_role_id = (
  SELECT id FROM public.custom_roles WHERE name = 'CSM' LIMIT 1
)
WHERE role = 'csm' AND custom_role_id IS NULL;

UPDATE public.profiles SET custom_role_id = (
  SELECT id FROM public.custom_roles WHERE name = 'Administrador' LIMIT 1
)
WHERE role IN ('admin', 'super_admin', 'head_cs') AND custom_role_id IS NULL;
