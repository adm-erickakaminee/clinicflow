-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Por que professional_id não está sendo corrigido?
-- ============================================================================
-- Execute este script PRIMEIRO para entender o problema
-- ============================================================================

-- 1. Agendamentos com NULL
SELECT 
  '1. AGENDAMENTOS COM NULL' as etapa,
  a.id,
  a.organization_id,
  a.clinic_id,
  a.client_id,
  a.start_time
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;

-- 2. TODOS os profiles do sistema (para ver o que temos disponível)
SELECT 
  '2. TODOS OS PROFILES' as etapa,
  pr.id,
  pr.full_name,
  pr.role,
  pr.organization_id,
  pr.clinic_id,
  pr.professional_id,
  pr.created_at
FROM public.profiles pr
ORDER BY pr.created_at ASC;

-- 3. Profiles que PODEM corresponder à organização dos agendamentos NULL
SELECT 
  '3. PROFILES PARA ORGANIZAÇÃO 20390a6e-707c-43e2-8fd3-062790cc7a6a' as etapa,
  pr.id,
  pr.full_name,
  pr.role,
  pr.organization_id,
  pr.clinic_id,
  pr.professional_id,
  CASE 
    WHEN pr.organization_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a' THEN '✅ Match organization_id'
    WHEN pr.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a' THEN '✅ Match clinic_id'
    ELSE '❌ Sem match'
  END as match_status
FROM public.profiles pr
WHERE (
  pr.organization_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
  OR pr.clinic_id::text = '20390a6e-707c-43e2-8fd3-062790cc7a6a'
)
ORDER BY 
  CASE WHEN pr.role = 'professional' THEN 1 ELSE 2 END,
  pr.created_at ASC;

-- 4. Verificar se há professionals na tabela professionals
SELECT 
  '4. PROFESSIONALS DISPONÍVEIS' as etapa,
  p.id,
  p.name,
  p.clinic_id,
  p.role,
  p.created_at
FROM public.professionals p
ORDER BY p.created_at ASC;

-- 5. Verificar mapeamento entre professionals e profiles
SELECT 
  '5. MAPEAMENTO PROFESSIONALS -> PROFILES' as etapa,
  p.id as professional_id,
  p.name as professional_name,
  p.clinic_id as professional_clinic_id,
  pr.id as profile_id,
  pr.full_name as profile_name,
  pr.role as profile_role,
  pr.organization_id as profile_organization_id,
  pr.clinic_id as profile_clinic_id
FROM public.professionals p
LEFT JOIN public.profiles pr ON (
  pr.professional_id::text = p.id::text
  OR (pr.full_name IS NOT NULL AND p.name IS NOT NULL AND LOWER(TRIM(pr.full_name)) = LOWER(TRIM(p.name)))
)
ORDER BY p.created_at ASC;
