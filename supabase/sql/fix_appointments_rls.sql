-- Script para corrigir políticas RLS da tabela appointments
-- Execute este script no Supabase SQL Editor

-- 1. Garantir que RLS está habilitado
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas se existirem (opcional, apenas se necessário)
-- DROP POLICY IF EXISTS "Allow authenticated users to select appointments" ON public.appointments;
-- DROP POLICY IF EXISTS "Allow org members select appointments" ON public.appointments;

-- 3. Criar política para SELECT (leitura) - permite que usuários autenticados vejam agendamentos da sua organização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appointments' 
    AND policyname = 'Allow org members select appointments'
  ) THEN
    CREATE POLICY "Allow org members select appointments"
    ON public.appointments
    FOR SELECT
    TO authenticated
    USING (
      -- Permite ver agendamentos da mesma organização do usuário
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.organization_id = appointments.organization_id
          OR p.organization_id = appointments.clinic_id
        )
      )
      -- Ou se o usuário é super_admin (pode ver todos)
      OR (
        SELECT role FROM public.profiles WHERE id = auth.uid()
      ) = 'super_admin'
    );
  END IF;
END $$;

-- 4. Criar política para INSERT (criação) - permite que usuários autenticados criem agendamentos na sua organização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appointments' 
    AND policyname = 'Allow org members insert appointments'
  ) THEN
    CREATE POLICY "Allow org members insert appointments"
    ON public.appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- Permite criar agendamentos na mesma organização do usuário
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.organization_id = appointments.organization_id
          OR p.organization_id = appointments.clinic_id
        )
      )
      -- Ou se o usuário é super_admin (pode criar em qualquer organização)
      OR (
        SELECT role FROM public.profiles WHERE id = auth.uid()
      ) = 'super_admin'
    );
  END IF;
END $$;

-- 5. Criar política para UPDATE (atualização) - permite que usuários autenticados atualizem agendamentos da sua organização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appointments' 
    AND policyname = 'Allow org members update appointments'
  ) THEN
    CREATE POLICY "Allow org members update appointments"
    ON public.appointments
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.organization_id = appointments.organization_id
          OR p.organization_id = appointments.clinic_id
        )
      )
      OR (
        SELECT role FROM public.profiles WHERE id = auth.uid()
      ) = 'super_admin'
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.organization_id = appointments.organization_id
          OR p.organization_id = appointments.clinic_id
        )
      )
      OR (
        SELECT role FROM public.profiles WHERE id = auth.uid()
      ) = 'super_admin'
    );
  END IF;
END $$;

-- 6. Criar política para DELETE (exclusão) - permite que usuários autenticados excluam agendamentos da sua organização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appointments' 
    AND policyname = 'Allow org members delete appointments'
  ) THEN
    CREATE POLICY "Allow org members delete appointments"
    ON public.appointments
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.organization_id = appointments.organization_id
          OR p.organization_id = appointments.clinic_id
        )
      )
      OR (
        SELECT role FROM public.profiles WHERE id = auth.uid()
      ) = 'super_admin'
    );
  END IF;
END $$;

-- 7. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'appointments'
ORDER BY policyname;
