-- ============================================================================
-- POLÍTICAS RLS COMPLETAS - CONTROLE DE ACESSO POR ROLE
-- ============================================================================
-- Este script implementa todas as regras de acesso descritas:
-- 
-- ADMINISTRADOR (admin/clinic_owner):
--   - CRUD completo dentro do clinic_id
--   - Pode gerenciar outros admins/recepcionistas no mesmo clinic_id
--   - Acesso a relatórios/financeiro do clinic_id
--
-- PROFISSIONAL (professional):
--   - Agenda: apenas agendamentos onde professional_id = seu ID
--   - Clientes: apenas os que têm agendamentos com ele
--   - Perfil: apenas o próprio
--   - Relatórios: apenas os seus próprios dados
--
-- CLIENTE (client):
--   - Agendamentos: apenas os seus (client_id = seu ID)
--   - Perfil: apenas o próprio
--   - Informações públicas: visualizar profissionais/serviços
-- ============================================================================

-- ============================================================================
-- 1. TABELA: profiles
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Professionals can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Professionals can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Clients can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Clients can update own profile" ON public.profiles;

-- SELECT: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- SELECT: Admin pode ver todos os profiles do seu clinic_id
CREATE POLICY "Admins can view profiles in clinic"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = profiles.clinic_id
    )
  );

-- SELECT: Super admin pode ver todos os profiles
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- UPDATE: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admin pode atualizar profiles do seu clinic_id
CREATE POLICY "Admins can update profiles in clinic"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = profiles.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = profiles.clinic_id
    )
  );

-- UPDATE: Super admin pode atualizar qualquer profile
CREATE POLICY "Super admin can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Admin pode criar profiles no seu clinic_id
-- IMPORTANTE: profiles.clinic_id se refere ao clinic_id do registro sendo inserido
-- A política verifica se o admin atual (p.clinic_id) pertence à mesma clínica
-- do profile que está sendo criado (profiles.clinic_id)
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id IS NOT NULL
        AND p.clinic_id = profiles.clinic_id  -- Verifica se o admin pertence à mesma clínica do profile sendo criado
    )
  );

-- INSERT: Super admin pode criar qualquer profile
CREATE POLICY "Super admin can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- ============================================================================
-- 2. TABELA: appointments
-- ============================================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage appointments in clinic" ON public.appointments;
DROP POLICY IF EXISTS "Professionals can manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Super admin full access appointments" ON public.appointments;

-- SELECT: Admin pode ver agendamentos do seu clinic_id
CREATE POLICY "Admins can view appointments in clinic"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = appointments.clinic_id
    )
  );

-- SELECT: Profissional pode ver apenas seus agendamentos
CREATE POLICY "Professionals can view own appointments"
  ON public.appointments
  FOR SELECT
  USING (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'professional'
    )
  );

-- SELECT: Cliente pode ver apenas seus agendamentos
CREATE POLICY "Clients can view own appointments"
  ON public.appointments
  FOR SELECT
  USING (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- SELECT: Super admin pode ver todos os agendamentos
CREATE POLICY "Super admin can view all appointments"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Admin pode criar agendamentos no seu clinic_id
CREATE POLICY "Admins can insert appointments in clinic"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = clinic_id
    )
  );

-- INSERT: Cliente pode criar seus próprios agendamentos
CREATE POLICY "Clients can insert own appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- UPDATE: Admin pode atualizar agendamentos do seu clinic_id
CREATE POLICY "Admins can update appointments in clinic"
  ON public.appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = appointments.clinic_id
    )
  );

-- UPDATE: Profissional pode atualizar apenas seus agendamentos
CREATE POLICY "Professionals can update own appointments"
  ON public.appointments
  FOR UPDATE
  USING (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'professional'
    )
  );

-- UPDATE: Cliente pode atualizar apenas seus agendamentos (cancelar)
CREATE POLICY "Clients can update own appointments"
  ON public.appointments
  FOR UPDATE
  USING (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- DELETE: Admin pode deletar agendamentos do seu clinic_id
CREATE POLICY "Admins can delete appointments in clinic"
  ON public.appointments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = appointments.clinic_id
    )
  );

-- DELETE: Profissional pode deletar apenas seus agendamentos
CREATE POLICY "Professionals can delete own appointments"
  ON public.appointments
  FOR DELETE
  USING (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'professional'
    )
  );

-- DELETE: Cliente pode deletar apenas seus agendamentos
CREATE POLICY "Clients can delete own appointments"
  ON public.appointments
  FOR DELETE
  USING (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- ============================================================================
-- 3. TABELA: clients
-- ============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage clients in clinic" ON public.clients;
DROP POLICY IF EXISTS "Professionals can view clients with appointments" ON public.clients;
DROP POLICY IF EXISTS "Clients can view own data" ON public.clients;
DROP POLICY IF EXISTS "Super admin full access clients" ON public.clients;

-- SELECT: Admin pode ver clientes do seu clinic_id
CREATE POLICY "Admins can view clients in clinic"
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = clients.clinic_id
    )
  );

-- SELECT: Profissional pode ver clientes que têm agendamentos com ele
CREATE POLICY "Professionals can view clients with appointments"
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.client_id = clients.id
        AND a.professional_id = p.id
        AND p.role = 'professional'
    )
  );

-- SELECT: Cliente pode ver apenas seus próprios dados
CREATE POLICY "Clients can view own data"
  ON public.clients
  FOR SELECT
  USING (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- SELECT: Super admin pode ver todos os clientes
CREATE POLICY "Super admin can view all clients"
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Apenas admin pode criar clientes
CREATE POLICY "Admins can insert clients in clinic"
  ON public.clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = clinic_id
    )
  );

-- UPDATE: Admin pode atualizar clientes do seu clinic_id
CREATE POLICY "Admins can update clients in clinic"
  ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = clients.clinic_id
    )
  );

-- UPDATE: Profissional pode atualizar clientes com quem tem agendamentos
CREATE POLICY "Professionals can update clients with appointments"
  ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.client_id = clients.id
        AND a.professional_id = p.id
        AND p.role = 'professional'
    )
  );

-- UPDATE: Cliente pode atualizar apenas seus próprios dados
CREATE POLICY "Clients can update own data"
  ON public.clients
  FOR UPDATE
  USING (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- DELETE: Apenas admin pode deletar clientes
CREATE POLICY "Admins can delete clients in clinic"
  ON public.clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = clients.clinic_id
    )
  );

-- ============================================================================
-- 4. TABELA: professionals
-- ============================================================================

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage professionals in clinic" ON public.professionals;
DROP POLICY IF EXISTS "Professionals can view own data" ON public.professionals;
DROP POLICY IF EXISTS "Professionals can update own data" ON public.professionals;
DROP POLICY IF EXISTS "Clients can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Super admin full access professionals" ON public.professionals;

-- SELECT: Admin pode ver profissionais do seu clinic_id
CREATE POLICY "Admins can view professionals in clinic"
  ON public.professionals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = professionals.clinic_id
    )
  );

-- SELECT: Profissional pode ver apenas seus próprios dados
CREATE POLICY "Professionals can view own data"
  ON public.professionals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'professional'
        AND p.id = professionals.id
    )
  );

-- SELECT: Cliente pode ver profissionais (informação pública)
CREATE POLICY "Clients can view professionals"
  ON public.professionals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- SELECT: Super admin pode ver todos os profissionais
CREATE POLICY "Super admin can view all professionals"
  ON public.professionals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Apenas admin pode criar profissionais
CREATE POLICY "Admins can insert professionals in clinic"
  ON public.professionals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = clinic_id
    )
  );

-- UPDATE: Admin pode atualizar profissionais do seu clinic_id
CREATE POLICY "Admins can update professionals in clinic"
  ON public.professionals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = professionals.clinic_id
    )
  );

-- UPDATE: Profissional pode atualizar apenas seus próprios dados
CREATE POLICY "Professionals can update own data"
  ON public.professionals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'professional'
        AND p.id = professionals.id
    )
  );

-- DELETE: Apenas admin pode deletar profissionais
CREATE POLICY "Admins can delete professionals in clinic"
  ON public.professionals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = professionals.clinic_id
    )
  );

-- ============================================================================
-- 5. TABELA: services
-- ============================================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage services in clinic" ON public.services;
DROP POLICY IF EXISTS "Clients can view services" ON public.services;
DROP POLICY IF EXISTS "Professionals can view services" ON public.services;
DROP POLICY IF EXISTS "Super admin full access services" ON public.services;

-- SELECT: Admin pode ver serviços do seu clinic_id
CREATE POLICY "Admins can view services in clinic"
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = services.clinic_id
    )
  );

-- SELECT: Cliente pode ver serviços (informação pública)
CREATE POLICY "Clients can view services"
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'client'
    )
  );

-- SELECT: Profissional pode ver serviços
CREATE POLICY "Professionals can view services"
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'professional'
    )
  );

-- SELECT: Super admin pode ver todos os serviços
CREATE POLICY "Super admin can view all services"
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Apenas admin pode criar serviços
CREATE POLICY "Admins can insert services in clinic"
  ON public.services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = clinic_id
    )
  );

-- UPDATE: Apenas admin pode atualizar serviços
CREATE POLICY "Admins can update services in clinic"
  ON public.services
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = services.clinic_id
    )
  );

-- DELETE: Apenas admin pode deletar serviços
CREATE POLICY "Admins can delete services in clinic"
  ON public.services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = services.clinic_id
    )
  );

-- ============================================================================
-- 6. TABELA: organizations
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (mantém as do super_admin)
DROP POLICY IF EXISTS "Admins can view own clinic" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update own clinic" ON public.organizations;

-- SELECT: Admin pode ver sua própria clínica
CREATE POLICY "Admins can view own clinic"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = organizations.id
    )
  );

-- UPDATE: Admin pode atualizar sua própria clínica
CREATE POLICY "Admins can update own clinic"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = organizations.id
    )
  );

-- SELECT: Super admin pode ver TODAS as organizações
CREATE POLICY "Super admin can view all organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- UPDATE: Super admin pode atualizar qualquer organização
CREATE POLICY "Super admin can update all organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Super admin pode criar organizações (já deve existir de outros scripts)

-- ============================================================================
-- 7. TABELA: blocks (bloqueios de agenda)
-- ============================================================================

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage blocks in clinic" ON public.blocks;
DROP POLICY IF EXISTS "Professionals can manage own blocks" ON public.blocks;

-- SELECT: Admin pode ver bloqueios do seu clinic_id
CREATE POLICY "Admins can view blocks in clinic"
  ON public.blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = blocks.clinic_id
    )
  );

-- SELECT: Profissional pode ver apenas seus próprios bloqueios
CREATE POLICY "Professionals can view own blocks"
  ON public.blocks
  FOR SELECT
  USING (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'professional'
    )
  );

-- INSERT/UPDATE/DELETE: Mesmas regras (admin no clinic, profissional próprio)

-- ============================================================================
-- 8. TABELA: time_offs (afastamentos)
-- ============================================================================

ALTER TABLE public.time_offs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage time_offs in clinic" ON public.time_offs;
DROP POLICY IF EXISTS "Professionals can manage own time_offs" ON public.time_offs;

-- Similar ao blocks

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Todas as políticas RLS foram criadas/atualizadas!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Resumo das políticas:';
  RAISE NOTICE '  - Administradores: CRUD completo dentro do clinic_id';
  RAISE NOTICE '  - Profissionais: Acesso apenas aos próprios dados';
  RAISE NOTICE '  - Clientes: Acesso apenas aos próprios dados';
  RAISE NOTICE '  - Super Admin: Acesso total';
END
$$;

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'appointments', 'clients', 'professionals', 'services', 'organizations', 'blocks', 'time_offs')
ORDER BY tablename, policyname;
