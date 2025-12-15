-- ============================================================================
-- MIGRAÇÃO: Adicionar Campos KYC (Know Your Customer) para Asaas
-- ============================================================================
-- Campos necessários para criar subconta Asaas e processar pagamentos
-- ============================================================================

-- 1. CAMPOS KYC PARA ORGANIZATIONS (Clínicas)
DO $$
BEGIN
  -- CPF/CNPJ já existe (cnpj), adicionar campos bancários e status KYC
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'asaas_wallet_id'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN asaas_wallet_id TEXT;
    
    RAISE NOTICE '✅ Campo asaas_wallet_id adicionado em organizations';
  ELSE
    RAISE NOTICE '⚠️ Campo asaas_wallet_id já existe em organizations';
  END IF;

  -- Status de KYC da clínica
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'kyc_status'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected'));
    
    RAISE NOTICE '✅ Campo kyc_status adicionado em organizations';
  ELSE
    RAISE NOTICE '⚠️ Campo kyc_status já existe em organizations';
  END IF;

  -- Dados bancários da clínica (JSONB para flexibilidade)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'bank_account_data'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN bank_account_data JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo bank_account_data adicionado em organizations';
  ELSE
    RAISE NOTICE '⚠️ Campo bank_account_data já existe em organizations';
  END IF;
END
$$;

-- 2. CAMPOS KYC PARA PROFILES (Profissionais)
DO $$
BEGIN
  -- CPF do profissional
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'cpf'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN cpf TEXT;
    
    RAISE NOTICE '✅ Campo cpf adicionado em profiles';
  ELSE
    RAISE NOTICE '⚠️ Campo cpf já existe em profiles';
  END IF;

  -- Status de KYC do profissional
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'kyc_status'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected'));
    
    RAISE NOTICE '✅ Campo kyc_status adicionado em profiles';
  ELSE
    RAISE NOTICE '⚠️ Campo kyc_status já existe em profiles';
  END IF;

  -- Dados bancários do profissional (JSONB para flexibilidade)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'bank_account_data'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN bank_account_data JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo bank_account_data adicionado em profiles';
  ELSE
    RAISE NOTICE '⚠️ Campo bank_account_data já existe em profiles';
  END IF;
END
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.organizations.asaas_wallet_id IS
'ID da carteira Asaas da clínica (subconta). Criado após aprovação do KYC.';

COMMENT ON COLUMN public.organizations.kyc_status IS
'Status do processo KYC da clínica: pending, in_review, approved, rejected.';

COMMENT ON COLUMN public.organizations.bank_account_data IS
'Dados bancários da clínica em formato JSONB: {bank_code, agency, account, account_digit, account_type, holder_name, holder_document}';

COMMENT ON COLUMN public.profiles.cpf IS
'CPF do profissional (formato: XXX.XXX.XXX-XX).';

COMMENT ON COLUMN public.profiles.kyc_status IS
'Status do processo KYC do profissional: pending, in_review, approved, rejected.';

COMMENT ON COLUMN public.profiles.bank_account_data IS
'Dados bancários do profissional em formato JSONB: {bank_code, agency, account, account_digit, account_type, holder_name, holder_document}';
