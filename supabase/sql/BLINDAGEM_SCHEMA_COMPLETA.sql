-- ============================================================================
-- BLINDAGEM E CORREÇÃO CRÍTICA DO SCHEMA - EXECUÇÃO COMPLETA
-- ============================================================================
-- Este script resolve todos os problemas críticos identificados na auditoria:
-- 1. Unificação de nomenclatura (organization_id → clinic_id)
-- 2. Melhoria na integridade de dados (appointments.client_id NOT NULL)
-- 3. Criação de novas estruturas (products, client_wallet, appointment_evolutions)
-- 4. Adição de booking_fee_cents em appointments
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: RENOMEAÇÃO DE COLUNAS (organization_id → clinic_id)
-- ============================================================================

-- 1.1: financial_transactions
DO $$
BEGIN
  -- Verificar se a coluna organization_id existe e clinic_id não existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financial_transactions' 
      AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financial_transactions' 
      AND column_name = 'clinic_id'
  ) THEN
    -- Renomear coluna
    ALTER TABLE public.financial_transactions 
      RENAME COLUMN organization_id TO clinic_id;
    
    -- Renomear índice
    DROP INDEX IF EXISTS idx_financial_transactions_org;
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_clinic 
      ON public.financial_transactions (clinic_id);
    
    RAISE NOTICE '✅ financial_transactions: organization_id → clinic_id';
  END IF;
END $$;

-- 1.2: gaby_rules
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'gaby_rules' 
      AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'gaby_rules' 
      AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.gaby_rules 
      RENAME COLUMN organization_id TO clinic_id;
    
    DROP INDEX IF EXISTS idx_gaby_rules_org;
    CREATE INDEX IF NOT EXISTS idx_gaby_rules_clinic 
      ON public.gaby_rules (clinic_id);
    
    RAISE NOTICE '✅ gaby_rules: organization_id → clinic_id';
  END IF;
END $$;

-- 1.3: client_retention_data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'client_retention_data' 
      AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'client_retention_data' 
      AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.client_retention_data 
      RENAME COLUMN organization_id TO clinic_id;
    
    DROP INDEX IF EXISTS idx_client_retention_org;
    CREATE INDEX IF NOT EXISTS idx_client_retention_clinic 
      ON public.client_retention_data (clinic_id, client_id);
    
    RAISE NOTICE '✅ client_retention_data: organization_id → clinic_id';
  END IF;
END $$;

-- 1.4: organization_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organization_settings' 
      AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organization_settings' 
      AND column_name = 'clinic_id'
  ) THEN
    -- Remover constraint de primary key antiga
    ALTER TABLE public.organization_settings 
      DROP CONSTRAINT IF EXISTS organization_settings_pkey;
    
    ALTER TABLE public.organization_settings 
      RENAME COLUMN organization_id TO clinic_id;
    
    -- Recriar primary key
    ALTER TABLE public.organization_settings 
      ADD PRIMARY KEY (clinic_id);
    
    RAISE NOTICE '✅ organization_settings: organization_id → clinic_id';
  END IF;
END $$;

-- ============================================================================
-- PARTE 2: ATUALIZAÇÃO DE POLÍTICAS RLS
-- ============================================================================

-- 2.1: Remover políticas antigas de financial_transactions
DROP POLICY IF EXISTS "Allow org members select financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Allow org members insert financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Allow org members update financial_transactions" ON public.financial_transactions;

-- Recriar políticas com clinic_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow clinic members select financial_transactions'
  ) THEN
    CREATE POLICY "Allow clinic members select financial_transactions"
      ON public.financial_transactions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = financial_transactions.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow clinic members insert financial_transactions'
  ) THEN
    CREATE POLICY "Allow clinic members insert financial_transactions"
      ON public.financial_transactions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = financial_transactions.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow clinic members update financial_transactions'
  ) THEN
    CREATE POLICY "Allow clinic members update financial_transactions"
      ON public.financial_transactions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = financial_transactions.clinic_id
        )
      );
  END IF;
END $$;

-- 2.2: Atualizar políticas de gaby_rules
DROP POLICY IF EXISTS "Org members select gaby_rules" ON public.gaby_rules;
DROP POLICY IF EXISTS "Org members insert gaby_rules" ON public.gaby_rules;
DROP POLICY IF EXISTS "Org members update gaby_rules" ON public.gaby_rules;
DROP POLICY IF EXISTS "Org members delete gaby_rules" ON public.gaby_rules;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members select gaby_rules'
  ) THEN
    CREATE POLICY "Clinic members select gaby_rules"
      ON public.gaby_rules
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members insert gaby_rules'
  ) THEN
    CREATE POLICY "Clinic members insert gaby_rules"
      ON public.gaby_rules
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members update gaby_rules'
  ) THEN
    CREATE POLICY "Clinic members update gaby_rules"
      ON public.gaby_rules
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members delete gaby_rules'
  ) THEN
    CREATE POLICY "Clinic members delete gaby_rules"
      ON public.gaby_rules
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.clinic_id
        )
      );
  END IF;
END $$;

-- 2.3: Atualizar políticas de client_retention_data
DROP POLICY IF EXISTS "Org members select client_retention_data" ON public.client_retention_data;
DROP POLICY IF EXISTS "Org members insert client_retention_data" ON public.client_retention_data;
DROP POLICY IF EXISTS "Org members update client_retention_data" ON public.client_retention_data;
DROP POLICY IF EXISTS "Org members delete client_retention_data" ON public.client_retention_data;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members select client_retention_data'
  ) THEN
    CREATE POLICY "Clinic members select client_retention_data"
      ON public.client_retention_data
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members insert client_retention_data'
  ) THEN
    CREATE POLICY "Clinic members insert client_retention_data"
      ON public.client_retention_data
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members update client_retention_data'
  ) THEN
    CREATE POLICY "Clinic members update client_retention_data"
      ON public.client_retention_data
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members delete client_retention_data'
  ) THEN
    CREATE POLICY "Clinic members delete client_retention_data"
      ON public.client_retention_data
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.clinic_id
        )
      );
  END IF;
END $$;

-- 2.4: Atualizar políticas de organization_settings
DROP POLICY IF EXISTS "Org members select organization_settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Org members insert organization_settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Org members update organization_settings" ON public.organization_settings;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members select organization_settings'
  ) THEN
    CREATE POLICY "Clinic members select organization_settings"
      ON public.organization_settings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = organization_settings.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members insert organization_settings'
  ) THEN
    CREATE POLICY "Clinic members insert organization_settings"
      ON public.organization_settings
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = organization_settings.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members update organization_settings'
  ) THEN
    CREATE POLICY "Clinic members update organization_settings"
      ON public.organization_settings
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = organization_settings.clinic_id
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PARTE 3: MELHORIA NA INTEGRIDADE DE DADOS
-- ============================================================================

-- 3.1: Tornar appointments.client_id NOT NULL
DO $$
BEGIN
  -- Primeiro, remover registros órfãos (agendamentos sem cliente)
  -- ATENÇÃO: Isso deleta dados! Comente se não quiser deletar
  -- DELETE FROM public.appointments WHERE client_id IS NULL;
  
  -- Adicionar constraint NOT NULL
  ALTER TABLE public.appointments 
    ALTER COLUMN client_id SET NOT NULL;
  
  RAISE NOTICE '✅ appointments.client_id agora é NOT NULL';
END $$;

-- ============================================================================
-- PARTE 4: NOVAS ESTRUTURAS (GAPS FUNCIONAIS)
-- ============================================================================

-- 4.1: Tabela products (Produtos para Comanda/Upsell)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  cost_cents integer CHECK (cost_cents >= 0),
  sku text,
  barcode text,
  category text,
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_clinic ON public.products (clinic_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (clinic_id, is_active) WHERE is_active = true;

-- RLS para products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members select products'
  ) THEN
    CREATE POLICY "Clinic members select products"
      ON public.products
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = products.clinic_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic admins manage products'
  ) THEN
    CREATE POLICY "Clinic admins manage products"
      ON public.products
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = products.clinic_id
            AND p.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = products.clinic_id
            AND p.role IN ('admin', 'owner')
        )
      );
  END IF;
END $$;

-- 4.2: Tabela client_wallet (Cashback/Créditos por Cliente)
CREATE TABLE IF NOT EXISTS public.client_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  total_earned_cents integer NOT NULL DEFAULT 0 CHECK (total_earned_cents >= 0),
  total_spent_cents integer NOT NULL DEFAULT 0 CHECK (total_spent_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, client_id)
);

-- Índices para client_wallet
CREATE INDEX IF NOT EXISTS idx_client_wallet_clinic ON public.client_wallet (clinic_id);
CREATE INDEX IF NOT EXISTS idx_client_wallet_client ON public.client_wallet (client_id);

-- RLS para client_wallet
ALTER TABLE public.client_wallet ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Clientes podem ver apenas seu próprio wallet
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clients view own wallet'
  ) THEN
    CREATE POLICY "Clients view own wallet"
      ON public.client_wallet
      FOR SELECT
      USING (
        client_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'client'
        )
      );
  END IF;

  -- Membros da clínica podem ver wallets dos clientes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members select client_wallet'
  ) THEN
    CREATE POLICY "Clinic members select client_wallet"
      ON public.client_wallet
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_wallet.clinic_id
            AND p.role IN ('admin', 'owner', 'receptionist', 'professional')
        )
      );
  END IF;

  -- Apenas admins podem modificar wallets (para créditos manuais)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic admins manage client_wallet'
  ) THEN
    CREATE POLICY "Clinic admins manage client_wallet"
      ON public.client_wallet
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_wallet.clinic_id
            AND p.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_wallet.clinic_id
            AND p.role IN ('admin', 'owner')
        )
      );
  END IF;
END $$;

-- 4.3: Tabela appointment_evolutions (Prontuário/Evoluções)
CREATE TABLE IF NOT EXISTS public.appointment_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evolution_text text NOT NULL,
  evolution_type text CHECK (evolution_type IN ('initial', 'progress', 'final', 'observation')),
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para appointment_evolutions
CREATE INDEX IF NOT EXISTS idx_appointment_evolutions_clinic ON public.appointment_evolutions (clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointment_evolutions_appointment ON public.appointment_evolutions (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_evolutions_professional ON public.appointment_evolutions (professional_id);

-- RLS para appointment_evolutions
ALTER TABLE public.appointment_evolutions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Profissionais podem ver e criar evoluções de seus agendamentos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Professionals manage own evolutions'
  ) THEN
    CREATE POLICY "Professionals manage own evolutions"
      ON public.appointment_evolutions
      FOR ALL
      USING (
        professional_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'professional'
        )
      )
      WITH CHECK (
        professional_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'professional'
        )
      );
  END IF;

  -- Membros da clínica podem ver todas as evoluções
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic members select evolutions'
  ) THEN
    CREATE POLICY "Clinic members select evolutions"
      ON public.appointment_evolutions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = appointment_evolutions.clinic_id
        )
      );
  END IF;

  -- Admins podem gerenciar todas as evoluções
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Clinic admins manage evolutions'
  ) THEN
    CREATE POLICY "Clinic admins manage evolutions"
      ON public.appointment_evolutions
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = appointment_evolutions.clinic_id
            AND p.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = appointment_evolutions.clinic_id
            AND p.role IN ('admin', 'owner')
        )
      );
  END IF;
END $$;

-- 4.4: Adicionar booking_fee_cents em appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'appointments' 
      AND column_name = 'booking_fee_cents'
  ) THEN
    ALTER TABLE public.appointments 
      ADD COLUMN booking_fee_cents integer DEFAULT 0 CHECK (booking_fee_cents >= 0);
    
    RAISE NOTICE '✅ booking_fee_cents adicionado em appointments';
  END IF;
END $$;

-- ============================================================================
-- PARTE 5: ATUALIZAÇÃO DE FUNÇÕES E TRIGGERS
-- ============================================================================

-- 5.1: Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at nas novas tabelas
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_wallet_updated_at ON public.client_wallet;
CREATE TRIGGER update_client_wallet_updated_at
  BEFORE UPDATE ON public.client_wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointment_evolutions_updated_at ON public.appointment_evolutions;
CREATE TRIGGER update_appointment_evolutions_updated_at
  BEFORE UPDATE ON public.appointment_evolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================';
  RAISE NOTICE '✅ BLINDAGEM DO SCHEMA CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '✅ ============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 RESUMO DAS ALTERAÇÕES:';
  RAISE NOTICE '  1. ✅ Unificação: organization_id → clinic_id (4 tabelas)';
  RAISE NOTICE '  2. ✅ Integridade: appointments.client_id agora é NOT NULL';
  RAISE NOTICE '  3. ✅ Novas tabelas: products, client_wallet, appointment_evolutions';
  RAISE NOTICE '  4. ✅ Nova coluna: booking_fee_cents em appointments';
  RAISE NOTICE '  5. ✅ Políticas RLS atualizadas para todas as tabelas';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  RAISE NOTICE '  - Atualizar código TypeScript para usar clinic_id';
  RAISE NOTICE '  - Atualizar Edge Functions do Supabase';
  RAISE NOTICE '  - Testar políticas RLS com diferentes roles';
  RAISE NOTICE '';
END $$;

COMMIT;

