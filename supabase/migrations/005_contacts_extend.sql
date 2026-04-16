-- Estende tabela de contatos com campos para Mapa de Influência completo
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url    TEXT;

-- Adiciona description em contracts (já usado na aplicação, garante existência)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS description  TEXT;
