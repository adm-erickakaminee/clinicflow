-- ============================================================================
-- MIGRAÇÃO: Sistema de Assinatura e Monetização
-- ============================================================================
-- Estrutura completa para gerenciar planos, assinaturas e acesso gated
-- ============================================================================

-- 1. ATUALIZAR STATUS DA ORGANIZAÇÃO
DO $$
BEGIN
  -- Adicionar campo status se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN status TEXT DEFAULT 'pending_setup';
    
    -- Atualizar registros existentes para 'active' (compatibilidade)
    UPDATE public.organizations
    SET status = 'active'
    WHERE status IS NULL;
    
    -- Adicionar constraint
    ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_status_check 
    CHECK (status IN ('pending_setup', 'active', 'suspended', 'cancelled'));
    
    RAISE NOTICE '✅ Campo status adicionado em organizations';
  ELSE
    -- Se o campo já existe, atualizar constraint para incluir novos valores
    -- Primeiro, atualizar valores antigos para compatibilidade
    UPDATE public.organizations
    SET status = 'active'
    WHERE status = 'delinquent' OR status NOT IN ('pending_setup', 'active', 'suspended', 'cancelled');
    
    -- Remover constraint antiga se existir
    ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS organizations_status_check;
    
    -- Adicionar nova constraint com valores atualizados
    ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_status_check 
    CHECK (status IN ('pending_setup', 'active', 'suspended', 'cancelled'));
    
    RAISE NOTICE '✅ Constraint de status atualizada em organizations';
  END IF;
END
$$;

-- 2. TABELA DE PLANOS DE ASSINATURA (DEVE SER CRIADA ANTES DA FOREIGN KEY)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  base_price_cents INTEGER NOT NULL DEFAULT 6990, -- R$ 69,90
  additional_user_price_cents INTEGER NOT NULL DEFAULT 2990, -- R$ 29,90
  included_users_count INTEGER NOT NULL DEFAULT 2, -- 1 Admin + 1 Recepcionista
  transaction_fee_percent NUMERIC(5,4) NOT NULL DEFAULT 0.0599, -- 5.99%
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir plano padrão (apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Plano Base') THEN
    INSERT INTO public.subscription_plans (name, base_price_cents, additional_user_price_cents, included_users_count, transaction_fee_percent)
    VALUES ('Plano Base', 6990, 2990, 2, 0.0599);
    
    RAISE NOTICE '✅ Plano padrão inserido';
  ELSE
    RAISE NOTICE '⚠️ Plano padrão já existe';
  END IF;
END
$$;

-- 3. CAMPOS DE BILLING NA ORGANIZAÇÃO
DO $$
BEGIN
  -- Asaas Subscription ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'asaas_subscription_id'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN asaas_subscription_id TEXT;
    
    RAISE NOTICE '✅ Campo asaas_subscription_id adicionado em organizations';
  END IF;

  -- Plano atual (AGORA a tabela subscription_plans já existe)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'subscription_plan_id'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN subscription_plan_id UUID REFERENCES subscription_plans(id);
    
    RAISE NOTICE '✅ Campo subscription_plan_id adicionado em organizations';
  END IF;

  -- Data de renovação
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'subscription_renewal_date'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN subscription_renewal_date TIMESTAMPTZ;
    
    RAISE NOTICE '✅ Campo subscription_renewal_date adicionado em organizations';
  END IF;

  -- Data de cancelamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'subscription_cancelled_at'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN subscription_cancelled_at TIMESTAMPTZ;
    
    RAISE NOTICE '✅ Campo subscription_cancelled_at adicionado em organizations';
  END IF;

  -- Usuários incluídos no plano base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'included_users_count'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN included_users_count INTEGER DEFAULT 2;
    
    RAISE NOTICE '✅ Campo included_users_count adicionado em organizations';
  END IF;
END
$$;

-- 4. TABELA DE COBRANÇAS DE USUÁRIOS EXTRAS
CREATE TABLE IF NOT EXISTS public.additional_user_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asaas_charge_id TEXT, -- ID da cobrança no Asaas
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL DEFAULT 2990,
  billing_month DATE NOT NULL, -- Mês de referência (ex: 2025-01-01)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, user_id, billing_month)
);

-- 5. HABILITAR RLS NA TABELA subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Super Admin pode ver todos os planos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscription_plans' 
    AND policyname = 'Super Admin can view all plans'
  ) THEN
    CREATE POLICY "Super Admin can view all plans"
    ON public.subscription_plans FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscription_plans' 
    AND policyname = 'Super Admin can manage plans'
  ) THEN
    CREATE POLICY "Super Admin can manage plans"
    ON public.subscription_plans FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
      )
    );
  END IF;
END
$$;

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_plan ON public.organizations(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_additional_user_charges_clinic ON public.additional_user_charges(clinic_id);
CREATE INDEX IF NOT EXISTS idx_additional_user_charges_user ON public.additional_user_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_additional_user_charges_billing_month ON public.additional_user_charges(billing_month);

-- 7. RLS POLICIES PARA additional_user_charges
ALTER TABLE public.additional_user_charges ENABLE ROW LEVEL SECURITY;

-- Admin da clínica pode ver suas cobranças
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'additional_user_charges' 
    AND policyname = 'Clinic Admin can view their charges'
  ) THEN
    CREATE POLICY "Clinic Admin can view their charges"
    ON public.additional_user_charges FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.clinic_id = additional_user_charges.clinic_id
        AND profiles.role IN ('admin', 'clinic_owner')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'additional_user_charges' 
    AND policyname = 'Super Admin can view all charges'
  ) THEN
    CREATE POLICY "Super Admin can view all charges"
    ON public.additional_user_charges FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
      )
    );
  END IF;
END
$$;

-- 9. FUNÇÃO PARA CONTAR USUÁRIOS ATIVOS DE UMA CLÍNICA
CREATE OR REPLACE FUNCTION public.count_active_users(clinic_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM public.profiles
  WHERE clinic_id = clinic_uuid
  AND role IN ('admin', 'clinic_owner', 'receptionist', 'professional');
  
  RETURN user_count;
END;
$$;

-- 10. FUNÇÃO PARA VERIFICAR SE CLÍNICA PODE ADICIONAR USUÁRIO
CREATE OR REPLACE FUNCTION public.can_add_user(clinic_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_record RECORD;
  active_count INTEGER;
  included_count INTEGER;
BEGIN
  SELECT 
    included_users_count,
    status
  INTO org_record
  FROM public.organizations
  WHERE id = clinic_uuid;
  
  IF org_record.status != 'active' THEN
    RETURN false;
  END IF;
  
  active_count := public.count_active_users(clinic_uuid);
  included_count := COALESCE(org_record.included_users_count, 2);
  
  -- Pode adicionar se estiver dentro do limite ou se já tiver cobranças de usuários extras
  RETURN active_count < included_count OR EXISTS (
    SELECT 1 FROM public.additional_user_charges
    WHERE clinic_id = clinic_uuid
    AND status = 'paid'
  );
END;
$$;

-- 11. COMENTÁRIOS
COMMENT ON COLUMN public.organizations.status IS
'Status da organização: pending_setup (não pagou), active (pago e liberado), suspended (pagamento falhou), cancelled (cancelado)';

COMMENT ON COLUMN public.organizations.asaas_subscription_id IS
'ID da assinatura recorrrente no Asaas';

COMMENT ON COLUMN public.organizations.subscription_plan_id IS
'ID do plano de assinatura atual';

COMMENT ON COLUMN public.organizations.included_users_count IS
'Número de usuários incluídos no plano base (padrão: 2 = 1 Admin + 1 Recepcionista)';

COMMENT ON TABLE public.subscription_plans IS
'Planos de assinatura disponíveis. Plano base: R$ 69,90/mês com 2 usuários incluídos. Usuário extra: R$ 29,90/mês.';

COMMENT ON TABLE public.additional_user_charges IS
'Cobranças mensais de usuários extras além do limite incluído no plano base.';
