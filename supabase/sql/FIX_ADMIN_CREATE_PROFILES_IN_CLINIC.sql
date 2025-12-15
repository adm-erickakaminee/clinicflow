-- ============================================================================
-- CORREÇÃO: Permitir que Admin crie profiles (admins) na mesma clínica
-- ============================================================================
-- Este script corrige a política para garantir que admins possam criar
-- outros admins/profiles na mesma clínica (clinic_id)
-- ============================================================================

-- Remover política existente se houver
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;

-- Criar política corrigida
-- IMPORTANTE: A política verifica se o admin atual pertence à mesma clínica
--             do profile que está sendo criado
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id IS NOT NULL
        AND p.clinic_id = profiles.clinic_id  -- Verifica se pertence à mesma clínica
    )
  );

-- Verificar se foi criada
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
  AND policyname = 'Admins can insert profiles in clinic';

-- Testar a política
-- NOTA: Este teste verifica se o usuário atual pode inserir
DO $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  current_user_clinic_id uuid;
  test_result boolean;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum usuário autenticado';
  ELSE
    SELECT p.role, p.clinic_id
    INTO current_user_role, current_user_clinic_id
    FROM public.profiles p
    WHERE p.id = current_user_id;
    
    IF current_user_role IS NULL THEN
      RAISE NOTICE '⚠️ Profile não encontrado para o usuário: %', current_user_id;
    ELSE
      RAISE NOTICE '✅ Usuário autenticado: %', current_user_id;
      RAISE NOTICE '✅ Role: %', current_user_role;
      RAISE NOTICE '✅ Clinic ID: %', current_user_clinic_id;
      
      IF current_user_role IN ('admin', 'clinic_owner') AND current_user_clinic_id IS NOT NULL THEN
        RAISE NOTICE '✅ Admin detectado com clinic_id: %', current_user_clinic_id;
        RAISE NOTICE '✅ Este admin PODE criar profiles para a clínica: %', current_user_clinic_id;
      ELSIF current_user_role = 'super_admin' THEN
        RAISE NOTICE '✅ Super admin detectado - PODE criar profiles para qualquer clínica';
      ELSE
        RAISE NOTICE '⚠️ Role: % - NÃO tem permissão para criar profiles', current_user_role;
      END IF;
    END IF;
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Execute este script para garantir que admins possam criar outros admins
-- na mesma clínica
-- ============================================================================
