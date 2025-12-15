-- Migration: Adicionar campos para Painel do Administrador
-- 1. Meta de Receita Mensal da Clínica em organization_settings
-- 2. Campo de Auditoria Pós-Execução em financial_transactions

-- 1. Adicionar monthly_revenue_goal_cents em organization_settings
DO $$
BEGIN
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

-- 2. Adicionar is_admin_audited em financial_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'financial_transactions' 
    AND column_name = 'is_admin_audited'
  ) THEN
    ALTER TABLE public.financial_transactions
    ADD COLUMN is_admin_audited BOOLEAN NOT NULL DEFAULT FALSE;
    
    -- Criar índice para consultas de auditoria
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_audited 
    ON public.financial_transactions (is_admin_audited) 
    WHERE is_admin_audited = FALSE;
    
    RAISE NOTICE '✅ Campo is_admin_audited adicionado em financial_transactions';
  ELSE
    RAISE NOTICE '⚠️ Campo is_admin_audited já existe em financial_transactions';
  END IF;
END
$$;

-- 3. Comentários para documentação
COMMENT ON COLUMN public.organization_settings.monthly_revenue_goal_cents IS 
'Meta de receita mensal da clínica em centavos. Usado para acompanhamento de crescimento e progressão de metas.';

COMMENT ON COLUMN public.financial_transactions.is_admin_audited IS 
'Flag indicando se a transação foi auditada pelo administrador após a execução. FALSE = pendente de auditoria.';

