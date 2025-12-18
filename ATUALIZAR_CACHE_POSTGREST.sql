-- ============================================================================
-- ATUALIZAR CACHE DO POSTGREST E VERIFICAR PERMISSÕES
-- ============================================================================
-- Execute este script se a função existe mas o PostgREST retorna 404
-- ============================================================================

-- 1. Verificar se a função existe e suas permissões
SELECT 
  p.proname as nome_funcao,
  p.prosecdef as tem_security_definer,
  pg_get_function_identity_arguments(p.oid) as argumentos,
  p.proacl as permissoes
FROM pg_proc p
WHERE p.proname = 'create_organization_during_signup';

-- 2. Garantir permissões explícitas (caso não existam)
GRANT EXECUTE ON FUNCTION public.create_organization_during_signup(
  text, text, text, jsonb, text, text, uuid
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_organization_during_signup(
  text, text, text, jsonb, text, text, uuid
) TO anon;

-- 3. Verificar se as permissões foram aplicadas
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅ authenticated'
    ELSE '❌ authenticated'
  END as perm_authenticated,
  CASE 
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN '✅ anon'
    ELSE '❌ anon'
  END as perm_anon
FROM pg_proc p
WHERE p.proname = 'create_organization_during_signup';

-- 4. NOTA: O PostgREST atualiza seu cache automaticamente
-- Se ainda não funcionar, pode ser necessário:
-- - Aguardar alguns segundos (cache pode levar até 1 minuto)
-- - Reiniciar o projeto no Supabase Dashboard (Settings → Restart)

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar, aguarde 10-30 segundos e teste o cadastro novamente
-- ============================================================================

