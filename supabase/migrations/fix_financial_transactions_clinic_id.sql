-- ✅ Migration: Corrigir financial_transactions para usar clinic_id ao invés de organization_id
-- Data: $(date)
-- Descrição: Padroniza nomenclatura para clinic_id em financial_transactions

-- 1. Adicionar coluna clinic_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'financial_transactions' 
    AND column_name = 'clinic_id'
  ) THEN
    -- Adicionar coluna clinic_id
    ALTER TABLE public.financial_transactions 
    ADD COLUMN clinic_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    -- Copiar dados de organization_id para clinic_id
    UPDATE public.financial_transactions 
    SET clinic_id = organization_id 
    WHERE clinic_id IS NULL;
    
    -- Tornar clinic_id NOT NULL após copiar dados
    ALTER TABLE public.financial_transactions 
    ALTER COLUMN clinic_id SET NOT NULL;
  END IF;
END $$;

-- 2. Atualizar políticas RLS para usar clinic_id
DO $$
BEGIN
  -- Remover políticas antigas
  DROP POLICY IF EXISTS "Allow org members select financial_transactions" ON public.financial_transactions;
  DROP POLICY IF EXISTS "Allow org members insert financial_transactions" ON public.financial_transactions;
  DROP POLICY IF EXISTS "Allow org members update financial_transactions" ON public.financial_transactions;
  
  -- Criar novas políticas usando clinic_id
  CREATE POLICY "Allow org members select financial_transactions"
    ON public.financial_transactions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = financial_transactions.clinic_id
      )
    );

  CREATE POLICY "Allow org members insert financial_transactions"
    ON public.financial_transactions
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = financial_transactions.clinic_id
      )
    );

  CREATE POLICY "Allow org members update financial_transactions"
    ON public.financial_transactions
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.clinic_id = financial_transactions.clinic_id
      )
    );
END $$;

-- 3. Atualizar índices
DROP INDEX IF EXISTS idx_financial_transactions_org;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_clinic 
  ON public.financial_transactions (clinic_id);

-- 4. NOTA: Não removemos organization_id ainda para manter compatibilidade
-- Em uma migration futura, podemos remover organization_id após validar que tudo funciona
-- ALTER TABLE public.financial_transactions DROP COLUMN organization_id;

