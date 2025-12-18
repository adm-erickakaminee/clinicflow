-- ============================================================================
-- SCRIPT DE LIMPEZA: Remover todas as versões da função create_organization_during_signup
-- ============================================================================
-- Execute este script ANTES de executar fix_organizations_insert_during_signup.sql
-- Isso resolve o erro: "function name is not unique"
-- ============================================================================

-- Remover todas as versões possíveis da função
DO $$
DECLARE
  r record;
  func_count int := 0;
BEGIN
  -- Contar quantas versões existem
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'create_organization_during_signup'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  RAISE NOTICE 'Encontradas % versão(ões) da função create_organization_during_signup', func_count;
  
  -- Remover todas as versões conhecidas primeiro
  DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb, text, text, uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb, text, text) CASCADE;
  DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb) CASCADE;
  
  -- Remover qualquer outra versão que possa existir
  FOR r IN 
    SELECT 
      p.oid::regprocedure::text as func_signature,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    WHERE p.proname = 'create_organization_during_signup'
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    RAISE NOTICE 'Removendo função: %', r.func_signature;
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.func_signature);
  END LOOP;
  
  RAISE NOTICE '✅ Limpeza concluída! Agora você pode executar fix_organizations_insert_during_signup.sql';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Aviso: %', SQLERRM;
    -- Continuar mesmo se houver erro
END $$;

-- Verificar se todas foram removidas
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Nenhuma função encontrada - Pronto para criar nova versão!'
    ELSE '⚠️ Ainda existem ' || COUNT(*) || ' versão(ões) da função'
  END as status
FROM pg_proc
WHERE proname = 'create_organization_during_signup'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar este script, execute:
-- Clinic/supabase/migrations/fix_organizations_insert_during_signup.sql
-- ============================================================================

