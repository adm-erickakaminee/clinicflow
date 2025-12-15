-- ============================================================
-- TESTE: Verificar se super_admin consegue ver organizações
-- ============================================================
-- Execute este script DEPOIS de executar EXECUTAR_ESTE_SQL.sql
-- ============================================================

-- 1. Verificar usuário atual e seu role
SELECT 
  auth.uid() as user_id,
  p.role,
  p.full_name,
  p.clinic_id
FROM public.profiles p
WHERE p.id = auth.uid();

-- 2. Tentar contar organizações (deve funcionar se for super_admin)
SELECT COUNT(*) as total_organizations
FROM public.organizations;

-- 3. Listar todas as organizações (deve mostrar todas se for super_admin)
SELECT 
  id,
  name,
  phone,
  status,
  created_at
FROM public.organizations
ORDER BY name;

-- 4. Verificar políticas RLS ativas
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
ORDER BY cmd, policyname;
