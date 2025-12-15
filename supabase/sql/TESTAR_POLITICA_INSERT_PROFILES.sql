-- ============================================================================
-- TESTE: Verificar se as políticas de INSERT estão funcionando
-- ============================================================================

-- Verificar usuário atual e suas permissões
DO $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  current_user_clinic_id uuid;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum usuário autenticado. Faça login primeiro.';
  ELSE
    SELECT p.role, p.clinic_id
    INTO current_user_role, current_user_clinic_id
    FROM public.profiles p
    WHERE p.id = current_user_id;
    
    IF current_user_role IS NULL THEN
      RAISE NOTICE '⚠️ Profile não encontrado para o usuário: %', current_user_id;
      RAISE NOTICE '⚠️ Você precisa ter um profile para testar as políticas.';
    ELSE
      RAISE NOTICE '✅ Usuário autenticado: %', current_user_id;
      RAISE NOTICE '✅ Role: %', current_user_role;
      RAISE NOTICE '✅ Clinic ID: %', current_user_clinic_id;
      
      IF current_user_role = 'super_admin' THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Super admin detectado!';
        RAISE NOTICE '✅ Você TEM permissão para criar profiles para QUALQUER clínica';
      ELSIF current_user_role IN ('admin', 'clinic_owner') AND current_user_clinic_id IS NOT NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Admin detectado!';
        RAISE NOTICE '✅ Você TEM permissão para criar profiles para a clínica: %', current_user_clinic_id;
        RAISE NOTICE '⚠️ IMPORTANTE: Ao criar um profile, o clinic_id deve ser: %', current_user_clinic_id;
      ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ Role: % - NÃO tem permissão para criar profiles', current_user_role;
        RAISE NOTICE '⚠️ Clinic ID: %', current_user_clinic_id;
      END IF;
    END IF;
  END IF;
END
$$;

-- Verificar detalhes das políticas de INSERT
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================================================
-- NOTA: Se você é admin e está tentando criar um profile, certifique-se de que:
-- 1. O clinic_id do profile que você está criando é IGUAL ao seu clinic_id
-- 2. Você está logado como admin (não como outro tipo de usuário)
-- ============================================================================
