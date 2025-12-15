-- ============================================================================
-- COMANDO MESTRE: OTIMIZAÇÃO E BLINDAGEM RLS FINAL
-- ============================================================================
-- Este script:
-- 1. Remove organization_id redundante da tabela services
-- 2. Remove políticas RLS ineficientes e duplicadas
-- 3. Cria políticas otimizadas usando user_organization_and_role()
-- ============================================================================

BEGIN;

-- ============================================================================
-- A. LIMPEZA DE COLUNAS E DADOS (ORGANIZATION_ID EM SERVICES)
-- ============================================================================

-- Passo A.1: Migrar dados (garantir clinic_id tem os valores de organization_id)
UPDATE public.services
SET clinic_id = organization_id
WHERE organization_id IS NOT NULL 
  AND clinic_id IS NULL;

-- Passo A.2: Remover TODAS as políticas RLS que referenciam services.organization_id
-- (Precisa ser feito ANTES de remover a coluna)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'services'
          AND (
            qual::text LIKE '%organization_id%' 
            OR with_check::text LIKE '%organization_id%'
            OR qual::text LIKE '%SELECT profiles.clinic_id FROM profiles%'
            OR with_check::text LIKE '%SELECT profiles.clinic_id FROM profiles%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.services', r.policyname);
    END LOOP;
END $$;

-- Remover TODAS as políticas de services para garantir limpeza completa
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'services'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.services', r.policyname);
    END LOOP;
END $$;

-- Passo A.3: Remover constraints que dependem de organization_id
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_organization_id_fkey;

-- Passo A.4: REMOVER A COLUNA REDUNDANTE organization_id DE SERVICES
ALTER TABLE public.services
  DROP COLUMN IF EXISTS organization_id;

-- ✅ A COLUNA clinic_id AGORA É O ÚNICO IDENTIFICADOR EM SERVICES

-- Passo A.5: Criar índice para otimizar queries RLS
CREATE INDEX IF NOT EXISTS idx_services_clinic_id 
  ON public.services(clinic_id) 
  WHERE clinic_id IS NOT NULL;

-- ============================================================================
-- B. LIMPEZA DE POLÍTICAS RLS INEFICIENTES
-- ============================================================================

-- B.1: Remover políticas ineficientes de PROFESSIONALS (com subqueries lentas)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'professionals'
          AND (
            qual::text LIKE '%SELECT profiles.clinic_id FROM profiles%'
            OR with_check::text LIKE '%SELECT profiles.clinic_id FROM profiles%'
            OR qual::text LIKE '%EXISTS (SELECT 1 FROM public.profiles p%'
            OR with_check::text LIKE '%EXISTS (SELECT 1 FROM public.profiles p%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.professionals', r.policyname);
    END LOOP;
END $$;

-- Remover TODAS as políticas de professionals para garantir limpeza completa
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'professionals'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.professionals', r.policyname);
    END LOOP;
END $$;

-- B.2: Remover política vulnerável de debug em PROFILES
DROP POLICY IF EXISTS "Allow all authenticated users to read any profile (TEMPORARY FI" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to read any profile (TEMPORARY FIX)" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to read any profile" ON public.profiles;

-- Remover outras políticas de debug/vulneráveis em profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles'
          AND (
            policyname ILIKE '%TEMPORARY%'
            OR policyname ILIKE '%DEBUG%'
            OR policyname ILIKE '%ALL%READ%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- C. CRIAÇÃO DAS POLÍTICAS OTIMIZADAS E UNIFICADAS
-- ============================================================================

-- C.1: POLÍTICAS PARA PROFESSIONALS (usando função auxiliar otimizada)
CREATE POLICY "Allow org members select professionals"
  ON public.professionals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = professionals.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members insert professionals"
  ON public.professionals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = professionals.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members update professionals"
  ON public.professionals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = professionals.clinic_id
        OR uoar.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = professionals.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members delete professionals"
  ON public.professionals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = professionals.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

-- C.2: POLÍTICAS PARA SERVICES (usando APENAS clinic_id)
CREATE POLICY "Allow org members select services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = services.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members insert services"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = services.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members update services"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = services.clinic_id
        OR uoar.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = services.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members delete services"
  ON public.services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = services.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO (OPCIONAL - DESCOMENTE PARA EXECUTAR)
-- ============================================================================

-- Verificar políticas RLS criadas
-- SELECT 
--   tablename,
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' 
--   AND tablename IN ('professionals', 'services')
-- ORDER BY tablename, policyname;

-- Verificar se organization_id foi removida de services
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'services'
-- ORDER BY ordinal_position;

-- Verificar índices criados
-- SELECT 
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' 
--   AND tablename = 'services'
-- ORDER BY indexname;
