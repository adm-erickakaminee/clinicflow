-- Adiciona campo de taxa da clínica na tabela professional_goals
-- Esta taxa é o valor mensal que o profissional paga para a clínica

DO $$ 
BEGIN
  -- Adiciona o campo clinic_fee_cents se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professional_goals' 
    AND column_name = 'clinic_fee_cents'
  ) THEN
    ALTER TABLE public.professional_goals
    ADD COLUMN clinic_fee_cents integer DEFAULT 0 CHECK (clinic_fee_cents >= 0);
    
    COMMENT ON COLUMN public.professional_goals.clinic_fee_cents IS 
    'Valor mensal em centavos que o profissional paga para a clínica (taxa/comissão fixa mensal)';
  END IF;
END $$;

