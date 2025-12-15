-- Adicionar campos de regras de payout e taxa de override da plataforma

-- 1. Taxa de Override da Plataforma (na tabela organizations)
DO $$
BEGIN
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

-- 2. Regras de Payout do Profissional (na tabela profiles)
DO $$
BEGIN
  -- payout_model
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

  -- payout_percentage
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

  -- fixed_monthly_payout_cents
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
COMMENT ON COLUMN public.organizations.platform_fee_override_percent IS
'Taxa de override da plataforma em centésimos de porcentagem (ex: 599 = 5.99%). Apenas Super Admin pode editar.';

COMMENT ON COLUMN public.profiles.payout_model IS
'Modelo de remuneração do profissional: PERCENTUAL (comissão %), FIXO_MENSAL (valor fixo), HIBRIDO (ambos), NENHUM (sem remuneração)';

COMMENT ON COLUMN public.profiles.payout_percentage IS
'Percentual de comissão do profissional (0-100). Usado quando payout_model é PERCENTUAL ou HIBRIDO.';

COMMENT ON COLUMN public.profiles.fixed_monthly_payout_cents IS
'Valor fixo mensal em centavos. Usado quando payout_model é FIXO_MENSAL ou HIBRIDO.';

