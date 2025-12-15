-- =====================================================
-- 🔓 DESATIVAR RLS - COPIE E COLE NO SUPABASE SQL EDITOR
-- =====================================================

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

-- Verificar status (mostra quais tabelas têm RLS desativado)
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ HABILITADO' 
    ELSE '❌ DESABILITADO' 
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'organizations', 'appointments', 'clients',
    'professionals', 'services', 'financial_transactions',
    'gaby_rules', 'client_retention_data', 'organization_settings',
    'audit_logs', 'blocks', 'time_offs', 'professional_services'
  )
ORDER BY tablename;



