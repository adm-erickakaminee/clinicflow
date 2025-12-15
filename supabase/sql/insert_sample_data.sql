-- Script para inserir dados de exemplo no banco de dados
-- Execute este SQL no Supabase SQL Editor

-- IMPORTANTE: Substitua '20390a6e-707c-43e2-8fd3-062790cc7a6a' pelo seu clinic_id real
-- Você pode encontrar seu clinic_id na tabela profiles ou organizations

-- 1. Inserir 3 Profissionais
-- Nota: Os profissionais podem ser inseridos na tabela 'professionals' ou 'profiles' com role='professional'
-- Vou usar a tabela 'professionals' que parece ser a correta baseado no código

INSERT INTO public.professionals (id, clinic_id, name, specialty, avatar, created_at, updated_at)
VALUES
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Profissional 1', 'Especialidade 1', '', now(), now()),
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Profissional 2', 'Especialidade 2', '', now(), now()),
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Profissional 3', 'Especialidade 3', '', now(), now())
ON CONFLICT DO NOTHING;

-- 2. Inserir 3 Clientes
-- A tabela clients usa 'full_name' e 'clinic_id' (NOT NULL)
INSERT INTO public.clients (id, clinic_id, full_name, email, phone, created_at, updated_at)
VALUES
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Cliente 1', 'cliente1@email.com', '(11) 99999-1111', now(), now()),
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Cliente 2', 'cliente2@email.com', '(11) 99999-2222', now(), now()),
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Cliente 3', 'cliente3@email.com', '(11) 99999-3333', now(), now())
ON CONFLICT DO NOTHING;

-- 3. Inserir 3 Serviços
-- Nota: Verifique se a tabela usa 'clinic_id' ou 'organization_id'
-- Se der erro, tente com 'clinic_id' em vez de 'organization_id'
INSERT INTO public.services (id, clinic_id, name, description, duration_minutes, price, color, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Serviço 1', 'Descrição do Serviço 1', 60, 15000, '#3B82F6', true, now(), now()),
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Serviço 2', 'Descrição do Serviço 2', 45, 12000, '#10B981', true, now(), now()),
  (gen_random_uuid(), '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid, 'Serviço 3', 'Descrição do Serviço 3', 30, 8000, '#F59E0B', true, now(), now())
ON CONFLICT DO NOTHING;

-- 4. Buscar os IDs dos profissionais, serviços e clientes recém-criados
-- Vamos criar variáveis temporárias para armazenar os IDs

DO $$
DECLARE
  prof1_id uuid;
  prof2_id uuid;
  prof3_id uuid;
  serv1_id uuid;
  serv2_id uuid;
  serv3_id uuid;
  client1_id uuid;
  client2_id uuid;
  client3_id uuid;
  clinic_uuid uuid := '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid;
  today_start timestamptz;
  today_9am timestamptz;
  today_10am timestamptz;
  today_11am timestamptz;
  today_9am_end timestamptz;
  today_10am_end timestamptz;
  today_11am_end timestamptz;
BEGIN
  -- Obter IDs dos profissionais
  SELECT id INTO prof1_id FROM public.professionals WHERE name = 'Profissional 1' AND clinic_id = clinic_uuid LIMIT 1;
  SELECT id INTO prof2_id FROM public.professionals WHERE name = 'Profissional 2' AND clinic_id = clinic_uuid LIMIT 1;
  SELECT id INTO prof3_id FROM public.professionals WHERE name = 'Profissional 3' AND clinic_id = clinic_uuid LIMIT 1;
  
  -- Obter IDs dos serviços (tente clinic_id primeiro, se não funcionar use organization_id)
  SELECT id INTO serv1_id FROM public.services WHERE name = 'Serviço 1' AND (clinic_id = clinic_uuid OR organization_id = clinic_uuid) LIMIT 1;
  SELECT id INTO serv2_id FROM public.services WHERE name = 'Serviço 2' AND (clinic_id = clinic_uuid OR organization_id = clinic_uuid) LIMIT 1;
  SELECT id INTO serv3_id FROM public.services WHERE name = 'Serviço 3' AND (clinic_id = clinic_uuid OR organization_id = clinic_uuid) LIMIT 1;
  
  -- Obter IDs dos clientes (usando full_name e clinic_id)
  SELECT id INTO client1_id FROM public.clients WHERE full_name = 'Cliente 1' AND clinic_id = clinic_uuid LIMIT 1;
  SELECT id INTO client2_id FROM public.clients WHERE full_name = 'Cliente 2' AND clinic_id = clinic_uuid LIMIT 1;
  SELECT id INTO client3_id FROM public.clients WHERE full_name = 'Cliente 3' AND clinic_id = clinic_uuid LIMIT 1;
  
  -- Calcular horários de hoje
  today_start := date_trunc('day', now());
  today_9am := today_start + interval '9 hours';
  today_10am := today_start + interval '10 hours';
  today_11am := today_start + interval '11 hours';
  today_9am_end := today_9am + interval '1 hour';
  today_10am_end := today_10am + interval '1 hour';
  today_11am_end := today_11am + interval '1 hour';
  
  -- 5. Inserir 3 Agendamentos para hoje
  -- Agendamento 1: Profissional 1 às 9h com Cliente 1
  IF prof1_id IS NOT NULL AND serv1_id IS NOT NULL AND client1_id IS NOT NULL THEN
    INSERT INTO public.appointments (
      id, clinic_id, professional_id, client_id, service_id, 
      start_time, end_time, status, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), clinic_uuid, prof1_id, client1_id, serv1_id,
      today_9am, today_9am_end, 'confirmed', now(), now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Agendamento 2: Profissional 2 às 10h com Cliente 2
  IF prof2_id IS NOT NULL AND serv2_id IS NOT NULL AND client2_id IS NOT NULL THEN
    INSERT INTO public.appointments (
      id, clinic_id, professional_id, client_id, service_id,
      start_time, end_time, status, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), clinic_uuid, prof2_id, client2_id, serv2_id,
      today_10am, today_10am_end, 'confirmed', now(), now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Agendamento 3: Profissional 3 às 11h com Cliente 3
  IF prof3_id IS NOT NULL AND serv3_id IS NOT NULL AND client3_id IS NOT NULL THEN
    INSERT INTO public.appointments (
      id, clinic_id, professional_id, client_id, service_id,
      start_time, end_time, status, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), clinic_uuid, prof3_id, client3_id, serv3_id,
      today_11am, today_11am_end, 'confirmed', now(), now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 6. Verificar os dados inseridos
SELECT 'Profissionais inseridos:' as info;
SELECT id, name, specialty, clinic_id FROM public.professionals WHERE clinic_id = '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid ORDER BY name;

SELECT 'Clientes inseridos:' as info;
SELECT id, full_name as nome, email, phone, clinic_id FROM public.clients 
WHERE clinic_id = '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid
ORDER BY full_name;

SELECT 'Serviços inseridos:' as info;
SELECT id, name, duration_minutes, price, is_active FROM public.services 
WHERE clinic_id = '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid 
   OR organization_id = '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid
ORDER BY name;

SELECT 'Agendamentos inseridos:' as info;
SELECT 
  a.id,
  a.start_time,
  a.end_time,
  a.status,
  p.name as profissional,
  c.name as cliente,
  s.name as servico
FROM public.appointments a
LEFT JOIN public.professionals p ON p.id = a.professional_id
LEFT JOIN public.clients c ON c.id = a.client_id
LEFT JOIN public.services s ON s.id = a.service_id
WHERE (a.clinic_id = '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid OR a.organization_id = '20390a6e-707c-43e2-8fd3-062790cc7a6a'::uuid)
  AND date(a.start_time) = CURRENT_DATE
ORDER BY a.start_time;

