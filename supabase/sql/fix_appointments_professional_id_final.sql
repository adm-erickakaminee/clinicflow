-- ============================================================================
-- SCRIPT FINAL: Corrigir professional_id em Agendamentos (Abordagem Direta)
-- ============================================================================
-- Este script corrige agendamentos que têm professional_id como NULL
-- usando uma abordagem mais direta e pragmática.
-- ============================================================================

-- PASSO 1: Verificar agendamentos com NULL e suas organizações
SELECT 
  'AGENDAMENTOS COM NULL' as etapa,
  a.id,
  a.organization_id,
  a.clinic_id,
  COUNT(*) OVER (PARTITION BY a.organization_id) as total_na_organizacao
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;

-- PASSO 2: Verificar profiles disponíveis para essa organização
-- (Usando o organization_id dos agendamentos com NULL)
SELECT 
  'PROFILES PARA ORGANIZAÇÃO' as etapa,
  pr.id as profile_id,
  pr.full_name,
  pr.role,
  pr.organization_id,
  pr.clinic_id,
  pr.professional_id
FROM public.profiles pr
WHERE EXISTS (
  SELECT 1 
  FROM public.appointments a 
  WHERE a.professional_id IS NULL
    AND (
      pr.organization_id::text = a.organization_id::text
      OR pr.clinic_id::text = a.clinic_id::text
      OR pr.organization_id::text = a.clinic_id::text
      OR pr.clinic_id::text = a.organization_id::text
    )
)
ORDER BY 
  CASE WHEN pr.role = 'professional' THEN 1 ELSE 2 END,
  pr.created_at ASC;

-- ============================================================================
-- CORREÇÃO DIRETA: Atualizar usando o primeiro profile disponível
-- ============================================================================

-- ESTRATÉGIA 1: Tentar encontrar profile por organization_id/clinic_id exato
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  WHERE (
    (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
    OR 
    (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
  )
  AND (pr.role = 'professional' OR pr.role IS NULL)
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
      (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
      OR 
      (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
    )
  );

-- ESTRATÉGIA 2: Se ainda houver NULL, usar QUALQUER profile da organização (sem verificar role)
-- Esta estratégia é mais permissiva e deve funcionar mesmo se não houver profiles com role='professional'
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
  -- Priorizar profiles que não são super_admin
  ORDER BY 
    CASE WHEN pr.role = 'super_admin' THEN 2 ELSE 1 END,
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
    AND pr.role != 'super_admin' -- Excluir super_admin
  );

-- ESTRATÉGIA 3: Último recurso - usar QUALQUER profile disponível (apenas se necessário)
-- ATENÇÃO: Descomente apenas se as estratégias anteriores não funcionarem
/*
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  WHERE pr.role = 'professional'
  ORDER BY pr.created_at ASC
  LIMIT 1
)
WHERE a.professional_id IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles WHERE role = 'professional');
*/

-- ============================================================================
-- Verificação final
-- ============================================================================

-- Verificar quantos agendamentos ainda estão com professional_id NULL
SELECT 
  'RESULTADO FINAL' as etapa,
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
