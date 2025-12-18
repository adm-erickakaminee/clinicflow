-- ============================================================================
-- DIAGNÓSTICO: Verificar se função RPC e políticas RLS estão corretas
-- ============================================================================
-- Execute este script no Supabase SQL Editor para diagnosticar o problema
-- ============================================================================

-- 1. Verificar se a função existe
SELECT 
  'Função RPC' as tipo,
  proname as nome,
  pg_get_function_identity_arguments(oid) as argumentos,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER ✅'
    ELSE 'SECURITY INVOKER ❌'
  END as seguranca
FROM pg_proc
WHERE proname = 'create_organization_during_signup';

-- 2. Verificar políticas RLS na tabela organizations
SELECT 
  'Política RLS' as tipo,
  policyname as nome,
  cmd as comando,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE 'Sem USING'
  END as condicao_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text
    ELSE 'Sem WITH CHECK'
  END as condicao_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY policyname;

-- 3. Verificar se RLS está habilitado
SELECT 
  'RLS Status' as tipo,
  tablename as tabela,
  CASE 
    WHEN rowsecurity THEN 'Habilitado ✅'
    ELSE 'Desabilitado ❌'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- 4. Verificar permissões da função
SELECT 
  'Permissões' as tipo,
  p.proname as funcao,
  r.rolname as role,
  CASE 
    WHEN has_function_privilege(r.rolname, p.oid, 'EXECUTE') THEN 'EXECUTE ✅'
    ELSE 'SEM EXECUTE ❌'
  END as permissao
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'create_organization_during_signup'
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY r.rolname;

-- 5. Testar a função (substitua os valores pelos seus dados de teste)
-- DESCOMENTE E AJUSTE OS VALORES PARA TESTAR:
/*
SELECT public.create_organization_during_signup(
  p_name := 'Teste Clínica',
  p_email := 'teste@exemplo.com',
  p_phone := '11999999999',
  p_address := '{"postalCode":"01310100","address":"Av Paulista","addressNumber":"1000","complement":"","province":"Bela Vista","city":"São Paulo","state":"SP"}'::jsonb,
  p_cnpj := NULL,
  p_status := 'pending_setup'
) as organizacao_id;
*/

-- ============================================================================
-- RESULTADOS ESPERADOS:
-- ============================================================================
-- 1. Função deve existir e ter SECURITY DEFINER ✅
-- 2. Deve haver pelo menos 2 políticas: INSERT e SELECT para signup
-- 3. RLS deve estar habilitado ✅
-- 4. Role 'authenticated' deve ter permissão EXECUTE ✅
-- ============================================================================

