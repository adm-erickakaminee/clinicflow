-- Script SIMPLES para tornar um usuário Super Admin
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- 2. Ver seu ID de usuário atual (copie o ID que aparecer)
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email
SELECT 
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.role,
  p.is_super_admin,
  p.clinic_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'SEU_EMAIL_AQUI';

-- 3. Depois de ver o ID acima, execute este UPDATE usando o ID do perfil
-- Substitua 'PROFILE_ID_AQUI' pelo profile_id que você viu no passo 2
UPDATE public.profiles
SET 
  role = 'super_admin',
  is_super_admin = true
WHERE id = 'PROFILE_ID_AQUI'::uuid;

-- 4. OU atualize diretamente pelo email (mais fácil)
UPDATE public.profiles
SET 
  role = 'super_admin',
  is_super_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'SEU_EMAIL_AQUI'
);

-- 5. Verificar se foi atualizado
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

