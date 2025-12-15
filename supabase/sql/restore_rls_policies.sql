-- ============================================================================
-- SCRIPT 2: RESTAURAÇÃO COMPLETA DE RLS (APÓS LOGIN FUNCIONAR)
-- ============================================================================
-- Execute este script APÓS o login funcionar corretamente
-- Este script restaura a segurança RLS em todas as tabelas com políticas
-- não-recursivas e baseadas em clinic_id
-- ============================================================================

-- ============================================================================
-- 1. PROFILES - Habilitar RLS e criar política não-recursiva
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que podem causar recursão
DROP POLICY IF EXISTS "Allow authenticated users to select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow org members select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;

-- Criar política SIMPLES para SELECT (sem recursão)
-- Permite que usuários vejam seu próprio perfil sem consultar a tabela profiles novamente
CREATE POLICY "Read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Permite ver o próprio perfil usando apenas auth.uid() (sem consultar profiles)
  id = auth.uid()
);

-- Criar política para INSERT (criação de perfil)
CREATE POLICY "Insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite inserir perfil apenas para si mesmo
  id = auth.uid()
);

-- Criar política para UPDATE (atualização de perfil)
CREATE POLICY "Update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Permite atualizar apenas o próprio perfil
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- ============================================================================
-- 2. APPOINTMENTS - Políticas baseadas em clinic_id
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Allow org members select appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow org members insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow org members update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow org members delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Select appointments by clinic" ON public.appointments;
DROP POLICY IF EXISTS "Insert appointments by clinic" ON public.appointments;

-- Criar política para SELECT (leitura)
CREATE POLICY "Select appointments by clinic"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  -- Permite ver agendamentos da mesma clínica do usuário
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  -- Ou se o agendamento tem organization_id que corresponde ao clinic_id do usuário
  OR organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Criar política para INSERT (criação)
CREATE POLICY "Insert appointments by clinic"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite criar agendamentos na mesma clínica do usuário
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  -- Ou se organization_id corresponde ao clinic_id do usuário
  OR organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Criar política para UPDATE (atualização)
CREATE POLICY "Update appointments by clinic"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Criar política para DELETE (exclusão)
CREATE POLICY "Delete appointments by clinic"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 3. PROFESSIONALS - Políticas baseadas em clinic_id
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Select professionals by clinic" ON public.professionals;
DROP POLICY IF EXISTS "Insert professionals by clinic" ON public.professionals;
DROP POLICY IF EXISTS "Update professionals by clinic" ON public.professionals;
DROP POLICY IF EXISTS "Delete professionals by clinic" ON public.professionals;

-- Criar política para SELECT (leitura)
CREATE POLICY "Select professionals by clinic"
ON public.professionals
FOR SELECT
TO authenticated
USING (
  -- Permite ver profissionais da mesma clínica do usuário
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Criar política para INSERT (criação)
CREATE POLICY "Insert professionals by clinic"
ON public.professionals
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite criar profissionais na mesma clínica do usuário
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Criar política para UPDATE (atualização)
CREATE POLICY "Update professionals by clinic"
ON public.professionals
FOR UPDATE
TO authenticated
USING (
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Criar política para DELETE (exclusão)
CREATE POLICY "Delete professionals by clinic"
ON public.professionals
FOR DELETE
TO authenticated
USING (
  clinic_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 4. SERVICES - Políticas baseadas em clinic_id (organization_id)
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Select services by clinic" ON public.services;
DROP POLICY IF EXISTS "Insert services by clinic" ON public.services;
DROP POLICY IF EXISTS "Update services by clinic" ON public.services;
DROP POLICY IF EXISTS "Delete services by clinic" ON public.services;

-- Criar política para SELECT (leitura)
CREATE POLICY "Select services by clinic"
ON public.services
FOR SELECT
TO authenticated
USING (
  -- Permite ver serviços da mesma clínica do usuário
  -- services usa organization_id como identificador da clínica
  organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  -- Ou se services também tem clinic_id
  OR (
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'services' 
      AND column_name = 'clinic_id'
    )
    AND clinic_id = (
      SELECT clinic_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

-- Criar política para INSERT (criação)
CREATE POLICY "Insert services by clinic"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite criar serviços na mesma clínica do usuário
  organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR (
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'services' 
      AND column_name = 'clinic_id'
    )
    AND clinic_id = (
      SELECT clinic_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

-- Criar política para UPDATE (atualização)
CREATE POLICY "Update services by clinic"
ON public.services
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR (
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'services' 
      AND column_name = 'clinic_id'
    )
    AND clinic_id = (
      SELECT clinic_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR (
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'services' 
      AND column_name = 'clinic_id'
    )
    AND clinic_id = (
      SELECT clinic_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

-- Criar política para DELETE (exclusão)
CREATE POLICY "Delete services by clinic"
ON public.services
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR (
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'services' 
      AND column_name = 'clinic_id'
    )
    AND clinic_id = (
      SELECT clinic_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
-- Verificar políticas criadas

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'appointments', 'professionals', 'services')
ORDER BY tablename, policyname;

-- ============================================================================
-- FIM DO SCRIPT 2
-- ============================================================================
-- Após executar este script, todas as tabelas terão RLS habilitado com
-- políticas seguras baseadas em clinic_id, sem recursão infinita.
-- ============================================================================
