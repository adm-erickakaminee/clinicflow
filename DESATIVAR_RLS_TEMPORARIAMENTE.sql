-- =====================================================
-- ⚠️  DESATIVAR RLS TEMPORARIAMENTE - DESENVOLVIMENTO ⚠️
-- =====================================================
-- Este script desativa RLS em todas as tabelas principais
-- para permitir edição livre durante desenvolvimento.
--
-- ⚠️  ATENÇÃO: NUNCA execute este script em PRODUÇÃO!
-- ⚠️  Use apenas em ambiente de desenvolvimento.
-- ⚠️  Execute REATIVAR_RLS.sql depois de terminar.
-- =====================================================

BEGIN;

-- Desativar RLS nas tabelas principais
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professionals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gaby_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_retention_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_offs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professional_services DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'organizations', 'appointments', 'clients',
    'professionals', 'services', 'financial_transactions',
    'gaby_rules', 'client_retention_data', 'organization_settings',
    'audit_logs', 'blocks', 'time_offs', 'professional_services'
  )
ORDER BY tablename;

COMMIT;

-- =====================================================
-- ✅ RLS DESATIVADO
-- =====================================================
-- Agora você pode editar dados sem restrições.
-- Lembre-se de executar REATIVAR_RLS.sql depois!
-- =====================================================



