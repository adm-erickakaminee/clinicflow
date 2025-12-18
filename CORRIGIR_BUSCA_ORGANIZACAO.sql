-- ============================================================================
-- CORRIGIR BUSCA DE ORGANIZAÇÃO: Função RPC + Política de SELECT
-- ============================================================================
-- Execute este script para resolver o problema de buscar organização após criação
-- ============================================================================

-- 1. Criar função RPC para buscar organização (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_organization_by_id(
  p_org_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  address text,
  cnpj text,
  status text,
  asaas_customer_id text,
  asaas_wallet_id text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Retornar organização (bypassa RLS por causa de SECURITY DEFINER)
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.email,
    o.phone,
    o.address,
    o.cnpj,
    o.status,
    o.asaas_customer_id,
    o.asaas_wallet_id,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.id = p_org_id;
  
  -- Verificar se encontrou algo
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organização não encontrada: %', p_org_id;
  END IF;
END;
$$;

-- 2. Garantir permissões da função RPC
GRANT EXECUTE ON FUNCTION public.get_organization_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_by_id(uuid) TO anon;

-- 3. Corrigir política de SELECT
DROP POLICY IF EXISTS "Users can view own organization during signup" ON public.organizations;

CREATE POLICY "Users can view own organization during signup"
  ON public.organizations
  FOR SELECT
  USING (
    -- Usuário autenticado pode ver organizações
    auth.uid() IS NOT NULL
    AND (
      -- Se não tem profile ainda, pode ver organizações criadas recentemente (últimos 10 minutos)
      (
        NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
        )
        AND created_at > NOW() - INTERVAL '10 minutes'
      )
      -- OU se tem profile, segue as políticas normais
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.clinic_id = organizations.id
          OR p.role = 'super_admin'
        )
      )
      -- OU se o usuário acabou de criar (verificação por email)
      OR (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND created_at > NOW() - INTERVAL '10 minutes'
      )
    )
  );

-- 4. Verificar se tudo foi criado
SELECT 
  'Função RPC get_organization_by_id' as item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_organization_by_id'
  ) THEN '✅ Criada' ELSE '❌ Não criada' END as status
UNION ALL
SELECT 
  'Política SELECT durante signup' as item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations'
    AND policyname = 'Users can view own organization during signup'
  ) THEN '✅ Criada' ELSE '❌ Não criada' END as status;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar, aguarde 10-30 segundos e teste o cadastro novamente
-- ============================================================================

