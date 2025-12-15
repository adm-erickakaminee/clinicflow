-- ============================================================================
-- CORRIGIR: Usuários sem Profile Correspondente
-- ============================================================================
-- Este script identifica usuários criados em auth.users que não têm
-- profile correspondente em public.profiles e ajuda a corrigir.
-- ============================================================================

-- Verificar usuários sem profile
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as user_created_at,
  'MISSING PROFILE' as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- Se você quiser criar profiles para usuários que estão faltando,
-- execute a query abaixo com cuidado (substitua os valores conforme necessário):
-- 
-- INSERT INTO public.profiles (id, full_name, role, clinic_id)
-- SELECT 
--   au.id,
--   COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
--   'admin' as role,  -- Ajustar conforme necessário
--   NULL as clinic_id  -- Ajustar clinic_id conforme necessário
-- FROM auth.users au
-- LEFT JOIN public.profiles p ON p.id = au.id
-- WHERE p.id IS NULL;

-- ============================================================================
-- Verificar políticas RLS que podem estar bloqueando
-- ============================================================================

-- Verificar políticas de INSERT em profiles
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Verificar se o usuário atual tem permissão
SELECT 
  auth.uid() as current_user_id,
  p.id as profile_id,
  p.role as profile_role,
  p.clinic_id
FROM public.profiles p
WHERE p.id = auth.uid();

-- ============================================================================
-- Script para criar profile manualmente (ajuste conforme necessário)
-- ============================================================================
-- Substitua os valores abaixo:
--   - USER_ID_HERE: ID do usuário de auth.users
--   - CLINIC_ID_HERE: ID da clínica (ou NULL)
--   - FULL_NAME_HERE: Nome completo do administrador

/*
INSERT INTO public.profiles (id, full_name, role, clinic_id)
VALUES (
  'USER_ID_HERE'::uuid,
  'FULL_NAME_HERE',
  'admin',
  'CLINIC_ID_HERE'::uuid
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  clinic_id = EXCLUDED.clinic_id;
*/
