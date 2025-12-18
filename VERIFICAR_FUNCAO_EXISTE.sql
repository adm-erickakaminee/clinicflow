-- ============================================================================
-- QUERY SIMPLES: Verificar se a função create_organization_during_signup existe
-- ============================================================================
-- Execute esta query no Supabase SQL Editor para verificar se a função foi criada
-- ============================================================================

-- Verificar se a função existe
SELECT 
  proname as nome_funcao,
  pg_get_function_identity_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'create_organization_during_signup';

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Se retornar 1 linha: ✅ Função existe e está configurada
-- - Se retornar 0 linhas: ❌ Função NÃO existe - execute a migration
-- ============================================================================

-- Verificar também se a função tem SECURITY DEFINER (importante!)
SELECT 
  p.proname as nome_funcao,
  p.prosecdef as tem_security_definer,
  pg_get_function_identity_arguments(p.oid) as argumentos
FROM pg_proc p
WHERE p.proname = 'create_organization_during_signup';

-- ============================================================================
-- RESULTADO ESPERADO:
-- - tem_security_definer deve ser 't' (true) ou true
-- - Isso permite que a função bypass RLS
-- ============================================================================

