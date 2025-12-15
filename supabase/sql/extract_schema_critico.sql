-- ============================================================================
-- EXTRAÇÃO DE SCHEMA CRÍTICO - DIAGNÓSTICO DE LÓGICA DE NEGÓCIO
-- ============================================================================
-- Execute estas consultas e cole os resultados para análise de arquitetura
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA: COLUNAS DAS TABELAS CRÍTICAS
-- ============================================================================

-- 1.1: Schema completo das tabelas críticas
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

-- ============================================================================
-- 2. CONSTRAINTS (PRIMARY KEYS, FOREIGN KEYS, UNIQUE, CHECK)
-- ============================================================================

-- 2.1: Todas as constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name 
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name 
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 2.2: Foreign Keys detalhadas (integridade referencial)
SELECT
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.update_rule,
  rc.delete_rule
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
-- 3. CAMPOS OBRIGATÓRIOS (NOT NULL)
-- ============================================================================

-- 3.1: Campos NOT NULL por tabela
SELECT 
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_nullable = 'NO'
  AND table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY table_name, column_name;

-- ============================================================================
-- 4. CONSTRAINTS CHECK (VALIDAÇÕES DE NEGÓCIO)
-- ============================================================================

-- 4.1: Constraints CHECK
SELECT 
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- 5. ÍNDICES (PERFORMANCE)
-- ============================================================================

-- 5.1: Índices das tabelas críticas
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'organizations', 'professionals', 'services', 'appointments', 'clients')
ORDER BY tablename, indexname;

-- ============================================================================
-- 6. RESUMO POR TABELA
-- ============================================================================

-- 6.1: Estatísticas básicas
SELECT 
  'profiles' AS table_name, 
  COUNT(*) AS total_columns,
  COUNT(*) FILTER (WHERE is_nullable = 'NO') AS required_columns,
  COUNT(*) FILTER (WHERE column_name LIKE '%_id') AS id_columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'

UNION ALL

SELECT 
  'organizations', 
  COUNT(*),
  COUNT(*) FILTER (WHERE is_nullable = 'NO'),
  COUNT(*) FILTER (WHERE column_name LIKE '%_id')
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'organizations'

UNION ALL

SELECT 
  'professionals', 
  COUNT(*),
  COUNT(*) FILTER (WHERE is_nullable = 'NO'),
  COUNT(*) FILTER (WHERE column_name LIKE '%_id')
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'professionals'

UNION ALL

SELECT 
  'services', 
  COUNT(*),
  COUNT(*) FILTER (WHERE is_nullable = 'NO'),
  COUNT(*) FILTER (WHERE column_name LIKE '%_id')
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'services'

UNION ALL

SELECT 
  'appointments', 
  COUNT(*),
  COUNT(*) FILTER (WHERE is_nullable = 'NO'),
  COUNT(*) FILTER (WHERE column_name LIKE '%_id')
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'appointments'

UNION ALL

SELECT 
  'clients', 
  COUNT(*),
  COUNT(*) FILTER (WHERE is_nullable = 'NO'),
  COUNT(*) FILTER (WHERE column_name LIKE '%_id')
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'clients'

ORDER BY table_name;
