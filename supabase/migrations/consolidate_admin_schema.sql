-- Migração Consolidada: Blindagem das Abas Cadastros e Configurações
-- Garante que todos os campos necessários existam no schema

-- 1. DETALHES DA ORGANIZAÇÃO (Tabela: organizations)
DO $$
BEGIN
  -- CNPJ
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN cnpj TEXT;
    
    RAISE NOTICE '✅ Campo cnpj adicionado em organizations';
  ELSE
    RAISE NOTICE '⚠️ Campo cnpj já existe em organizations';
  END IF;

  -- Platform Fee Override (apenas Super Admin pode editar)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'platform_fee_override_percent'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN platform_fee_override_percent INTEGER DEFAULT 599 CHECK (platform_fee_override_percent >= 0 AND platform_fee_override_percent <= 1000);
    
    RAISE NOTICE '✅ Campo platform_fee_override_percent adicionado em organizations';
  ELSE
    RAISE NOTICE '⚠️ Campo platform_fee_override_percent já existe em organizations';
  END IF;
END
$$;

-- 2. METAS DA CLÍNICA (Tabela: organization_settings)
DO $$
BEGIN
  -- Meta de Receita Mensal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_settings'
    AND column_name = 'monthly_revenue_goal_cents'
  ) THEN
    ALTER TABLE public.organization_settings
    ADD COLUMN monthly_revenue_goal_cents INTEGER DEFAULT 0 CHECK (monthly_revenue_goal_cents >= 0);
    
    RAISE NOTICE '✅ Campo monthly_revenue_goal_cents adicionado em organization_settings';
  ELSE
    RAISE NOTICE '⚠️ Campo monthly_revenue_goal_cents já existe em organization_settings';
  END IF;
END
$$;

-- 3. REGRAS DE PAYOUT (Tabela: profiles)
DO $$
BEGIN
  -- Payout Model
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'payout_model'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN payout_model TEXT DEFAULT 'PERCENTUAL' CHECK (payout_model IN ('PERCENTUAL', 'FIXO_MENSAL', 'HIBRIDO', 'NENHUM'));
    
    RAISE NOTICE '✅ Campo payout_model adicionado em profiles';
  ELSE
    RAISE NOTICE '⚠️ Campo payout_model já existe em profiles';
  END IF;

  -- Payout Percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'payout_percentage'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN payout_percentage INTEGER DEFAULT 50 CHECK (payout_percentage >= 0 AND payout_percentage <= 100);
    
    RAISE NOTICE '✅ Campo payout_percentage adicionado em profiles';
  ELSE
    RAISE NOTICE '⚠️ Campo payout_percentage já existe em profiles';
  END IF;

  -- Fixed Monthly Payout
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'fixed_monthly_payout_cents'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN fixed_monthly_payout_cents INTEGER DEFAULT 0 CHECK (fixed_monthly_payout_cents >= 0);
    
    RAISE NOTICE '✅ Campo fixed_monthly_payout_cents adicionado em profiles';
  ELSE
    RAISE NOTICE '⚠️ Campo fixed_monthly_payout_cents já existe em profiles';
  END IF;
END
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.organizations.cnpj IS
'CNPJ (Cadastro Nacional da Pessoa Jurídica) da organização/clínica. Formato: XX.XXX.XXX/XXXX-XX';

COMMENT ON COLUMN public.organizations.platform_fee_override_percent IS
'Taxa de override da plataforma em centésimos de porcentagem (ex: 599 = 5.99%). Apenas Super Admin pode editar.';

COMMENT ON COLUMN public.organization_settings.monthly_revenue_goal_cents IS
'Meta de receita mensal da clínica em centavos. Usado para acompanhamento de crescimento e KPIs.';

COMMENT ON COLUMN public.profiles.payout_model IS
'Modelo de remuneração do profissional: PERCENTUAL (comissão %), FIXO_MENSAL (valor fixo), HIBRIDO (ambos), NENHUM (sem remuneração)';

COMMENT ON COLUMN public.profiles.payout_percentage IS
'Percentual de comissão do profissional (0-100). Usado quando payout_model é PERCENTUAL ou HIBRIDO.';

COMMENT ON COLUMN public.profiles.fixed_monthly_payout_cents IS
'Valor fixo mensal em centavos. Usado quando payout_model é FIXO_MENSAL ou HIBRIDO.';
