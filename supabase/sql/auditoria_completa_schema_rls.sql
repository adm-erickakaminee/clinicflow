-- ============================================================================
-- COMANDO DE AUDITORIA E BLINDAGEM PROATIVA
-- ============================================================================
-- Script SQL para extrair schema completo e políticas RLS para diagnóstico
-- Execute todas as consultas abaixo e cole os resultados para análise
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA: TABELAS CRÍTICAS (PROFILES, ORGANIZATIONS, PROFESSIONALS, SERVICES, APPOINTMENTS, CLIENTS)
-- ============================================================================

-- 1.1: Colunas das tabelas críticas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY table_name, ordinal_position;

-- 1.2: Constraints (Primary Keys, Foreign Keys, Unique, Check)
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name 
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name 
  AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_constraint c 
  ON c.conname = tc.constraint_name 
  AND c.conrelid = (SELECT oid FROM pg_class WHERE relname = tc.table_name)
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 1.3: Índices das tabelas críticas
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tablename, indexname;

-- ============================================================================
-- 2. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- 2.1: Status RLS (habilitado/desabilitado) por tabela
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tablename;

-- 2.2: Todas as políticas RLS das tabelas críticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command_type,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tablename, policyname;

-- 2.3: Políticas RLS detalhadas (com definição completa)
SELECT 
  n.nspname AS schemaname,
  c.relname AS tablename,
  p.polname AS policyname,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END AS cmd,
  pg_get_expr(p.polqual, p.polrelid) AS using_clause,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_clause
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY c.relname, p.polname;

-- ============================================================================
-- 3. FUNÇÕES AUXILIARES (FUNÇÕES USADAS EM RLS)
-- ============================================================================

-- 3.1: Funções relacionadas a autenticação/organização
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'auth')
  AND (
    p.proname LIKE '%organization%'
    OR p.proname LIKE '%user%'
    OR p.proname LIKE '%role%'
    OR p.proname LIKE '%clinic%'
  )
ORDER BY n.nspname, p.proname;

-- ============================================================================
-- 4. ANÁLISE DE INTEGRIDADE REFERENCIAL
-- ============================================================================

-- 4.1: Foreign Keys e suas dependências
SELECT
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.update_rule,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 5. VALIDAÇÕES E CONSTRAINTS CHECK
-- ============================================================================

-- 5.1: Constraints CHECK (validações de negócio)
SELECT 
  tc.table_name,
  tc.constraint_name,
  cc.check_clause,
  pg_get_constraintdef(c.oid) AS full_definition
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
JOIN pg_constraint c 
  ON c.conname = tc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- 6. DADOS DE EXEMPLO (AMOSTRAS PARA VALIDAÇÃO)
-- ============================================================================

-- 6.1: Contagem de registros por tabela
SELECT 
  'profiles' AS table_name, COUNT(*) AS record_count FROM public.profiles
UNION ALL
SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL
SELECT 'professionals', COUNT(*) FROM public.professionals
UNION ALL
SELECT 'services', COUNT(*) FROM public.services
UNION ALL
SELECT 'appointments', COUNT(*) FROM public.appointments
UNION ALL
SELECT 'clients', COUNT(*) FROM public.clients
ORDER BY table_name;

-- 6.2: Amostra de dados (primeiros 3 registros de cada tabela crítica)
-- (Execute individualmente para cada tabela ou ajuste conforme necessário)

-- Profiles sample
SELECT 'profiles_sample' AS sample_type, json_agg(row_to_json(t)) AS sample_data
FROM (SELECT * FROM public.profiles LIMIT 3) t;

-- Organizations sample
SELECT 'organizations_sample' AS sample_type, json_agg(row_to_json(t)) AS sample_data
FROM (SELECT * FROM public.organizations LIMIT 3) t;

-- Professionals sample
SELECT 'professionals_sample' AS sample_type, json_agg(row_to_json(t)) AS sample_data
FROM (SELECT * FROM public.professionals LIMIT 3) t;

-- Services sample
SELECT 'services_sample' AS sample_type, json_agg(row_to_json(t)) AS sample_data
FROM (SELECT * FROM public.services LIMIT 3) t;

-- Appointments sample
SELECT 'appointments_sample' AS sample_type, json_agg(row_to_json(t)) AS sample_data
FROM (SELECT * FROM public.appointments LIMIT 3) t;

-- Clients sample
SELECT 'clients_sample' AS sample_type, json_agg(row_to_json(t)) AS sample_data
FROM (SELECT * FROM public.clients LIMIT 3) t;

-- ============================================================================
-- 7. ANÁLISE DE CAMPOS NULL/OBRIGATÓRIOS
-- ============================================================================

-- 7.1: Campos NOT NULL por tabela (campos obrigatórios)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_nullable = 'NO'
  AND table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY table_name, column_name;

-- 7.2: Campos opcionais (NULL permitido) que podem ser críticos
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_nullable = 'YES'
  AND table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
  AND (
    column_name LIKE '%_id%'
    OR column_name LIKE '%clinic%'
    OR column_name LIKE '%organization%'
    OR column_name LIKE '%professional%'
  )
ORDER BY table_name, column_name;

-- ============================================================================
-- 8. DETECÇÃO DE PROBLEMAS POTENCIAIS
-- ============================================================================

-- 8.1: Tabelas sem RLS habilitado (CRÍTICO!)
SELECT 
  tablename,
  rowsecurity AS rls_enabled,
  '⚠️ RLS DESABILITADO - RISCO DE SEGURANÇA!' AS warning
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
  AND rowsecurity = false;

-- 8.2: Tabelas sem políticas RLS (mesmo com RLS habilitado)
SELECT 
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  CASE 
    WHEN t.rowsecurity = true AND COUNT(p.policyname) = 0 THEN '⚠️ RLS HABILITADO MAS SEM POLÍTICAS - ACESSO NEGADO PARA TODOS!'
    ELSE 'OK'
  END AS status
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public' 
  AND t.tablename IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 8.3: Políticas RLS que podem estar usando subqueries ineficientes
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%SELECT%FROM%profiles%' THEN '⚠️ SUBQUERY DETECTADA - PODE SER OTIMIZADA'
    WHEN qual::text LIKE '%EXISTS (SELECT%' THEN '⚠️ EXISTS COM SUBQUERY - VERIFICAR PERFORMANCE'
    ELSE 'OK'
  END AS performance_warning
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
  AND qual::text LIKE '%SELECT%'
ORDER BY tablename, policyname;

-- ============================================================================
-- FIM DO SCRIPT DE AUDITORIA
-- ============================================================================
-- Cole os resultados de TODAS as consultas acima para análise completa
-- ============================================================================
