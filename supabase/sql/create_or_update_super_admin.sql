-- Script COMPLETO para garantir que você seja Super Admin
-- Execute este SQL no Supabase SQL Editor
-- ⚠️ SUBSTITUA 'SEU_EMAIL_AQUI' pelo seu email de login!

-- 1. Adicionar colunas se não existirem
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS clinic_id uuid,
ADD COLUMN IF NOT EXISTS professional_id uuid,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Verificar se seu perfil existe
SELECT 
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.role,
  p.is_super_admin,
  p.clinic_id,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'SEU_EMAIL_AQUI';

-- 3. Criar ou atualizar o perfil como Super Admin
-- ⚠️ SUBSTITUA 'SEU_EMAIL_AQUI' pelo seu email e 'CLINIC_ID_AQUI' pelo ID da clínica!
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
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'CLINIC_ID_AQUI'::uuid -- ID da clínica (pode ser qualquer UUID válido)
FROM auth.users u
WHERE u.email = 'SEU_EMAIL_AQUI'
ON CONFLICT (id) 
DO UPDATE SET
  role = 'super_admin',
  is_super_admin = true,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  clinic_id = COALESCE(EXCLUDED.clinic_id, profiles.clinic_id);

-- 4. Verificar se foi atualizado/criado corretamente
SELECT 
  p.id,
  p.full_name,
  u.email,
  p.role,
  p.is_super_admin,
  p.clinic_id
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.email = 'SEU_EMAIL_AQUI';

