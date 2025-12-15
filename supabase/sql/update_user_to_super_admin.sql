-- Script para tornar erick.eh799@gmail.com Super Admin
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar colunas se não existirem
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS clinic_id uuid,
ADD COLUMN IF NOT EXISTS professional_id uuid,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Criar ou atualizar o perfil como Super Admin
-- Usando o clinic_id fornecido: 20390a6e-707c-43e2-8fd3-062790cc7a6a
INSERT INTO public.profiles (
  id,
  role,
  is_super_admin,
  full_name,
  clinic_id
)
SELECT 
  u.id,
  'super_admin',
  true,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Erick'),
  '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid
FROM auth.users u
WHERE u.email = 'erick.eh799@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET
  role = 'super_admin',
  is_super_admin = true,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  clinic_id = COALESCE(EXCLUDED.clinic_id, profiles.clinic_id);

-- 3. Verificar se foi criado/atualizado corretamente
SELECT 
  p.id,
  p.full_name,
  u.email,
  p.role,
  p.is_super_admin,
  p.clinic_id
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.email = 'erick.eh799@gmail.com';

