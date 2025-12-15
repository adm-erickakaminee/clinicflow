-- ============================================================================
-- CORREÇÃO DIRETA: Corrigir professional_id usando professionals diretamente
-- ============================================================================
-- PROBLEMA IDENTIFICADO: Não há profiles correspondentes aos professionals
-- SOLUÇÃO: Criar profiles para os professionals OU usar uma abordagem alternativa
-- ============================================================================

-- PASSO 1: Verificar se há profiles na organização/clínica
SELECT 
  '1. PROFILES NA ORGANIZAÇÃO' as etapa,
  pr.id,
  pr.full_name,
  pr.role,
  pr.organization_id,
  pr.clinic_id,
  pr.professional_id
FROM public.profiles pr
WHERE (
  pr.organization_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  OR pr.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
)
ORDER BY pr.created_at ASC;

-- PASSO 2: Verificar professionals disponíveis
SELECT 
  '2. PROFESSIONALS DISPONÍVEIS' as etapa,
  p.id,
  p.name,
  p.clinic_id,
  p.role
FROM public.professionals p
WHERE p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
ORDER BY p.created_at ASC;

-- ============================================================================
-- ESTRATÉGIA: Criar profiles para os professionals que não têm profile
-- ============================================================================

-- Verificar quais professionals não têm profile correspondente
SELECT 
  '3. PROFESSIONALS SEM PROFILE' as etapa,
  p.id as professional_id,
  p.name,
  p.clinic_id
FROM public.professionals p
WHERE p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.profiles pr 
    WHERE pr.professional_id::text = p.id::text
  );

-- Criar profiles para os professionals que não têm
-- ATENÇÃO: Isso cria profiles básicos. Ajuste conforme necessário.
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
  gen_random_uuid() as id,
  p.name as full_name,
  COALESCE(p.role, 'professional')::text as role,
  p.clinic_id,
  p.clinic_id as organization_id, -- Assumindo que clinic_id = organization_id
  p.id as professional_id, -- p.id já é uuid, não precisa de cast
  NOW() as created_at,
  NOW() as updated_at
FROM public.professionals p
WHERE p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.profiles pr 
    WHERE pr.professional_id = p.id -- Comparação direta de uuid, sem cast
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- AGORA CORRIGIR OS APPOINTMENTS usando os profiles recém-criados
-- ============================================================================

-- ESTRATÉGIA 1: Usar profiles que correspondem aos professionals
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  INNER JOIN public.professionals p ON pr.professional_id::text = p.id::text
  WHERE (
    (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
    OR 
    (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
  )
  AND p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  AND pr.role != 'super_admin'
  ORDER BY pr.created_at ASC
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
    INNER JOIN public.professionals p ON pr.professional_id::text = p.id::text
    WHERE (
      (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
      OR 
      (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
    )
    AND p.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
    AND pr.role != 'super_admin'
  );

-- ESTRATÉGIA 2: Se ainda houver NULL, usar qualquer profile da organização (exceto super_admin)
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  WHERE (
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
    WHERE (
      (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
      OR 
      (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
    )
    AND pr.role != 'super_admin'
  );

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Contagem final
SELECT 
  '4. RESULTADO FINAL' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as ainda_com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as corrigidos
FROM public.appointments;

-- Listar agendamentos que ainda estão NULL (se houver)
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

-- Mostrar os agendamentos corrigidos com seus professionals
SELECT 
  '6. AGENDAMENTOS CORRIGIDOS' as etapa,
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
