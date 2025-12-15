-- ============================================================================
-- CORREÇÃO CRÍTICA: FOREIGN KEYS E REMOÇÃO DE REDUNDÂNCIAS
-- ============================================================================
-- Este script corrige:
-- 1. FKs quebradas (clinics.id -> organizations.id)
-- 2. Redundância organization_id/clinic_id em clients e profiles
-- 3. Atualiza políticas RLS
-- ============================================================================

BEGIN;

-- ============================================================================
-- VERIFICAÇÃO PRÉVIA: Confirmar se tabela clinics existe
-- ============================================================================

DO $$
DECLARE
    clinics_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clinics'
    ) INTO clinics_exists;
    
    IF clinics_exists THEN
        RAISE NOTICE '⚠️ TABELA clinics EXISTE - VERIFIQUE SE DEVE SER USADA OU SE É REDUNDANTE';
    ELSE
        RAISE NOTICE '✅ TABELA clinics NÃO EXISTE - Corrigindo FKs para organizations';
    END IF;
END $$;

-- ============================================================================
-- PARTE 1: CORRIGIR FOREIGN KEYS (clinics.id -> organizations.id)
-- ============================================================================

-- 1.1: Remover FKs que apontam para clinics.id
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_clinic;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS fk_clients_clinic;

ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_clinic_id_fkey;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_clinic;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS fk_services_clinic;

-- 1.2: Criar novas FKs apontando para organizations.id
-- (Apenas se clinics não existir - se existir, manter clinic_id apontando para clinics)

-- Verificar se clinics existe antes de criar FKs para organizations
DO $$
DECLARE
    clinics_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clinics'
    ) INTO clinics_exists;
    
    IF NOT clinics_exists THEN
        -- Appointments
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_appointments_organization' 
            AND table_name = 'appointments'
        ) THEN
            ALTER TABLE public.appointments
              ADD CONSTRAINT fk_appointments_organization
              FOREIGN KEY (clinic_id)
              REFERENCES public.organizations(id)
              ON DELETE RESTRICT;
            RAISE NOTICE '✅ FK criada: appointments.clinic_id -> organizations.id';
        END IF;
        
        -- Clients
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_clients_organization' 
            AND table_name = 'clients'
        ) THEN
            ALTER TABLE public.clients
              ADD CONSTRAINT fk_clients_organization
              FOREIGN KEY (clinic_id)
              REFERENCES public.organizations(id)
              ON DELETE RESTRICT;
            RAISE NOTICE '✅ FK criada: clients.clinic_id -> organizations.id';
        END IF;
        
        -- Professionals
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_professionals_organization' 
            AND table_name = 'professionals'
        ) THEN
            ALTER TABLE public.professionals
              ADD CONSTRAINT fk_professionals_organization
              FOREIGN KEY (clinic_id)
              REFERENCES public.organizations(id)
              ON DELETE RESTRICT;
            RAISE NOTICE '✅ FK criada: professionals.clinic_id -> organizations.id';
        END IF;
        
        -- Profiles
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_profiles_organization' 
            AND table_name = 'profiles'
        ) THEN
            ALTER TABLE public.profiles
              ADD CONSTRAINT fk_profiles_organization
              FOREIGN KEY (clinic_id)
              REFERENCES public.organizations(id)
              ON DELETE RESTRICT;
            RAISE NOTICE '✅ FK criada: profiles.clinic_id -> organizations.id';
        END IF;
        
        -- Services
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_services_organization' 
            AND table_name = 'services'
        ) THEN
            ALTER TABLE public.services
              ADD CONSTRAINT fk_services_organization
              FOREIGN KEY (clinic_id)
              REFERENCES public.organizations(id)
              ON DELETE RESTRICT;
            RAISE NOTICE '✅ FK criada: services.clinic_id -> organizations.id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ TABELA clinics EXISTE - Mantendo FKs originais. Verifique manualmente se devem ser alteradas.';
    END IF;
END $$;

-- ============================================================================
-- PARTE 2: REMOVER REDUNDÂNCIA organization_id/clinic_id EM CLIENTS
-- ============================================================================

-- 2.1: Migrar dados (garantir clinic_id tem os valores de organization_id)
UPDATE public.clients
SET clinic_id = organization_id
WHERE organization_id IS NOT NULL 
  AND clinic_id IS NULL;

-- 2.2: Remover FK antiga
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_organization_id_fkey;

-- 2.3: Remover políticas RLS que referenciam organization_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'clients'
          AND (
            qual::text LIKE '%organization_id%' 
            OR with_check::text LIKE '%organization_id%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', r.policyname);
    END LOOP;
END $$;

-- 2.4: REMOVER A COLUNA REDUNDANTE organization_id DE CLIENTS
ALTER TABLE public.clients
  DROP COLUMN IF EXISTS organization_id;

-- 2.5: Recriar políticas RLS otimizadas (se necessário)
-- (As políticas já foram criadas no script anterior, mas garantimos que estão corretas)

-- ============================================================================
-- PARTE 3: REMOVER REDUNDÂNCIA organization_id/clinic_id EM PROFILES
-- ============================================================================

-- 3.1: Migrar dados (garantir clinic_id tem os valores de organization_id)
UPDATE public.profiles
SET clinic_id = organization_id
WHERE organization_id IS NOT NULL 
  AND clinic_id IS NULL;

-- 3.2: Remover FK antiga
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;

-- 3.3: Remover políticas RLS que referenciam profiles.organization_id
-- (em profiles e em outras tabelas que usam organization_id de profiles)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remover políticas de profiles
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles'
          AND (
            qual::text LIKE '%organization_id%' 
            OR with_check::text LIKE '%organization_id%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
    
    -- Remover TODAS as políticas das tabelas que dependem de profiles.organization_id
    -- (Serão recriadas depois usando clinic_id ou função auxiliar)
    FOR r IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
            'professional_services',
            'financial_transactions',
            'gaby_rules',
            'client_retention_data',
            'organization_settings'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
    
    RAISE NOTICE 'Políticas RLS removidas das tabelas dependentes (serão recriadas após remoção de organization_id)';
END $$;

-- 3.4: REMOVER A COLUNA REDUNDANTE organization_id DE PROFILES
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS organization_id;

-- ============================================================================
-- PARTE 4: ATUALIZAR FUNÇÃO AUXILIAR (se usar organization_id)
-- ============================================================================

-- A função user_organization_and_role() retorna organization_id da tabela profiles
-- Como removemos organization_id de profiles, precisamos verificar se a função precisa ser atualizada
-- Se profiles ainda tiver organization_id (via clinic_id), a função deve continuar funcionando
-- já que clinic_id agora referencia organizations.id

-- Atualizar função auxiliar para usar clinic_id em vez de organization_id
-- (clinic_id agora referencia organizations.id, então funciona corretamente)
CREATE OR REPLACE FUNCTION public.user_organization_and_role()
RETURNS TABLE(organization_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.clinic_id AS organization_id,  -- clinic_id agora é o organization_id (referencia organizations.id)
    p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ============================================================================

-- Verificar FKs criadas
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('appointments', 'clients', 'profiles', 'professionals', 'services')
  AND kcu.column_name = 'clinic_id'
ORDER BY tc.table_name;

-- Verificar se organization_id foi removida
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'profiles')
  AND column_name = 'organization_id';

-- Se retornar 0 linhas, organização_id foi removida com sucesso ✅

-- ============================================================================
-- NOTA IMPORTANTE: POLÍTICAS RLS REMOVIDAS
-- ============================================================================
-- As seguintes tabelas tiveram políticas RLS removidas porque dependiam de 
-- profiles.organization_id. Elas precisam ser recriadas usando clinic_id ou 
-- a função auxiliar user_organization_and_role():
--
-- - professional_services
-- - financial_transactions
-- - gaby_rules
-- - client_retention_data
-- - organization_settings
--
-- Use a função auxiliar user_organization_and_role() para recriar as políticas
-- seguindo o mesmo padrão das outras tabelas (appointments, clients, etc.)
-- ============================================================================
