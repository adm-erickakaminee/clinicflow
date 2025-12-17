-- ✅ Migration: Adicionar campo rental_due_day na tabela professionals
-- Data: $(date)
-- Descrição: Campo para armazenar o dia do mês em que a cobrança fixa mensal vence (1-28)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'professionals' 
      AND column_name = 'rental_due_day'
  ) THEN
    ALTER TABLE public.professionals
    ADD COLUMN rental_due_day integer CHECK (rental_due_day >= 1 AND rental_due_day <= 28) DEFAULT 5;
    
    RAISE NOTICE '✅ Coluna rental_due_day adicionada';
  END IF;
END $$;

COMMENT ON COLUMN public.professionals.rental_due_day IS 'Dia do mês (1-28) em que a cobrança fixa mensal vence para profissionais com modelo rental ou hybrid';

