-- =====================================================
-- 📊  VERIFICAR STATUS DO RLS
-- =====================================================
-- Este script mostra quais tabelas têm RLS habilitado/desabilitado
-- =====================================================

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ HABILITADO' 
    ELSE '❌ DESABILITADO' 
  END as status_rls,
  CASE 
    WHEN rowsecurity THEN 'true' 
    ELSE 'false' 
  END as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 
    'organizations', 
    'appointments', 
    'clients',
    'professionals', 
    'services', 
    'financial_transactions',
    'gaby_rules', 
    'client_retention_data', 
    'organization_settings',
    'audit_logs', 
    'blocks', 
    'time_offs', 
    'professional_services'
  )
ORDER BY tablename;

-- Verificar também quantas políticas existem por tabela
SELECT 
  schemaname,
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 
    'organizations', 
    'appointments', 
    'clients',
    'professionals', 
    'services', 
    'financial_transactions',
    'gaby_rules', 
    'client_retention_data', 
    'organization_settings',
    'audit_logs', 
    'blocks', 
    'time_offs', 
    'professional_services'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;



