-- ============================================================================
-- CORREÇÃO PASSO A PASSO: Corrigir professional_id em Agendamentos
-- ============================================================================
-- Este script executa em etapas claras para facilitar o debug
-- ============================================================================

-- ============================================================================
-- ETAPA 1: DIAGNÓSTICO INICIAL
-- ============================================================================

-- 1.1: Agendamentos com NULL
SELECT 
  '1.1 AGENDAMENTOS COM NULL' as etapa,
  COUNT(*) as total
FROM public.appointments
WHERE professional_id IS NULL;

-- 1.2: Professionals disponíveis
SELECT 
  '1.2 PROFESSIONALS DISPONÍVEIS' as etapa,
  p.id,
  p.name,
  p.clinic_id
FROM public.professionals p
WHERE p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
ORDER BY p.created_at ASC;

-- 1.3: Profiles existentes na organização
SELECT 
  '1.3 PROFILES EXISTENTES' as etapa,
  pr.id,
  pr.full_name,
  pr.role,
  pr.professional_id,
  pr.clinic_id
FROM public.profiles pr
WHERE (
  pr.organization_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  OR pr.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
)
ORDER BY pr.created_at ASC;

-- ============================================================================
-- ETAPA 2: CRIAR PROFILES PARA PROFESSIONALS (se necessário)
-- ============================================================================

-- 2.1: Verificar quais professionals precisam de profile
SELECT 
  '2.1 PROFESSIONALS SEM PROFILE' as etapa,
  p.id as professional_id,
  p.name,
  p.clinic_id
FROM public.professionals p
WHERE p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.profiles pr 
    WHERE pr.professional_id = p.id
  );

-- 2.2: Criar profiles (executar apenas se houver professionals sem profile)
DO $$
DECLARE
  profiles_criados INTEGER := 0;
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    clinic_id,
    organization_id,
    professional_id,
    created_at,
    updated_at
  )
  SELECT 
    gen_random_uuid(),
    p.name,
    'professional'::text, -- Sempre usar 'professional' (valores válidos: 'owner', 'professional', 'receptionist')
    p.clinic_id,
    p.clinic_id,
    p.id,
    NOW(),
    NOW()
  FROM public.professionals p
  WHERE p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
    AND NOT EXISTS (
      SELECT 1 
      FROM public.profiles pr 
      WHERE pr.professional_id = p.id
    );
  
  GET DIAGNOSTICS profiles_criados = ROW_COUNT;
  RAISE NOTICE '✅ Profiles criados: %', profiles_criados;
END $$;

-- 2.3: Verificar profiles criados
SELECT 
  '2.3 PROFILES APÓS CRIAÇÃO' as etapa,
  pr.id,
  pr.full_name,
  pr.role,
  pr.professional_id,
  pr.clinic_id
FROM public.profiles pr
WHERE (
  pr.organization_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  OR pr.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
)
AND pr.professional_id IS NOT NULL
ORDER BY pr.created_at DESC
LIMIT 5;

-- ============================================================================
-- ETAPA 3: CORRIGIR APPOINTMENTS
-- ============================================================================

-- 3.1: Atualizar appointments usando profiles recém-criados
DO $$
DECLARE
  appointments_corrigidos INTEGER := 0;
BEGIN
  UPDATE public.appointments a
  SET professional_id = (
    SELECT pr.id
    FROM public.profiles pr
    WHERE pr.professional_id IS NOT NULL
      AND (
        (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
        OR 
        (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
      )
      AND pr.role != 'super_admin'
    ORDER BY 
      CASE WHEN pr.role = 'professional' THEN 1 ELSE 2 END,
      pr.created_at ASC
    LIMIT 1
  )
  WHERE a.professional_id IS NULL
    AND (
      a.organization_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
      OR a.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.professional_id IS NOT NULL
        AND (
          (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
          OR 
          (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
        )
        AND pr.role != 'super_admin'
    );
  
  GET DIAGNOSTICS appointments_corrigidos = ROW_COUNT;
  RAISE NOTICE '✅ Appointments corrigidos: %', appointments_corrigidos;
END $$;

-- ============================================================================
-- ETAPA 4: VERIFICAÇÃO FINAL
-- ============================================================================

-- 4.1: Contagem final
SELECT 
  '4.1 RESULTADO FINAL' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as ainda_com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as corrigidos
FROM public.appointments;

-- 4.2: Agendamentos ainda com NULL (se houver)
SELECT 
  '4.2 AGENDAMENTOS AINDA COM NULL' as etapa,
  a.id,
  a.client_id,
  a.organization_id,
  a.clinic_id,
  a.start_time
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;

-- 4.3: Agendamentos corrigidos (os 3 específicos)
SELECT 
  '4.3 AGENDAMENTOS CORRIGIDOS' as etapa,
  a.id,
  a.professional_id,
  pr.full_name as professional_name,
  pr.role as professional_role,
  a.client_id,
  a.start_time
FROM public.appointments a
LEFT JOIN public.profiles pr ON pr.id = a.professional_id
WHERE a.professional_id IS NOT NULL
  AND a.id IN (
    '9868345d-5a49-4192-9fdc-d2a45f7b92d3',
    '54c43b6b-a9a8-4c1c-bc8c-c93a0f392fc7',
    '4582227f-96fe-4a29-9245-d8b556e52e97'
  )
ORDER BY a.start_time DESC;
