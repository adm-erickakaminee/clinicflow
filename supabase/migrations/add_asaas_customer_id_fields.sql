-- Migration: Adicionar campos asaas_customer_id em tabelas críticas
-- Data: 2024
-- Descrição: Armazena o customer_id do Asaas que vem nas respostas de pagamento/webhook
--            Este campo é CRÍTICO para rastreabilidade e reconciliação

-- ============================================================================
-- 1. ORGANIZATIONS (Clínicas)
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'asaas_customer_id'
  ) THEN
    ALTER TABLE public.organizations 
    ADD COLUMN asaas_customer_id text;
    
    COMMENT ON COLUMN public.organizations.asaas_customer_id IS 
      'ID do cliente no Asaas (campo "customer" ou "customer_id" nas respostas da API). '
      'CRÍTICO para rastreabilidade de pagamentos e reconciliação.';
      
    -- Criar índice para queries rápidas
    CREATE INDEX IF NOT EXISTS idx_organizations_asaas_customer_id 
    ON public.organizations(asaas_customer_id) 
    WHERE asaas_customer_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. PROFILES (Profissionais)
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'asaas_customer_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN asaas_customer_id text;
    
    COMMENT ON COLUMN public.profiles.asaas_customer_id IS 
      'ID do cliente no Asaas para profissionais que recebem pagamentos. '
      'Usado para criar pagamentos e assinaturas vinculadas ao profissional.';
      
    CREATE INDEX IF NOT EXISTS idx_profiles_asaas_customer_id 
    ON public.profiles(asaas_customer_id) 
    WHERE asaas_customer_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. CLIENTS (Clientes Finais) - OPCIONAL mas recomendado
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'clients' 
      AND column_name = 'asaas_customer_id'
  ) THEN
    ALTER TABLE public.clients 
    ADD COLUMN asaas_customer_id text;
    
    COMMENT ON COLUMN public.clients.asaas_customer_id IS 
      'ID do cliente no Asaas para clientes que fazem pagamentos diretos. '
      'Permite rastrear histórico de pagamentos do cliente no Asaas.';
      
    CREATE INDEX IF NOT EXISTS idx_clients_asaas_customer_id 
    ON public.clients(asaas_customer_id) 
    WHERE asaas_customer_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. FINANCIAL_TRANSACTIONS - Campo crítico para rastreamento
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financial_transactions' 
      AND column_name = 'asaas_customer_id'
  ) THEN
    ALTER TABLE public.financial_transactions 
    ADD COLUMN asaas_customer_id text;
    
    COMMENT ON COLUMN public.financial_transactions.asaas_customer_id IS 
      'ID do cliente no Asaas que realizou o pagamento. '
      'Vem no campo "customer" ou "customer_id" das respostas do Asaas. '
      'Permite rastrear qual cliente do Asaas fez cada pagamento.';
      
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_asaas_customer_id 
    ON public.financial_transactions(asaas_customer_id) 
    WHERE asaas_customer_id IS NOT NULL;
  END IF;
END $$;

