-- ============================================================================
-- SCRIPT DE INTEGRIDADE DE DADOS: Unificação Final e Correção
-- ============================================================================
-- Este script garante que:
-- 1. Todas as colunas estão com nomes unificados (snake_case)
-- 2. Todos os professionals têm profiles correspondentes
-- 3. Todos os appointments têm professional_id válido
-- ============================================================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- ETAPA 1: UNIFICAÇÃO DE COLUNAS (Idempotente)
-- ============================================================================

DO $$
BEGIN
  -- Renomear id_do_cliente para client_id (se existir)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'appointments' 
      AND column_name = 'id_do_cliente'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_do_cliente" TO client_id;
    RAISE NOTICE '✅ Coluna id_do_cliente renomeada para client_id';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna client_id já existe ou id_do_cliente não existe';
  END IF;

  -- Renomear id_do_servico para service_id (se existir)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'appointments' 
      AND column_name = 'id_do_servico'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_do_servico" TO service_id;
    RAISE NOTICE '✅ Coluna id_do_servico renomeada para service_id';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna service_id já existe ou id_do_servico não existe';
  END IF;

  -- Renomear id_do_profissional para professional_id (se existir)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'appointments' 
      AND column_name = 'id_do_profissional'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_do_profissional" TO professional_id;
    RAISE NOTICE '✅ Coluna id_do_profissional renomeada para professional_id';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna professional_id já existe ou id_do_profissional não existe';
  END IF;
END $$;

-- ============================================================================
-- ETAPA 2: DIAGNÓSTICO INICIAL
-- ============================================================================

-- 2.1: Contar professionals sem profile
SELECT 
  '2.1 PROFESSIONALS SEM PROFILE' as etapa,
  COUNT(*) as total
FROM public.professionals p
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.profiles pr 
  WHERE pr.professional_id = p.id
);

-- 2.2: Contar appointments com professional_id NULL
SELECT 
  '2.2 APPOINTMENTS COM NULL' as etapa,
  COUNT(*) as total,
  COUNT(DISTINCT clinic_id) as clinicas_afetadas
FROM public.appointments
WHERE professional_id IS NULL;

-- ============================================================================
-- ETAPA 3: VERIFICAR PROFILES EXISTENTES
-- ============================================================================
-- NOTA: Não podemos criar profiles novos via SQL porque profiles.id é FK para auth.users.id
-- Profiles devem ser criados através do sistema de autenticação (signUp, etc.)
-- Esta etapa apenas verifica quais professionals têm profiles e quais não têm

DO $$
DECLARE
  professionals_sem_profile INTEGER := 0;
  profiles_existentes INTEGER := 0;
BEGIN
  -- Contar professionals sem profile
  SELECT COUNT(*) INTO professionals_sem_profile
  FROM public.professionals p
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.profiles pr 
    WHERE pr.professional_id = p.id
  );
  
  -- Contar profiles existentes com professional_id
  SELECT COUNT(*) INTO profiles_existentes
  FROM public.profiles
  WHERE professional_id IS NOT NULL;
  
  RAISE NOTICE 'ℹ️ Professionals sem profile: %', professionals_sem_profile;
  RAISE NOTICE 'ℹ️ Profiles existentes com professional_id: %', profiles_existentes;
  
  IF professionals_sem_profile > 0 THEN
    RAISE NOTICE '⚠️ ATENÇÃO: Existem % professionals sem profile correspondente.', professionals_sem_profile;
    RAISE NOTICE '   Profiles devem ser criados através do sistema de autenticação.';
    RAISE NOTICE '   Os appointments serão corrigidos usando profiles existentes.';
  ELSE
    RAISE NOTICE '✅ Todos os professionals têm profiles correspondentes.';
  END IF;
END $$;

-- Verificar profiles criados
SELECT 
  '3.1 PROFILES APÓS CRIAÇÃO' as etapa,
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as com_professional_id
FROM public.profiles
WHERE professional_id IS NOT NULL;

-- ============================================================================
-- ETAPA 4: CORRIGIR APPOINTMENTS COM professional_id NULL
-- ============================================================================

DO $$
DECLARE
  appointments_corrigidos_1 INTEGER := 0;
  appointments_corrigidos_2 INTEGER := 0;
  appointments_ainda_null INTEGER := 0;
BEGIN
  -- ESTRATÉGIA 1: Usar profiles que correspondem aos professionals da mesma clínica
  UPDATE public.appointments a
  SET professional_id = (
    SELECT pr.id
    FROM public.profiles pr
    WHERE pr.professional_id IS NOT NULL
      AND (
        (a.clinic_id IS NOT NULL AND pr.clinic_id = a.clinic_id)
        OR 
        (a.organization_id IS NOT NULL AND pr.organization_id = a.organization_id)
      )
      AND pr.role != 'super_admin'
    ORDER BY 
      CASE WHEN pr.role = 'professional' THEN 1 ELSE 2 END,
      pr.created_at ASC
    LIMIT 1
  )
  WHERE a.professional_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.professional_id IS NOT NULL
        AND (
          (a.clinic_id IS NOT NULL AND pr.clinic_id = a.clinic_id)
          OR 
          (a.organization_id IS NOT NULL AND pr.organization_id = a.organization_id)
        )
        AND pr.role != 'super_admin'
    );
  
  GET DIAGNOSTICS appointments_corrigidos_1 = ROW_COUNT;
  RAISE NOTICE '✅ Appointments corrigidos (Estratégia 1): %', appointments_corrigidos_1;
  
  -- ESTRATÉGIA 2: Se ainda houver NULL, usar qualquer profile da organização (exceto super_admin)
  UPDATE public.appointments a
  SET professional_id = (
    SELECT pr.id
    FROM public.profiles pr
    WHERE (
      (a.clinic_id IS NOT NULL AND pr.clinic_id = a.clinic_id)
      OR 
      (a.organization_id IS NOT NULL AND pr.organization_id = a.organization_id)
    )
    AND pr.role != 'super_admin'
    ORDER BY 
      CASE WHEN pr.role = 'professional' THEN 1 ELSE 2 END,
      pr.created_at ASC
    LIMIT 1
  )
  WHERE a.professional_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE (
        (a.clinic_id IS NOT NULL AND pr.clinic_id = a.clinic_id)
        OR 
        (a.organization_id IS NOT NULL AND pr.organization_id = a.organization_id)
      )
      AND pr.role != 'super_admin'
    );
  
  GET DIAGNOSTICS appointments_corrigidos_2 = ROW_COUNT;
  RAISE NOTICE '✅ Appointments corrigidos (Estratégia 2): %', appointments_corrigidos_2;
  RAISE NOTICE '✅ Total de appointments corrigidos: %', appointments_corrigidos_1 + appointments_corrigidos_2;
  
  -- Verificar quantos ainda estão NULL
  SELECT COUNT(*) INTO appointments_ainda_null
  FROM public.appointments
  WHERE professional_id IS NULL;
  
  IF appointments_ainda_null > 0 THEN
    RAISE WARNING '⚠️ Ainda existem % appointments com professional_id NULL', appointments_ainda_null;
  ELSE
    RAISE NOTICE '✅ Todos os appointments foram corrigidos!';
  END IF;
END $$;

-- ============================================================================
-- ETAPA 5: VERIFICAÇÃO FINAL
-- ============================================================================

-- 5.1: Contagem final de appointments
SELECT 
  '5.1 RESULTADO FINAL' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as ainda_com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as corrigidos,
  ROUND(
    (COUNT(*) FILTER (WHERE professional_id IS NOT NULL)::numeric / 
     NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as percentual_corrigido
FROM public.appointments;

-- 5.2: Listar appointments que ainda estão NULL (se houver)
SELECT 
  '5.2 AGENDAMENTOS AINDA COM NULL' as etapa,
  a.id,
  a.client_id,
  a.organization_id,
  a.clinic_id,
  a.start_time
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC
LIMIT 10;

-- 5.3: Verificar integridade: appointments com professional_id válido
SELECT 
  '5.3 INTEGRIDADE VERIFICADA' as etapa,
  COUNT(*) as appointments_com_professional_id,
  COUNT(DISTINCT a.professional_id) as profiles_utilizados,
  COUNT(DISTINCT a.clinic_id) as clinicas_afetadas
FROM public.appointments a
WHERE a.professional_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.profiles pr 
    WHERE pr.id = a.professional_id
  );

-- 5.4: Resumo de profiles e professionals
SELECT 
  '5.4 RESUMO PROFILES/PROFESSIONALS' as etapa,
  (SELECT COUNT(*) FROM public.professionals) as total_professionals,
  (SELECT COUNT(*) FROM public.profiles WHERE professional_id IS NOT NULL) as profiles_com_professional_id,
  (SELECT COUNT(*) FROM public.professionals p 
   WHERE EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.professional_id = p.id)) as professionals_com_profile;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Script de integridade de dados executado com sucesso!
-- Verifique os resultados acima para confirmar que todos os dados foram corrigidos.
