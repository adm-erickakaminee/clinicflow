-- ============================================================
-- VERIFICAR: Usuário atual e seu perfil
-- ============================================================
-- Execute este script para verificar se você está autenticado
-- e qual é o seu role
-- ============================================================

-- 1. Verificar se há usuário autenticado
SELECT 
  auth.uid() as user_id_autenticado,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NENHUM USUÁRIO AUTENTICADO'
    ELSE '✅ Usuário autenticado'
  END as status_auth;

-- 2. Verificar perfil do usuário atual
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.clinic_id,
  CASE 
    WHEN p.role = 'super_admin' THEN '✅ É SUPER ADMIN'
    WHEN p.role IN ('admin', 'clinic_owner') THEN '⚠️ É ADMIN (não super_admin)'
    WHEN p.role IS NULL THEN '❌ ROLE NULO'
    ELSE '⚠️ Role: ' || p.role
  END as status_role
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. Testar se consegue ver organizações
SELECT 
  COUNT(*) as total_organizations,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ CONSEGUE VER ORGANIZAÇÕES'
    ELSE '⚠️ Nenhuma organização encontrada (pode ser RLS ou não há dados)'
  END as status
FROM public.organizations;

-- 4. Listar organizações (se conseguir ver)
SELECT 
  id,
  name,
  phone,
  status,
  created_at
FROM public.organizations
ORDER BY name
LIMIT 10;
