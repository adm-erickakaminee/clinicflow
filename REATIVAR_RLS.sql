-- =====================================================
-- ✅  REATIVAR RLS - RESTAURAR SEGURANÇA
-- =====================================================
-- Este script reativa RLS em todas as tabelas principais.
-- Execute este script depois de terminar suas edições.
-- =====================================================

BEGIN;

-- Reativar RLS nas tabelas principais
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gaby_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_retention_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professional_services ENABLE ROW LEVEL SECURITY;

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
-- ✅ RLS REATIVADO
-- =====================================================
-- As políticas de segurança foram restauradas.
-- =====================================================



