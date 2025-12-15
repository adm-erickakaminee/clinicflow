-- ============================================================================
-- SCRIPT URGENTE: Corrigir professional_id em Agendamentos Existentes
-- ============================================================================
-- Este script corrige agendamentos que têm professional_id como NULL
-- atribuindo o primeiro profissional da clínica/organização.
-- ============================================================================

-- Verificar agendamentos com professional_id NULL antes da correção
SELECT 
  COUNT(*) as total_null,
  COUNT(DISTINCT client_id) as clientes_afetados,
  COUNT(DISTINCT organization_id) as organizacoes_afetadas
FROM public.appointments
WHERE professional_id IS NULL;

-- ============================================================================
-- CORREÇÃO: Atribuir o profile_id correspondente ao primeiro professional
-- ============================================================================
-- IMPORTANTE: appointments.professional_id é uma FK para profiles.id, não professionals.id
-- Precisamos encontrar o profile_id correspondente ao professional

-- ESTRATÉGIA 1: Se profiles tem professional_id, usar diretamente
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.professionals p
  INNER JOIN public.profiles pr ON pr.professional_id::text = p.id::text
  WHERE (
    (a.clinic_id IS NOT NULL AND p.clinic_id::text = a.clinic_id::text)
    OR 
    (a.organization_id IS NOT NULL AND p.clinic_id::text = a.organization_id::text)
  )
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE a.professional_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.professionals p
    INNER JOIN public.profiles pr ON pr.professional_id::text = p.id::text
    WHERE (
      (a.clinic_id IS NOT NULL AND p.clinic_id::text = a.clinic_id::text)
      OR 
      (a.organization_id IS NOT NULL AND p.clinic_id::text = a.organization_id::text)
    )
  );

-- ESTRATÉGIA 2: Se não encontrou por professional_id, tentar por nome
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.professionals p
  INNER JOIN public.profiles pr ON (
    LOWER(TRIM(pr.full_name)) = LOWER(TRIM(p.name))
    AND pr.role = 'professional'
    AND (
      (a.clinic_id IS NOT NULL AND pr.organization_id::text = a.clinic_id::text)
      OR 
      (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
    )
  )
  WHERE (
    (a.clinic_id IS NOT NULL AND p.clinic_id::text = a.clinic_id::text)
    OR 
    (a.organization_id IS NOT NULL AND p.clinic_id::text = a.organization_id::text)
  )
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE a.professional_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.professionals p
    INNER JOIN public.profiles pr ON (
      LOWER(TRIM(pr.full_name)) = LOWER(TRIM(p.name))
      AND pr.role = 'professional'
      AND (
        (a.clinic_id IS NOT NULL AND pr.organization_id::text = a.clinic_id::text)
        OR 
        (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
      )
    )
    WHERE (
      (a.clinic_id IS NOT NULL AND p.clinic_id::text = a.clinic_id::text)
      OR 
      (a.organization_id IS NOT NULL AND p.clinic_id::text = a.organization_id::text)
    )
  );

-- ESTRATÉGIA 3: Último recurso - usar o primeiro profile da clínica com role='professional'
-- VERSÃO MAIS FLEXÍVEL: Tenta todas as combinações possíveis de clinic_id/organization_id
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  WHERE pr.role = 'professional'
    AND (
      -- Tentar todas as combinações possíveis
      (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
      OR 
      (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
      OR
      (a.organization_id IS NOT NULL AND pr.clinic_id::text = a.organization_id::text)
      OR
      (a.clinic_id IS NOT NULL AND pr.organization_id::text = a.clinic_id::text)
    )
  ORDER BY pr.created_at ASC
  LIMIT 1
)
WHERE a.professional_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.role = 'professional'
      AND (
        (a.organization_id IS NOT NULL AND pr.organization_id::text = a.organization_id::text)
        OR 
        (a.clinic_id IS NOT NULL AND pr.clinic_id::text = a.clinic_id::text)
        OR
        (a.organization_id IS NOT NULL AND pr.clinic_id::text = a.organization_id::text)
        OR
        (a.clinic_id IS NOT NULL AND pr.organization_id::text = a.clinic_id::text)
      )
  );

-- ============================================================================
-- Verificação após correção
-- ============================================================================

-- Verificar quantos agendamentos ainda estão com professional_id NULL
SELECT 
  COUNT(*) as total_null_restante
FROM public.appointments
WHERE professional_id IS NULL;

-- Se ainda houver NULL, listar para revisão manual
SELECT 
  a.id,
  a.client_id,
  c.full_name as cliente_nome,
  a.service_id,
  s.name as servico_nome,
  a.start_time,
  a.end_time,
  a.organization_id,
  a.clinic_id,
  'REQUER CORREÇÃO MANUAL' as status
FROM public.appointments a
LEFT JOIN public.clients c ON c.id = a.client_id
LEFT JOIN public.services s ON s.id = a.service_id
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;

-- Mostrar agendamentos corrigidos
SELECT 
  COUNT(*) as total_corrigidos,
  COUNT(DISTINCT professional_id) as profissionais_utilizados
FROM public.appointments
WHERE professional_id IS NOT NULL;
