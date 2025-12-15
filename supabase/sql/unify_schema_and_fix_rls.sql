-- ============================================================================
-- SCRIPT 1: UNIFICAÇÃO DE SCHEMA E DESBLOQUEIO DE LOGIN
-- ============================================================================
-- Execute este script PRIMEIRO no Supabase SQL Editor
-- Este script:
-- 1. Desabilita temporariamente o RLS na tabela profiles para quebrar recursão
-- 2. Renomeia colunas nas tabelas appointments e professionals para nomes unificados
-- ============================================================================

-- ============================================================================
-- A. DESBLOQUEIO DE LOGIN (RLS Profiles)
-- ============================================================================
-- Desabilitar RLS temporariamente para quebrar recursão infinita
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- B. UNIFICAÇÃO DA TABELA appointments
-- ============================================================================
-- Renomear colunas para nomes unificados (snake_case em inglês)
-- Verificar se as colunas existem antes de renomear para evitar erros

DO $$
BEGIN
  -- Renomear "eu ia" para professional_id (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'eu ia'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "eu ia" TO professional_id;
    RAISE NOTICE 'Coluna "eu ia" renomeada para professional_id';
  END IF;

  -- Renomear "id_da_organização" para organization_id (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_da_organização'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_da_organização" TO organization_id;
    RAISE NOTICE 'Coluna "id_da_organização" renomeada para organization_id';
  END IF;

  -- Renomear "id_da_clínica" para clinic_id (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_da_clínica'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_da_clínica" TO clinic_id;
    RAISE NOTICE 'Coluna "id_da_clínica" renomeada para clinic_id';
  END IF;

  -- Renomear "hora_de_início" para start_time (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'hora_de_início'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "hora_de_início" TO start_time;
    RAISE NOTICE 'Coluna "hora_de_início" renomeada para start_time';
  END IF;

  -- Renomear "hora_final" para end_time (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'hora_final'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "hora_final" TO end_time;
    RAISE NOTICE 'Coluna "hora_final" renomeada para end_time';
  END IF;
END $$;

-- ============================================================================
-- C. UNIFICAÇÃO DA TABELA professionals
-- ============================================================================
-- Renomear colunas para nomes unificados (snake_case em inglês)

DO $$
BEGIN
  -- Renomear "taxa_de_comissão" para commission_rate (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professionals' 
    AND column_name = 'taxa_de_comissão'
  ) THEN
    ALTER TABLE public.professionals RENAME COLUMN "taxa_de_comissão" TO commission_rate;
    RAISE NOTICE 'Coluna "taxa_de_comissão" renomeada para commission_rate';
  END IF;

  -- Renomear "cargo" para role (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professionals' 
    AND column_name = 'cargo'
  ) THEN
    ALTER TABLE public.professionals RENAME COLUMN "cargo" TO role;
    RAISE NOTICE 'Coluna "cargo" renomeada para role';
  END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
-- Verificar colunas das tabelas após renomeação

SELECT 
  'appointments - Colunas:' as info,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'appointments'
UNION ALL
SELECT 
  'professionals - Colunas:' as info,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'professionals';

-- ============================================================================
-- FIM DO SCRIPT 1
-- ============================================================================
-- Após executar este script, teste o login.
-- Se o login funcionar, execute o SCRIPT 2 (restore_rls_policies.sql)
-- ============================================================================
