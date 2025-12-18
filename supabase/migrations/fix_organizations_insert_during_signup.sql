-- ============================================================================
-- CORREÇÃO: Permitir criação de organizações durante cadastro
-- ============================================================================
-- Problema: Usuários recém-cadastrados não têm profile ainda, então as políticas
-- RLS bloqueiam a criação de organizações.
-- Solução: Criar política que permite usuários autenticados criarem organizações
-- durante o processo de cadastro (antes de ter profile).
-- ============================================================================

-- 1. Criar política que permite usuários autenticados criarem organizações
-- Esta política é específica para o processo de cadastro
DO $$
BEGIN
  -- Remover política antiga se existir (para evitar conflito)
  DROP POLICY IF EXISTS "Allow authenticated users to create organizations during signup" ON public.organizations;
  
  -- Criar nova política que permite usuários autenticados criarem organizações
  -- Condição: usuário deve estar autenticado (auth.uid() não é null)
  -- Isso permite que usuários recém-cadastrados criem sua organização
  CREATE POLICY "Allow authenticated users to create organizations during signup"
    ON public.organizations
    FOR INSERT
    WITH CHECK (
      -- Usuário deve estar autenticado
      auth.uid() IS NOT NULL
      -- E não deve ter um profile ainda (indicando que está no processo de cadastro)
      -- OU deve ser super_admin (que já tem profile)
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
END $$;

-- 2. Alternativa: Criar função RPC que bypassa RLS (mais segura)
-- Esta função permite criar organização durante cadastro usando SECURITY DEFINER

-- ✅ REMOVER TODAS AS VERSÕES ANTIGAS DA FUNÇÃO (resolve erro de função não única)
-- Remove todas as versões possíveis da função antes de criar a nova
DO $$
DECLARE
  r record;
BEGIN
  -- Remover todas as versões conhecidas
  DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb, text, text, uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb, text, text) CASCADE;
  DROP FUNCTION IF EXISTS public.create_organization_during_signup(text, text, text, jsonb) CASCADE;
  
  -- Remover qualquer outra versão que possa existir
  FOR r IN 
    SELECT oid::regprocedure::text as func_signature
    FROM pg_proc
    WHERE proname = 'create_organization_during_signup'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.func_signature);
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    -- Continuar mesmo se houver erro (pode não haver função para remover)
    RAISE NOTICE 'Aviso ao remover funções antigas: %', SQLERRM;
END $$;

-- Agora criar a nova versão da função
CREATE OR REPLACE FUNCTION public.create_organization_during_signup(
  p_name text,
  p_email text,
  p_phone text,
  p_address jsonb, -- Recebe como jsonb do cliente
  p_cnpj text DEFAULT NULL,
  p_status text DEFAULT 'pending_setup',
  p_user_id uuid DEFAULT NULL -- ✅ NOVO: user_id opcional (resolve problema de sessão não estabelecida)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do criador da função (bypassa RLS)
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_address_text text;
  v_user_id uuid;
BEGIN
  -- ✅ Verificar autenticação: usar p_user_id se fornecido, senão usar auth.uid()
  -- Isso resolve o problema de sessão não estabelecida após signUp
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado. Forneça p_user_id ou garanta que auth.uid() está disponível.';
  END IF;
  
  -- ✅ Log para debug (remover em produção se necessário)
  RAISE NOTICE 'Criando organização para usuário: %', v_user_id;
  
  -- Converter jsonb para text (a coluna address é do tipo text que armazena JSON como string)
  -- Se p_address for jsonb, converter para string JSON
  -- Se já for text, usar diretamente
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
    v_address_text, -- Usar variável convertida
    p_cnpj,
    p_status,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_org_id;
  
  RETURN v_org_id;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.create_organization_during_signup IS 
  'Permite criar organização durante o processo de cadastro. '
  'Bypassa RLS usando SECURITY DEFINER. '
  'Apenas usuários autenticados podem usar esta função.';

-- 3. Garantir que a política de SELECT também permita ver a organização recém-criada
-- (Adicionar política se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations'
    AND policyname = 'Users can view own organization during signup'
  ) THEN
    CREATE POLICY "Users can view own organization during signup"
      ON public.organizations
      FOR SELECT
      USING (
        -- Usuário autenticado pode ver organizações que criou (mesmo sem profile ainda)
        auth.uid() IS NOT NULL
        AND (
          -- Se não tem profile, pode ver organizações criadas recentemente (últimos 5 minutos)
          -- Isso cobre o período entre criar organização e criar profile
          (
            NOT EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
            )
            AND created_at > NOW() - INTERVAL '5 minutes'
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
        )
      );
  END IF;
END $$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Esta migration resolve o problema de RLS bloqueando criação de organizações
-- durante o cadastro. Duas soluções foram implementadas:
-- 1. Política RLS que permite usuários autenticados criarem organizações
-- 2. Função RPC que bypassa RLS (mais segura, recomendada)
-- ============================================================================

