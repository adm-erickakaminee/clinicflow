-- ============================================================================
-- COMANDO MESTRE: CORREÇÃO ARQUITETÔNICA PREVENTIVA
-- ============================================================================
-- Execute este script NO BANCO DE DADOS Supabase para prevenir as 3 falhas críticas
-- 
-- OBJETIVO:
-- 1. Remover redundância de colunas (organization_id vs clinic_id)
-- 2. Otimizar políticas RLS com função auxiliar
-- 3. Garantir integridade referencial de professional_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- CORREÇÃO #1: REMOVER organization_id E MANTER APENAS clinic_id
-- ============================================================================

-- Passo 1.1: Migrar dados (garantir clinic_id tem os valores de organization_id)
UPDATE public.appointments
SET clinic_id = organization_id
WHERE organization_id IS NOT NULL 
  AND clinic_id IS NULL;

-- Passo 1.2: Remover TODAS as políticas RLS que referenciam organization_id
-- (Precisa ser feito ANTES de remover a coluna)
DROP POLICY IF EXISTS "Allow org members select appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow org members insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow org members update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow org members delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Select appointments by clinic" ON public.appointments;
DROP POLICY IF EXISTS "Insert appointments by clinic" ON public.appointments;
DROP POLICY IF EXISTS "Update appointments by clinic" ON public.appointments;
DROP POLICY IF EXISTS "Delete appointments by clinic" ON public.appointments;

-- Remover qualquer outra política que possa referenciar organization_id OU auth.user_organization_and_role
-- (Busca dinâmica para garantir que todas sejam removidas)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'appointments'
          AND (
            qual::text LIKE '%organization_id%' 
            OR with_check::text LIKE '%organization_id%'
            OR qual::text LIKE '%auth.user_organization_and_role%'
            OR with_check::text LIKE '%auth.user_organization_and_role%'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', r.policyname);
    END LOOP;
END $$;

-- REMOVER TODAS AS POLÍTICAS RESTANTES (para garantir limpeza completa)
-- Isso garante que não há políticas antigas quebradas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'appointments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', r.policyname);
    END LOOP;
END $$;

-- Passo 1.3: Remover constraints que dependem de organization_id
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_organization_id_fkey;

-- Passo 1.4: REMOVER A COLUNA REDUNDANTE organization_id
ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS organization_id;

-- ✅ A COLUNA clinic_id AGORA É O ÚNICO IDENTIFICADOR DO TENANT/ORGANIZAÇÃO

-- Passo 1.5: Criar índice para otimizar queries RLS
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
  ON public.appointments(clinic_id) 
  WHERE clinic_id IS NOT NULL;

-- ============================================================================
-- CORREÇÃO #2: CRIAR FUNÇÃO AUXILIAR PARA RLS (OTIMIZAÇÃO)
-- ============================================================================

-- Função auxiliar para verificar role e organization_id de uma vez
-- NOTA: Criada no schema public (não podemos criar no schema auth)
CREATE OR REPLACE FUNCTION public.user_organization_and_role()
RETURNS TABLE(organization_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.organization_id,
    p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Adicionar índice para otimizar a busca por auth.uid()
CREATE INDEX IF NOT EXISTS idx_profiles_auth_uid 
  ON public.profiles(id) 
  WHERE id IS NOT NULL;

-- ============================================================================
-- CORREÇÃO #3: GARANTIR INTEGRIDADE REFERENCIAL DE professional_id
-- ============================================================================

-- Passo 3.1: Remover constraint antiga se existir
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_professional_id_fkey_valid;

-- Passo 3.2: Criar função para validar professional_id
CREATE OR REPLACE FUNCTION check_professional_id_valid(prof_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Se NULL, é válido (appointments podem não ter professional)
  IF prof_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Se não NULL, deve existir em profiles E ter role = 'professional'
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = prof_id 
      AND role = 'professional'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Passo 3.3: Adicionar constraint usando a função
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_professional_id_valid;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_professional_id_valid
  CHECK (check_professional_id_valid(professional_id));

-- Passo 3.4: Garantir que a FK existe e está correta
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_professional_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_professional_id_fkey
  FOREIGN KEY (professional_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Passo 3.5: Adicionar índice para otimizar joins
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id 
  ON public.appointments(professional_id) 
  WHERE professional_id IS NOT NULL;

-- ============================================================================
-- ATUALIZAR POLÍTICAS RLS USANDO A FUNÇÃO AUXILIAR (SEM organization_id)
-- ============================================================================

-- Nota: As políticas antigas já foram removidas no Passo 1.2
-- Agora criamos as novas políticas otimizadas usando apenas clinic_id

-- Criar políticas otimizadas usando a função auxiliar (APENAS clinic_id)

CREATE POLICY "Allow org members select appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = appointments.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members insert appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = appointments.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members update appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = appointments.clinic_id
        OR uoar.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = appointments.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

CREATE POLICY "Allow org members delete appointments"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = appointments.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO (OPCIONAL - DESCOMENTE PARA EXECUTAR)
-- ============================================================================

-- Verificar constraints criadas
-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.appointments'::regclass
-- ORDER BY conname;

-- Verificar políticas RLS
-- SELECT 
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' 
--   AND tablename = 'appointments'
-- ORDER BY policyname;

-- Verificar índices criados
-- SELECT 
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' 
--   AND tablename IN ('appointments', 'profiles')
-- ORDER BY tablename, indexname;

-- Verificar se organization_id foi removida
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'appointments'
-- ORDER BY ordinal_position;
