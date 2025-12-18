-- ============================================================================
-- FUNÇÃO RPC: Buscar organização por ID (bypassa RLS)
-- ============================================================================
-- Esta função permite buscar uma organização mesmo sem política de SELECT
-- Útil durante o processo de cadastro quando o usuário ainda não tem profile
-- ============================================================================

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

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_organization_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_by_id(uuid) TO anon;

-- Comentário
COMMENT ON FUNCTION public.get_organization_by_id IS 
  'Busca uma organização por ID, bypassando RLS. '
  'Útil durante o processo de cadastro quando o usuário ainda não tem profile.';

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================

