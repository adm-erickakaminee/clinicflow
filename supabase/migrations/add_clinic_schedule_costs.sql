-- ✅ Migration: Adicionar campos de turno e custos na tabela organizations
-- Data: $(date)
-- Descrição: Adiciona campos para armazenar horários de funcionamento e custos mensais da clínica

-- Adicionar colunas se não existirem
DO $$
BEGIN
  -- Horários de funcionamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'schedule_start_time'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN schedule_start_time time;
    
    RAISE NOTICE '✅ Coluna schedule_start_time adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'schedule_end_time'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN schedule_end_time time;
    
    RAISE NOTICE '✅ Coluna schedule_end_time adicionada';
  END IF;

  -- Dias da semana (array de números: 0=domingo, 1=segunda, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'schedule_weekdays'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN schedule_weekdays integer[] DEFAULT ARRAY[]::integer[];
    
    RAISE NOTICE '✅ Coluna schedule_weekdays adicionada';
  END IF;

  -- Total de custos mensais (em centavos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'monthly_costs_cents'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN monthly_costs_cents integer DEFAULT 0;
    
    RAISE NOTICE '✅ Coluna monthly_costs_cents adicionada';
  END IF;

  -- Custo por hora calculado (em centavos) - será calculado automaticamente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'hourly_cost_cents'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN hourly_cost_cents integer DEFAULT 0;
    
    RAISE NOTICE '✅ Coluna hourly_cost_cents adicionada';
  END IF;
END $$;

-- Comentários nas colunas
COMMENT ON COLUMN public.organizations.schedule_start_time IS 'Horário de início do funcionamento da clínica';
COMMENT ON COLUMN public.organizations.schedule_end_time IS 'Horário de fim do funcionamento da clínica';
COMMENT ON COLUMN public.organizations.schedule_weekdays IS 'Array de dias da semana (0=domingo, 1=segunda, ..., 6=sábado)';
COMMENT ON COLUMN public.organizations.monthly_costs_cents IS 'Total de custos mensais da clínica em centavos';
COMMENT ON COLUMN public.organizations.hourly_cost_cents IS 'Custo por hora calculado automaticamente em centavos';

