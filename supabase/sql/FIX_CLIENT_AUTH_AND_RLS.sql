-- ============================================================================
-- CORREÇÕES CRÍTICAS: CLIENTE AUTH E RLS RECEPCIONISTA
-- ============================================================================
-- Este script implementa:
-- 1. Garantir que clients.id = profiles.id (auth.uid()) quando cliente se cadastra
-- 2. Ajustar RLS da Recepcionista para ter acesso igual ao Admin
-- 3. Verificar/ajustar política do Profissional para clientes
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: FUNÇÃO PARA CRIAR CLIENTE AUTOMATICAMENTE
-- ============================================================================

-- Função que cria automaticamente o registro em clients quando um profile
-- com role 'client' é criado
CREATE OR REPLACE FUNCTION public.handle_new_client_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o profile é de um cliente, criar registro em clients com mesmo ID
  IF NEW.role = 'client' AND NEW.clinic_id IS NOT NULL THEN
    INSERT INTO public.clients (
      id,
      clinic_id,
      full_name,
      phone,
      email,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id, -- ✅ CRÍTICO: clients.id = profiles.id = auth.uid()
      NEW.clinic_id,
      NEW.full_name,
      NEW.phone,
      NULL, -- Email será atualizado depois se fornecido
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, clients.full_name),
      phone = COALESCE(EXCLUDED.phone, clients.phone),
      email = COALESCE(EXCLUDED.email, clients.email),
      clinic_id = COALESCE(EXCLUDED.clinic_id, clients.clinic_id),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa após inserção/atualização de profile
DROP TRIGGER IF EXISTS on_profile_created_client ON public.profiles;
CREATE TRIGGER on_profile_created_client
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'client')
  EXECUTE FUNCTION public.handle_new_client_profile();

-- ============================================================================
-- PARTE 2: AJUSTAR RLS DA RECEPCIONISTA (Igual ao Admin)
-- ============================================================================

-- 2.1: appointments - Recepcionista deve ter acesso igual ao Admin
DROP POLICY IF EXISTS "Receptionists can view appointments in clinic" ON public.appointments;
DROP POLICY IF EXISTS "Receptionists can insert appointments in clinic" ON public.appointments;
DROP POLICY IF EXISTS "Receptionists can update appointments in clinic" ON public.appointments;
DROP POLICY IF EXISTS "Receptionists can delete appointments in clinic" ON public.appointments;

-- SELECT: Recepcionista vê todos os agendamentos do clinic_id (igual Admin)
CREATE POLICY "Receptionists can view appointments in clinic"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = appointments.clinic_id
    )
  );

-- INSERT: Recepcionista pode criar agendamentos no clinic_id
CREATE POLICY "Receptionists can insert appointments in clinic"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = appointments.clinic_id
    )
  );

-- UPDATE: Recepcionista pode atualizar agendamentos do clinic_id
CREATE POLICY "Receptionists can update appointments in clinic"
  ON public.appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = appointments.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = appointments.clinic_id
    )
  );

-- DELETE: Recepcionista pode deletar agendamentos do clinic_id
CREATE POLICY "Receptionists can delete appointments in clinic"
  ON public.appointments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = appointments.clinic_id
    )
  );

-- 2.2: clients - Recepcionista deve ter acesso igual ao Admin
DROP POLICY IF EXISTS "Receptionists can view clients in clinic" ON public.clients;
DROP POLICY IF EXISTS "Receptionists can insert clients in clinic" ON public.clients;
DROP POLICY IF EXISTS "Receptionists can update clients in clinic" ON public.clients;

-- SELECT: Recepcionista vê todos os clientes do clinic_id (igual Admin)
CREATE POLICY "Receptionists can view clients in clinic"
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = clients.clinic_id
    )
  );

-- INSERT: Recepcionista pode criar clientes no clinic_id
CREATE POLICY "Receptionists can insert clients in clinic"
  ON public.clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = clients.clinic_id
    )
  );

-- UPDATE: Recepcionista pode atualizar clientes do clinic_id
CREATE POLICY "Receptionists can update clients in clinic"
  ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = clients.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'receptionist'
        AND p.clinic_id = clients.clinic_id
    )
  );

-- ============================================================================
-- PARTE 3: PERMITIR CLIENTE CRIAR SEU PRÓPRIO REGISTRO
-- ============================================================================

-- Permitir que cliente crie seu próprio registro em clients
-- (com id = auth.uid() para garantir vínculo correto)
DROP POLICY IF EXISTS "Clients can insert own client record" ON public.clients;
CREATE POLICY "Clients can insert own client record"
  ON public.clients
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
        AND p.clinic_id = clients.clinic_id
    )
  );

-- ============================================================================
-- PARTE 4: VERIFICAR POLÍTICA DO PROFISSIONAL PARA CLIENTES
-- ============================================================================

-- A política atual já está correta (usa EXISTS com appointments),
-- mas vamos garantir que está aplicada corretamente
-- A política "Professionals can view clients with appointments" já existe
-- e está correta, então não precisamos alterá-la.

-- ============================================================================
-- PARTE 5: AJUSTAR POLÍTICA DE APPOINTMENTS PARA CLIENTE
-- ============================================================================

-- A política atual verifica client_id = auth.uid(), mas precisamos garantir
-- que funciona corretamente quando clients.id = profiles.id
-- A política atual já está correta, mas vamos documentar melhor

-- Política atual já existe e está correta:
-- "Clients can view own appointments" usando client_id = auth.uid()
-- Como agora garantimos que clients.id = profiles.id = auth.uid(),
-- essa política funcionará perfeitamente.

-- ============================================================================
-- PARTE 6: FUNÇÃO AUXILIAR PARA OBTER CLINIC_ID DO USUÁRIO
-- ============================================================================

-- Função auxiliar para facilitar políticas RLS
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT clinic_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================';
  RAISE NOTICE '✅ CORREÇÕES DE AUTH E RLS APLICADAS!';
  RAISE NOTICE '✅ ============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 RESUMO DAS ALTERAÇÕES:';
  RAISE NOTICE '  1. ✅ Trigger criado: clients.id = profiles.id automaticamente';
  RAISE NOTICE '  2. ✅ Recepcionista: Acesso igual ao Admin em appointments e clients';
  RAISE NOTICE '  3. ✅ Cliente: Pode criar seu próprio registro em clients';
  RAISE NOTICE '  4. ✅ Função auxiliar: get_my_clinic_id() criada';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  RAISE NOTICE '  - Testar cadastro de cliente (deve criar clients automaticamente)';
  RAISE NOTICE '  - Testar login de cliente (deve acessar seus dados)';
  RAISE NOTICE '  - Testar permissões da recepcionista';
  RAISE NOTICE '';
END $$;

COMMIT;

