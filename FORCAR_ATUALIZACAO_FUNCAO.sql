-- ============================================================================
-- FORÇAR ATUALIZAÇÃO DA FUNÇÃO PARA POSTGREST RECONHECER
-- ============================================================================
-- Execute este script se a função existe mas o PostgREST retorna 404
-- Isso força o PostgREST a atualizar seu cache
-- ============================================================================

-- 1. Remover e recriar a função (força atualização do cache)
DROP FUNCTION IF EXISTS public.create_organization_during_signup(
  text, text, text, jsonb, text, text, uuid
);

-- 2. Recriar a função exatamente como na migration
CREATE OR REPLACE FUNCTION public.create_organization_during_signup(
  p_name text,
  p_email text,
  p_phone text,
  p_address jsonb,
  p_cnpj text DEFAULT NULL,
  p_status text DEFAULT 'pending_setup',
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_address_text text;
  v_user_id uuid;
BEGIN
  -- ✅ Verificar autenticação: usar p_user_id se fornecido, senão usar auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado. Forneça p_user_id ou garanta que auth.uid() está disponível.';
  END IF;
  
  -- ✅ Log para debug
  RAISE NOTICE 'Criando organização para usuário: %', v_user_id;
  
  -- Converter jsonb para text
  IF p_address IS NULL THEN
    v_address_text := NULL;
  ELSE
    v_address_text := p_address::text;
  END IF;
  
  -- Inserir organização
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

-- 3. Garantir permissões
GRANT EXECUTE ON FUNCTION public.create_organization_during_signup(
  text, text, text, jsonb, text, text, uuid
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_organization_during_signup(
  text, text, text, jsonb, text, text, uuid
) TO anon;

-- 4. Verificar se foi criada corretamente
SELECT 
  proname as nome_funcao,
  prosecdef as tem_security_definer,
  pg_get_function_identity_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'create_organization_during_signup';

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar:
-- 1. Aguarde 10-30 segundos para o PostgREST atualizar o cache
-- 2. Teste o cadastro novamente
-- 3. Se ainda não funcionar, reinicie o projeto no Supabase Dashboard
--    (Settings → Restart Project)
-- ============================================================================

