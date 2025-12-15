-- ============================================================================
-- SCRIPT SIMPLIFICADO: Corrigir professional_id em Agendamentos
-- ============================================================================
-- Este script corrige agendamentos que têm professional_id como NULL
-- usando uma abordagem mais simples e direta.
-- ============================================================================

-- PASSO 1: Verificar o estado atual
SELECT 
  'ANTES DA CORREÇÃO' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as com_id
FROM public.appointments;

-- PASSO 2: Verificar se existem profiles com role='professional'
SELECT 
  'PROFILES DISPONÍVEIS' as etapa,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT organization_id) as organizacoes,
  COUNT(DISTINCT clinic_id) as clinicas
FROM public.profiles
WHERE role = 'professional';

-- PASSO 2.1: Verificar TODOS os profiles (não apenas role='professional')
SELECT 
  'TODOS OS PROFILES' as etapa,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT organization_id) as organizacoes,
  COUNT(DISTINCT clinic_id) as clinicas,
  COUNT(*) FILTER (WHERE role = 'professional') as com_role_professional,
  COUNT(*) FILTER (WHERE role IS NULL) as sem_role
FROM public.profiles;

-- PASSO 3: Verificar se existem professionals
SELECT 
  'PROFESSIONALS DISPONÍVEIS' as etapa,
  COUNT(*) as total_professionals,
  COUNT(DISTINCT clinic_id) as clinicas
FROM public.professionals;

-- PASSO 4: Ver mapeamento entre professionals e profiles
SELECT 
  'MAPEAMENTO PROFESSIONALS -> PROFILES' as etapa,
  p.id as professional_id,
  p.name as professional_name,
  p.clinic_id as professional_clinic_id,
  pr.id as profile_id,
  pr.full_name as profile_name,
  pr.organization_id as profile_organization_id,
  pr.professional_id as profile_professional_id
FROM public.professionals p
LEFT JOIN public.profiles pr ON (
  pr.professional_id::text = p.id::text
  OR (pr.full_name IS NOT NULL AND p.name IS NOT NULL AND LOWER(TRIM(pr.full_name)) = LOWER(TRIM(p.name)))
)
WHERE pr.role = 'professional' OR pr.role IS NULL
ORDER BY p.created_at ASC;

-- ============================================================================
-- CORREÇÃO: Atualizar appointments usando o primeiro profile disponível
-- ============================================================================

-- ESTRATÉGIA MAIS SIMPLES: Usar o primeiro profile com role='professional' da mesma organização
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
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

-- PASSO 5: Verificar o estado após correção
SELECT 
  'APÓS A CORREÇÃO' as etapa,
  COUNT(*) as total_agendamentos,
  COUNT(*) FILTER (WHERE professional_id IS NULL) as com_null,
  COUNT(*) FILTER (WHERE professional_id IS NOT NULL) as com_id
FROM public.appointments;

-- PASSO 6: Mostrar agendamentos que ainda estão NULL (se houver)
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
