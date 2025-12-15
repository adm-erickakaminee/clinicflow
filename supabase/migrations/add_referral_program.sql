-- Programa de Afiliados B2B - Tabelas de Indicação

-- Tabela 1: referral_rules (Regras Globais da Plataforma)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'referral_rules'
  ) THEN
    CREATE TABLE public.referral_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      platform_referral_percentage INTEGER NOT NULL DEFAULT 233, -- 2.33% (em centésimos de porcentagem)
      platform_wallet_id TEXT NOT NULL, -- ID da carteira da plataforma para receber o lucro restante
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- Inserir regra padrão (pode ser ajustada depois)
    INSERT INTO public.referral_rules (platform_referral_percentage, platform_wallet_id)
    VALUES (233, 'wallet_platform_default');

    RAISE NOTICE '✅ Tabela referral_rules criada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Tabela referral_rules já existe';
  END IF;
END
$$;

-- Tabela 2: referrals (Rastreia o relacionamento de indicação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'referrals'
  ) THEN
    CREATE TABLE public.referrals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      referring_clinic_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, -- Quem indicou
      referred_clinic_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,  -- Quem foi indicado
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (referred_clinic_id), -- Uma clínica só pode ser indicada uma vez
      CONSTRAINT different_clinics CHECK (referring_clinic_id != referred_clinic_id)
    );

    -- Índices para performance
    CREATE INDEX idx_referrals_referring_clinic ON public.referrals(referring_clinic_id);
    CREATE INDEX idx_referrals_referred_clinic ON public.referrals(referred_clinic_id);

    RAISE NOTICE '✅ Tabela referrals criada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Tabela referrals já existe';
  END IF;
END
$$;

-- Adicionar campo para meta de clínicas indicadas em organization_settings (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_settings'
    AND column_name = 'referral_goal_count'
  ) THEN
    ALTER TABLE public.organization_settings
    ADD COLUMN referral_goal_count INTEGER DEFAULT 0 CHECK (referral_goal_count >= 0);

    RAISE NOTICE '✅ Campo referral_goal_count adicionado em organization_settings';
  ELSE
    RAISE NOTICE '⚠️ Campo referral_goal_count já existe em organization_settings';
  END IF;
END
$$;

-- Comentários para documentação
COMMENT ON TABLE public.referral_rules IS
'Regras globais do programa de indicação. Define a porcentagem de repasse (2.33%) e a carteira da plataforma.';

COMMENT ON COLUMN public.referral_rules.platform_referral_percentage IS
'Porcentagem de repasse para a clínica indicadora em centésimos (233 = 2.33%).';

COMMENT ON COLUMN public.referral_rules.platform_wallet_id IS
'ID da carteira Asaas da plataforma para receber o restante da taxa (5.99% - 2.33% = 3.66%).';

COMMENT ON TABLE public.referrals IS
'Rastreia os relacionamentos de indicação entre clínicas. Uma clínica só pode ser indicada uma vez.';

COMMENT ON COLUMN public.referrals.referring_clinic_id IS
'ID da clínica que fez a indicação (quem vai receber o repasse de 2.33%).';

COMMENT ON COLUMN public.referrals.referred_clinic_id IS
'ID da clínica que foi indicada (quem foi cadastrada através do link de indicação).';

COMMENT ON COLUMN public.organization_settings.referral_goal_count IS
'Meta de número de clínicas ativas indicadas para esta organização.';
