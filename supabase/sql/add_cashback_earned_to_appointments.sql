-- Migration: Adicionar coluna cashback_earned_cents na tabela appointments
-- Data: 2024-12
-- Descrição: Armazena o valor de cashback ganho pelo cliente em cada agendamento (em centavos)

-- Adicionar coluna se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'cashback_earned_cents'
  ) THEN
    ALTER TABLE public.appointments
    ADD COLUMN cashback_earned_cents integer DEFAULT 0 CHECK (cashback_earned_cents >= 0);
    
    COMMENT ON COLUMN public.appointments.cashback_earned_cents IS 'Valor de cashback ganho pelo cliente neste agendamento (em centavos). Atualizado no checkout quando o profissional concede cashback.';
  END IF;
END $$;

