-- ============================================================================
-- SCRIPT: Corrigir professional_id em Agendamentos Existentes
-- ============================================================================
-- Este script tenta corrigir agendamentos que têm professional_id como NULL
-- mapeando-os para o professional_id correto baseado em dados relacionados.
-- 
-- CONFORME RELATORIO_BANCO_DADOS.md:
-- - appointments usa clinic_id (NUNCA organization_id)
-- - professionals usa clinic_id
-- ============================================================================

-- Verificar agendamentos com professional_id NULL
SELECT 
  a.id,
  a.professional_id,
  a.client_id,
  a.service_id,
  a.start_time,
  a.clinic_id
FROM public.appointments a
WHERE a.professional_id IS NULL
ORDER BY a.created_at DESC;

-- ============================================================================
-- ESTRATÉGIA 1: Se o agendamento foi criado recentemente e temos o client_id,
-- podemos tentar encontrar o professional_id através de outros agendamentos
-- do mesmo cliente no mesmo horário/dia
-- ============================================================================

-- Atualizar agendamentos NULL usando o professional_id de outros agendamentos
-- do mesmo cliente no mesmo dia (se houver)
UPDATE public.appointments a1
SET professional_id = (
  SELECT a2.professional_id
  FROM public.appointments a2
  WHERE a2.client_id = a1.client_id
    AND a2.professional_id IS NOT NULL
    AND DATE(a2.start_time) = DATE(a1.start_time)
    AND a2.id != a1.id
  LIMIT 1
)
WHERE a1.professional_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.appointments a2
    WHERE a2.client_id = a1.client_id
      AND a2.professional_id IS NOT NULL
      AND DATE(a2.start_time) = DATE(a1.start_time)
      AND a2.id != a1.id
  );

-- ============================================================================
-- ESTRATÉGIA 2: Se não encontrou, usar o primeiro professional da clínica
-- (apenas como último recurso - você pode querer revisar manualmente)
-- ============================================================================

-- ATENÇÃO: Esta query usa o primeiro professional da clínica como fallback
-- Descomente apenas se quiser aplicar esta correção automática
-- Recomendamos revisar manualmente os agendamentos antes de aplicar

-- VERSÃO ATUALIZADA: Usa o primeiro professional da clínica
-- Conforme RELATORIO_BANCO_DADOS.md: appointments usa clinic_id (NUNCA organization_id)
UPDATE public.appointments a
SET professional_id = (
  SELECT p.id
  FROM public.professionals p
  WHERE p.clinic_id = a.clinic_id
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE a.professional_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.professionals p
    WHERE p.clinic_id = a.clinic_id
  );

-- ============================================================================
-- Verificação final
-- ============================================================================

-- Verificar quantos agendamentos ainda estão com professional_id NULL
SELECT 
  COUNT(*) as total_null,
  COUNT(DISTINCT client_id) as clientes_afetados,
  COUNT(DISTINCT clinic_id) as clinicas_afetadas
FROM public.appointments
WHERE professional_id IS NULL;

-- Listar agendamentos que ainda estão NULL (para revisão manual)
SELECT 
  a.id,
  a.client_id,
  c.full_name as cliente_nome,
  a.service_id,
  s.name as servico_nome,
  a.start_time,
  a.end_time,
  a.clinic_id
FROM public.appointments a
LEFT JOIN public.clients c ON c.id = a.client_id
LEFT JOIN public.services s ON s.id = a.service_id
WHERE a.professional_id IS NULL
ORDER BY a.start_time DESC;
