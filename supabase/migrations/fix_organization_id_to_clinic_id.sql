-- ============================================================================
-- MIGRAÇÃO CRÍTICA: Renomear organization_id para clinic_id
-- ============================================================================
-- Esta migração alinha o banco de dados com o RELATORIO_BANCO_DADOS.md
-- que define que TODAS as tabelas multi-tenant usam clinic_id (NUNCA organization_id)
-- ============================================================================

-- 1. FINANCIAL_TRANSACTIONS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'financial_transactions'
    AND column_name = 'organization_id'
  ) THEN
    -- Renomear coluna
    ALTER TABLE public.financial_transactions
    RENAME COLUMN organization_id TO clinic_id;
    
    -- Atualizar índices
    DROP INDEX IF EXISTS idx_financial_transactions_org;
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_clinic 
    ON public.financial_transactions(clinic_id);
    
    RAISE NOTICE '✅ financial_transactions: organization_id → clinic_id';
  ELSE
    RAISE NOTICE '⚠️ financial_transactions já usa clinic_id';
  END IF;
END
$$;

-- 2. ORGANIZATION_SETTINGS
DO $$
BEGIN
  -- Verificar se a tabela existe e tem organization_id como PK
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_settings'
    AND column_name = 'organization_id'
    AND is_nullable = 'NO'
  ) THEN
    -- Remover constraint de PK se existir
    ALTER TABLE public.organization_settings
    DROP CONSTRAINT IF EXISTS organization_settings_pkey;
    
    -- Renomear coluna
    ALTER TABLE public.organization_settings
    RENAME COLUMN organization_id TO clinic_id;
    
    -- Recriar PK
    ALTER TABLE public.organization_settings
    ADD PRIMARY KEY (clinic_id);
    
    RAISE NOTICE '✅ organization_settings: organization_id → clinic_id (PK)';
  ELSE
    RAISE NOTICE '⚠️ organization_settings já usa clinic_id';
  END IF;
END
$$;

-- 3. GABY_RULES
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gaby_rules'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.gaby_rules
    RENAME COLUMN organization_id TO clinic_id;
    
    -- Atualizar índices
    DROP INDEX IF EXISTS idx_gaby_rules_org;
    CREATE INDEX IF NOT EXISTS idx_gaby_rules_clinic 
    ON public.gaby_rules(clinic_id);
    
    RAISE NOTICE '✅ gaby_rules: organization_id → clinic_id';
  ELSE
    RAISE NOTICE '⚠️ gaby_rules já usa clinic_id';
  END IF;
END
$$;

-- 4. CLIENT_RETENTION_DATA
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'client_retention_data'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.client_retention_data
    RENAME COLUMN organization_id TO clinic_id;
    
    -- Atualizar índices
    DROP INDEX IF EXISTS idx_client_retention_org;
    CREATE INDEX IF NOT EXISTS idx_client_retention_clinic 
    ON public.client_retention_data(clinic_id, client_id);
    
    RAISE NOTICE '✅ client_retention_data: organization_id → clinic_id';
  ELSE
    RAISE NOTICE '⚠️ client_retention_data já usa clinic_id';
  END IF;
END
$$;

-- 5. ATUALIZAR POLÍTICAS RLS
-- Recriar políticas RLS para usar clinic_id em vez de organization_id
DO $$
BEGIN
  -- Remover políticas antigas que usam organization_id
  DROP POLICY IF EXISTS "Allow org members select financial_transactions" ON public.financial_transactions;
  DROP POLICY IF EXISTS "Allow org members insert financial_transactions" ON public.financial_transactions;
  DROP POLICY IF EXISTS "Allow org members update financial_transactions" ON public.financial_transactions;
  DROP POLICY IF EXISTS "Org members select gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Org members insert gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Org members select client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Org members insert client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Org members select organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Org members insert organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Org members update organization_settings" ON public.organization_settings;
  
  -- Recriar políticas usando clinic_id
  -- financial_transactions
  CREATE POLICY "Allow org members select financial_transactions"
    ON public.financial_transactions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = financial_transactions.clinic_id
      )
    );
  
  CREATE POLICY "Allow org members insert financial_transactions"
    ON public.financial_transactions FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = financial_transactions.clinic_id
      )
    );
  
  CREATE POLICY "Allow org members update financial_transactions"
    ON public.financial_transactions FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = financial_transactions.clinic_id
      )
    );
  
  -- gaby_rules
  CREATE POLICY "Org members select gaby_rules"
    ON public.gaby_rules FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = gaby_rules.clinic_id
      )
    );
  
  CREATE POLICY "Org members insert gaby_rules"
    ON public.gaby_rules FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = gaby_rules.clinic_id
      )
    );
  
  -- client_retention_data
  CREATE POLICY "Org members select client_retention_data"
    ON public.client_retention_data FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = client_retention_data.clinic_id
      )
    );
  
  CREATE POLICY "Org members insert client_retention_data"
    ON public.client_retention_data FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = client_retention_data.clinic_id
      )
    );
  
  -- organization_settings
  CREATE POLICY "Org members select organization_settings"
    ON public.organization_settings FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = organization_settings.clinic_id
      )
    );
  
  CREATE POLICY "Org members insert organization_settings"
    ON public.organization_settings FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = organization_settings.clinic_id
      )
    );
  
  CREATE POLICY "Org members update organization_settings"
    ON public.organization_settings FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = organization_settings.clinic_id
      )
    );
  
  RAISE NOTICE '✅ Políticas RLS atualizadas para usar clinic_id';
END
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.financial_transactions.clinic_id IS
'ID da clínica (organizations.id). Conforme RELATORIO_BANCO_DADOS.md, TODAS as tabelas multi-tenant usam clinic_id.';

COMMENT ON COLUMN public.organization_settings.clinic_id IS
'ID da clínica (organizations.id) - PRIMARY KEY. Conforme RELATORIO_BANCO_DADOS.md.';

COMMENT ON COLUMN public.gaby_rules.clinic_id IS
'ID da clínica (organizations.id). Conforme RELATORIO_BANCO_DADOS.md.';

COMMENT ON COLUMN public.client_retention_data.clinic_id IS
'ID da clínica (organizations.id). Conforme RELATORIO_BANCO_DADOS.md.';
