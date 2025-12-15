-- ============================================================================
-- Adicionar campos de modelo de comissionamento na tabela professionals
-- 
-- IMPORTANTE: O profissional PAGA para a clínica (não o contrário)
-- A clínica também PAGA uma taxa para a plataforma (configurada separadamente)
-- ============================================================================

DO $$
BEGIN
  -- Adicionar commission_model se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'professionals' 
      AND column_name = 'commission_model'
  ) THEN
    ALTER TABLE public.professionals 
      ADD COLUMN commission_model text 
      CHECK (commission_model IN ('commissioned', 'rental', 'hybrid')) 
      DEFAULT 'commissioned';
    
    COMMENT ON COLUMN public.professionals.commission_model IS 
      'Modelo de comissionamento do profissional PARA A CLÍNICA: 
       - commissioned: profissional paga X% do valor de cada serviço para a clínica
       - rental: profissional paga valor fixo mensal para a clínica (independente dos serviços)
       - hybrid: profissional paga valor fixo mensal + X% sobre cada serviço para a clínica';
  END IF;

  -- Adicionar rental_base_cents se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'professionals' 
      AND column_name = 'rental_base_cents'
  ) THEN
    ALTER TABLE public.professionals 
      ADD COLUMN rental_base_cents integer 
      DEFAULT 0 
      NOT NULL;
    
    COMMENT ON COLUMN public.professionals.rental_base_cents IS 
      'Valor fixo mensal EM CENTAVOS que o profissional PAGA para a clínica 
       (usado quando commission_model é rental ou hybrid)';
  END IF;

  -- Atualizar commission_rate para aceitar valores decimais maiores se necessário
  -- (já deve estar como numeric, mas garantimos que aceita 0-100)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'professionals' 
      AND column_name = 'commission_rate'
  ) THEN
    -- A coluna já existe, apenas garantir que está correta
    -- Se for numeric(5,2), está OK (suporta até 999.99)
    NULL; -- Não fazer nada se já existe
  END IF;
END
$$;

-- Verificar colunas criadas
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'professionals'
  AND column_name IN ('commission_model', 'commission_rate', 'rental_base_cents')
ORDER BY column_name;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Este script adiciona os campos necessários para suportar os 3 modelos de
-- comissionamento onde o PROFISSIONAL PAGA PARA A CLÍNICA:
-- 
-- 1. commissioned: profissional paga X% (commission_rate) sobre cada serviço
-- 2. rental: profissional paga valor fixo mensal (rental_base_cents)
-- 3. hybrid: profissional paga valor fixo mensal + X% sobre cada serviço
--
-- NOTA: A clínica também paga uma taxa para a plataforma (platform_fee),
--       configurada separadamente nas configurações gerais da clínica.
-- ============================================================================
