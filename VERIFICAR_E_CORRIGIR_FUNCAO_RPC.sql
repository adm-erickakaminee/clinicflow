-- ============================================================================
-- SCRIPT COMPLETO: Verificar e Corrigir Função RPC
-- ============================================================================
-- Execute este script no Supabase SQL Editor
-- Ele vai verificar e corrigir automaticamente qualquer problema
-- ============================================================================

-- PASSO 1: Remover função antiga se existir (para recriar corretamente)
DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.create_organization_during_signup;

-- PASSO 2: Recriar função com SECURITY DEFINER (CRÍTICO)
CREATE OR REPLACE FUNCTION public.create_organization_during_signup(
  p_name text,
  p_email text,
  p_phone text,
  p_address jsonb,
  p_cnpj text DEFAULT NULL,
  p_status text DEFAULT 'pending_setup'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ CRÍTICO: Deve ter SECURITY DEFINER para bypassar RLS
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_address_text text;
BEGIN
  -- Verificar se usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Converter jsonb para text (a coluna address é do tipo text que armazena JSON como string)
  IF p_address IS NULL THEN
    v_address_text := NULL;
  ELSE
    v_address_text := p_address::text;
  END IF;
  
  -- Inserir organização (bypassa RLS por causa de SECURITY DEFINER)
  INSERT INTO public.organizations (
    name,
    email,
    phone,
    address,
    cnpj,
    status,
    created_at,
    updated_at
  )
  VALUES (
    p_name,
    p_email,
    p_phone,
    v_address_text,
    p_cnpj,
    p_status,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_org_id;
  
  RETURN v_org_id;
END;
$$;

-- PASSO 3: Garantir permissões (CRÍTICO)
GRANT EXECUTE ON FUNCTION public.create_organization_during_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_during_signup TO anon;
GRANT EXECUTE ON FUNCTION public.create_organization_during_signup TO service_role;

-- PASSO 4: Adicionar comentário
COMMENT ON FUNCTION public.create_organization_during_signup IS 
  'Permite criar organização durante o processo de cadastro. '
  'Bypassa RLS usando SECURITY DEFINER. '
  'Apenas usuários autenticados podem usar esta função.';

-- PASSO 5: Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow authenticated users to create organizations during signup" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own organization during signup" ON public.organizations;

-- PASSO 6: Criar política de INSERT (backup, caso função não seja usada)
CREATE POLICY "Allow authenticated users to create organizations during signup"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
      )
    )
  );

-- PASSO 7: Criar política de SELECT (permite ver organização recém-criada)
CREATE POLICY "Users can view own organization during signup"
  ON public.organizations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      (
        NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
        )
        AND created_at > NOW() - INTERVAL '5 minutes'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.clinic_id = organizations.id
          OR p.role = 'super_admin'
        )
      )
    )
  );

-- PASSO 8: Verificar se tudo foi criado corretamente
DO $$
DECLARE
  v_func_exists boolean;
  v_func_security_definer boolean;
  v_policy_insert_exists boolean;
  v_policy_select_exists boolean;
BEGIN
  -- Verificar função
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_organization_during_signup'
  ) INTO v_func_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_organization_during_signup'
    AND prosecdef = true
  ) INTO v_func_security_definer;
  
  -- Verificar políticas
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'organizations'
    AND policyname = 'Allow authenticated users to create organizations during signup'
  ) INTO v_policy_insert_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'organizations'
    AND policyname = 'Users can view own organization during signup'
  ) INTO v_policy_select_exists;
  
  -- Reportar resultados
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO DA VERIFICAÇÃO:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Função existe: %', CASE WHEN v_func_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE 'Função tem SECURITY DEFINER: %', CASE WHEN v_func_security_definer THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE 'Política INSERT existe: %', CASE WHEN v_policy_insert_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE 'Política SELECT existe: %', CASE WHEN v_policy_select_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '========================================';
  
  IF NOT v_func_exists THEN
    RAISE EXCEPTION '❌ ERRO: Função não foi criada!';
  END IF;
  
  IF NOT v_func_security_definer THEN
    RAISE EXCEPTION '❌ ERRO: Função não tem SECURITY DEFINER!';
  END IF;
  
  RAISE NOTICE '✅ TUDO CONFIGURADO CORRETAMENTE!';
END $$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar, você deve ver:
-- - ✅ Função existe: ✅ SIM
-- - ✅ Função tem SECURITY DEFINER: ✅ SIM
-- - ✅ Política INSERT existe: ✅ SIM
-- - ✅ Política SELECT existe: ✅ SIM
-- - ✅ TUDO CONFIGURADO CORRETAMENTE!
-- ============================================================================

