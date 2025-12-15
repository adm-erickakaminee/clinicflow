-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Por que não consigo criar profiles?
-- ============================================================================

-- 1. Verificar usuário atual
SELECT 
  auth.uid() as user_id_atual;

-- 2. Verificar profile do usuário atual
SELECT 
  id,
  full_name,
  role,
  clinic_id
FROM public.profiles
WHERE id = auth.uid();

-- 3. Verificar se o usuário atual tem permissão
DO $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  current_user_clinic_id uuid;
  is_super_admin boolean := false;
  is_admin boolean := false;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '❌ ERRO: Nenhum usuário autenticado!';
    RAISE NOTICE '💡 SOLUÇÃO: Faça login no aplicativo primeiro.';
    RETURN;
  END IF;
  
  SELECT p.role, p.clinic_id
  INTO current_user_role, current_user_clinic_id
  FROM public.profiles p
  WHERE p.id = current_user_id;
  
  IF current_user_role IS NULL THEN
    RAISE NOTICE '❌ ERRO: Profile não encontrado para o usuário: %', current_user_id;
    RAISE NOTICE '💡 SOLUÇÃO: Você precisa ter um profile criado primeiro.';
    RETURN;
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 INFORMAÇÕES DO USUÁRIO ATUAL';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'User ID: %', current_user_id;
  RAISE NOTICE 'Role: %', current_user_role;
  RAISE NOTICE 'Clinic ID: %', current_user_clinic_id;
  RAISE NOTICE '';
  
  -- Verificar se é super_admin
  IF current_user_role = 'super_admin' THEN
    is_super_admin := true;
    RAISE NOTICE '✅ Você é SUPER_ADMIN';
    RAISE NOTICE '✅ Você PODE criar profiles para QUALQUER clínica';
    RAISE NOTICE '';
    RAISE NOTICE '💡 POLÍTICA APLICADA: "Super admin can insert any profile"';
  ELSIF current_user_role IN ('admin', 'clinic_owner') THEN
    is_admin := true;
    IF current_user_clinic_id IS NULL THEN
      RAISE NOTICE '❌ ERRO: Você é admin mas NÃO tem clinic_id!';
      RAISE NOTICE '💡 SOLUÇÃO: Seu profile precisa ter clinic_id vinculado.';
      RETURN;
    END IF;
    RAISE NOTICE '✅ Você é ADMIN da clínica: %', current_user_clinic_id;
    RAISE NOTICE '✅ Você PODE criar profiles para a clínica: %', current_user_clinic_id;
    RAISE NOTICE '';
    RAISE NOTICE '💡 POLÍTICA APLICADA: "Admins can insert profiles in clinic"';
    RAISE NOTICE '⚠️ IMPORTANTE: O clinic_id do profile que você criar DEVE ser: %', current_user_clinic_id;
  ELSE
    RAISE NOTICE '❌ ERRO: Seu role é: %', current_user_role;
    RAISE NOTICE '❌ Você NÃO tem permissão para criar profiles!';
    RAISE NOTICE '💡 SOLUÇÃO: Apenas super_admin, admin ou clinic_owner podem criar profiles.';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ TESTE: Você DEVE ter permissão para criar profiles!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
END
$$;

-- 4. Verificar políticas de INSERT existentes
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY 
  CASE 
    WHEN policyname LIKE '%Super admin%' THEN 1
    WHEN policyname LIKE '%Admins%' THEN 2
    ELSE 3
  END;

-- 5. Testar se a política funciona (simulação)
-- NOTA: Este é apenas um teste, não cria nada de verdade
DO $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  current_user_clinic_id uuid;
  test_clinic_id uuid;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  SELECT p.role, p.clinic_id
  INTO current_user_role, current_user_clinic_id
  FROM public.profiles p
  WHERE p.id = current_user_id;
  
  IF current_user_role IS NULL THEN
    RAISE NOTICE '❌ Não é possível testar: profile não encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🧪 TESTE DE PERMISSÃO';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF current_user_role = 'super_admin' THEN
    RAISE NOTICE '✅ Como super_admin, você pode criar profiles com QUALQUER clinic_id';
    RAISE NOTICE '✅ A política "Super admin can insert any profile" deve permitir';
  ELSIF current_user_role IN ('admin', 'clinic_owner') AND current_user_clinic_id IS NOT NULL THEN
    RAISE NOTICE '✅ Como admin da clínica %, você pode criar profiles com clinic_id = %', current_user_clinic_id, current_user_clinic_id;
    RAISE NOTICE '⚠️ Se você tentar criar um profile com clinic_id diferente, será BLOQUEADO';
    RAISE NOTICE '✅ A política "Admins can insert profiles in clinic" deve permitir apenas quando:';
    RAISE NOTICE '   - profiles.clinic_id = seu clinic_id (%)', current_user_clinic_id;
  ELSE
    RAISE NOTICE '❌ Você não tem permissão para criar profiles';
  END IF;
  
END
$$;

-- ============================================================================
-- ✅ FIM DO DIAGNÓSTICO
-- ============================================================================
