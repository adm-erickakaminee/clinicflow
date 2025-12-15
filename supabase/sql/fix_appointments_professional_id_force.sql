-- ============================================================================
-- CORREÇÃO FORÇADA: Corrigir professional_id em Agendamentos
-- ============================================================================
-- Este script usa uma abordagem mais agressiva para corrigir os 3 agendamentos
-- Execute APÓS o script de diagnóstico para entender o contexto
-- ============================================================================

-- PASSO 1: Verificar estado ANTES
SELECT 
  'ANTES DA CORREÇÃO' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as com_id
FROM public.appointments;

-- ============================================================================
-- ESTRATÉGIA 1: Tentar encontrar profile por organization_id/clinic_id
-- Prioriza profiles com role='professional', mas aceita qualquer role (exceto super_admin)
-- ============================================================================
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  WHERE (
    (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
    OR 
    (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
    OR
    (a.organization_id IS NOT NULL AND pr.clinic_id::text = a.organization_id::text)
    OR
    (a.clinic_id IS NOT NULL AND pr.organization_id::text = a.clinic_id::text)
  )
  AND pr.role != 'super_admin' -- Excluir super_admin
  ORDER BY 
    CASE WHEN pr.role = 'professional' THEN 1 
         WHEN pr.role IS NULL THEN 2
         ELSE 3 END,
    pr.created_at ASC
  LIMIT 1
)
WHERE a.professional_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE (
      (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
      OR 
      (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
      OR
      (a.organization_id IS NOT NULL AND pr.clinic_id::text = a.organization_id::text)
      OR
      (a.clinic_id IS NOT NULL AND pr.organization_id::text = a.clinic_id::text)
    )
    AND pr.role != 'super_admin'
  );

-- ============================================================================
-- ESTRATÉGIA 2: Se ainda houver NULL, usar QUALQUER profile (exceto super_admin)
-- Esta é uma correção de emergência - use apenas se necessário
-- ============================================================================
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  WHERE pr.role != 'super_admin'
  ORDER BY 
    CASE WHEN pr.role = 'professional' THEN 1 ELSE 2 END,
    pr.created_at ASC
  LIMIT 1
)
WHERE a.professional_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles WHERE role != 'super_admin'
  );

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Contagem final
SELECT 
  'APÓS A CORREÇÃO' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as ainda_com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as corrigidos
FROM public.appointments;

-- Listar agendamentos que ainda estão NULL (se houver)
SELECT 
  'AGENDAMENTOS AINDA COM NULL' as etapa,
  a.id,
  a.client_id,
  a.organization_id,
  a.clinic_id,
  a.start_time
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;

-- Mostrar os agendamentos que foram corrigidos
SELECT 
  'AGENDAMENTOS CORRIGIDOS' as etapa,
  a.id,
  a.professional_id,
  a.client_id,
  a.organization_id,
  a.clinic_id,
  a.start_time,
  pr.full_name as professional_name,
  pr.role as professional_role
FROM public.appointments a
LEFT JOIN public.profiles pr ON pr.id = a.professional_id
WHERE a.professional_id IS NOT NULL
  AND a.id IN (
    '9868345d-5a49-4192-9fdc-d2a45f7b92d3',
    '54c43b6b-a9a8-4c1c-bc8c-c93a0f392fc7',
    '4582227f-96fe-4a29-9245-d8b556e52e97'
  )
ORDER BY a.start_time DESC;
