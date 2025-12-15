-- ============================================================================
-- SCRIPT ALTERNATIVO: Corrigir Appointments SEM Profiles Disponíveis
-- ============================================================================
-- Este script é para quando NÃO há profiles disponíveis na organização
-- Ele verifica a situação e fornece instruções claras
-- ============================================================================

-- ============================================================================
-- DIAGNÓSTICO: Verificar Situação Atual
-- ============================================================================

-- 1. Verificar se há QUALQUER profile na organização
SELECT 
  '1. PROFILES NA ORGANIZAÇÃO' as etapa,
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as com_professional_id,
  COUNT(*) FILTER (WHERE role = 'professional') as com_role_professional,
  COUNT(*) FILTER (WHERE role = 'super_admin') as super_admin,
  COUNT(*) FILTER (WHERE role IS NULL) as sem_role
FROM public.profiles
WHERE organization_id IN (
  SELECT DISTINCT organization_id 
  FROM public.appointments 
  WHERE professional_id IS NULL
)
OR clinic_id IN (
  SELECT DISTINCT clinic_id 
  FROM public.appointments 
  WHERE professional_id IS NULL
);

-- 2. Listar TODOS os profiles do sistema (para ver o que temos)
SELECT 
  '2. TODOS OS PROFILES DO SISTEMA' as etapa,
  pr.id,
  pr.full_name,
  pr.role,
  pr.professional_id,
  pr.clinic_id,
  pr.organization_id,
  pr.created_at
FROM public.profiles pr
ORDER BY pr.created_at DESC
LIMIT 20;

-- 3. Verificar appointments que precisam ser corrigidos
SELECT 
  '3. APPOINTMENTS COM NULL' as etapa,
  a.id,
  a.client_id,
  a.organization_id,
  a.clinic_id,
  a.start_time,
  a.status
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;

-- ============================================================================
-- ESTRATÉGIA: Tentar Corrigir Usando QUALQUER Profile Disponível
-- ============================================================================

DO $$
DECLARE
  profiles_disponiveis INTEGER := 0;
  appointments_corrigidos INTEGER := 0;
  appointments_ainda_null INTEGER := 0;
BEGIN
  -- Verificar se há profiles disponíveis (mesmo sem professional_id)
  SELECT COUNT(*) INTO profiles_disponiveis
  FROM public.profiles pr
  WHERE pr.role != 'super_admin'
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.professional_id IS NULL
        AND (
          (a.clinic_id IS NOT NULL AND pr.clinic_id = a.clinic_id)
          OR (a.organization_id IS NOT NULL AND pr.organization_id = a.organization_id)
          OR (a.clinic_id IS NOT NULL AND pr.organization_id = a.clinic_id)
          OR (a.organization_id IS NOT NULL AND pr.clinic_id = a.organization_id)
        )
    );
  
  RAISE NOTICE 'ℹ️ Profiles disponíveis para correção: %', profiles_disponiveis;
  
  IF profiles_disponiveis = 0 THEN
    RAISE WARNING '⚠️ CRÍTICO: Não há profiles disponíveis na organização!';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'AÇÃO NECESSÁRIA:';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '1. Crie pelo menos UM profile na organização através do sistema';
    RAISE NOTICE '2. Ou crie um usuário via Supabase Auth e depois crie o profile';
    RAISE NOTICE '3. Veja o arquivo: INSTRUCOES_CRIAR_PROFILES.md';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Os appointments NÃO podem ser corrigidos sem profiles.';
    RETURN;
  END IF;
  
  -- Se há profiles disponíveis, tentar corrigir
  RAISE NOTICE '✅ Profiles encontrados! Tentando corrigir appointments...';
  
  -- ESTRATÉGIA: Usar QUALQUER profile da organização (exceto super_admin)
  UPDATE public.appointments a
  SET professional_id = (
    SELECT pr.id
    FROM public.profiles pr
    WHERE pr.role != 'super_admin'
      AND (
        (a.clinic_id IS NOT NULL AND pr.clinic_id = a.clinic_id)
        OR (a.organization_id IS NOT NULL AND pr.organization_id = a.organization_id)
        OR (a.clinic_id IS NOT NULL AND pr.organization_id = a.clinic_id)
        OR (a.organization_id IS NOT NULL AND pr.clinic_id = a.organization_id)
      )
    ORDER BY 
      CASE WHEN pr.role = 'professional' THEN 1 ELSE 2 END,
      CASE WHEN pr.professional_id IS NOT NULL THEN 1 ELSE 2 END,
      pr.created_at ASC
    LIMIT 1
  )
  WHERE a.professional_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.role != 'super_admin'
        AND (
          (a.clinic_id IS NOT NULL AND pr.clinic_id = a.clinic_id)
          OR (a.organization_id IS NOT NULL AND pr.organization_id = a.organization_id)
          OR (a.clinic_id IS NOT NULL AND pr.organization_id = a.clinic_id)
          OR (a.organization_id IS NOT NULL AND pr.clinic_id = a.organization_id)
        )
    );
  
  GET DIAGNOSTICS appointments_corrigidos = ROW_COUNT;
  RAISE NOTICE '✅ Appointments corrigidos: %', appointments_corrigidos;
  
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
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Resultado final
SELECT 
  '4. RESULTADO FINAL' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as ainda_com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as corrigidos,
  ROUND(
    (COUNT(*) FILTER (WHERE professional_id IS NOT NULL)::numeric / 
     NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as percentual_corrigido
FROM public.appointments;

-- Listar appointments que ainda estão NULL (se houver)
SELECT 
  '5. AGENDAMENTOS AINDA COM NULL' as etapa,
  a.id,
  a.client_id,
  a.organization_id,
  a.clinic_id,
  a.start_time
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;

-- ============================================================================
-- INSTRUÇÕES FINAIS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '1. Se ainda há appointments com NULL:';
  RAISE NOTICE '   → Crie profiles através do sistema de autenticação';
  RAISE NOTICE '   → Veja: INSTRUCOES_CRIAR_PROFILES.md';
  RAISE NOTICE '';
  RAISE NOTICE '2. Após criar profiles:';
  RAISE NOTICE '   → Execute este script novamente';
  RAISE NOTICE '   → Os appointments serão corrigidos automaticamente';
  RAISE NOTICE '';
  RAISE NOTICE '3. Para associar appointments aos professionals corretos:';
  RAISE NOTICE '   → Crie profiles com professional_id vinculado';
  RAISE NOTICE '   → Execute UPDATE manual se necessário';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;




