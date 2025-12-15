-- Migration: Atualizar professional_goals com campos detalhados de custos fixos
-- Esta migration substitui os campos genéricos por campos detalhados para cálculo preciso

-- Primeiro, adicionar novos campos detalhados de custos fixos mensais (em centavos)
ALTER TABLE professional_goals
  ADD COLUMN IF NOT EXISTS fixed_cost_rent_cents integer DEFAULT 0 CHECK (fixed_cost_rent_cents >= 0),
  ADD COLUMN IF NOT EXISTS fixed_cost_utilities_cents integer DEFAULT 0 CHECK (fixed_cost_utilities_cents >= 0),
  ADD COLUMN IF NOT EXISTS fixed_cost_transport_cents integer DEFAULT 0 CHECK (fixed_cost_transport_cents >= 0),
  ADD COLUMN IF NOT EXISTS fixed_cost_salary_cents integer DEFAULT 0 CHECK (fixed_cost_salary_cents >= 0),
  ADD COLUMN IF NOT EXISTS fixed_cost_other_cents integer DEFAULT 0 CHECK (fixed_cost_other_cents >= 0),
  ADD COLUMN IF NOT EXISTS profit_margin_cents integer DEFAULT 0 CHECK (profit_margin_cents >= 0);

-- Atualizar horas disponíveis por mês (substituir availableHours se existir)
ALTER TABLE professional_goals
  ADD COLUMN IF NOT EXISTS hours_available_per_month integer NOT NULL DEFAULT 160 CHECK (hours_available_per_month > 0);

-- Migrar dados antigos para as novas colunas (se existirem)
DO $$
BEGIN
  -- Se monthly_cost_cents existir, copiar valor para fixed_cost_other_cents
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public'
             AND table_name = 'professional_goals' 
             AND column_name = 'monthly_cost_cents') THEN
    UPDATE professional_goals
    SET fixed_cost_other_cents = monthly_cost_cents
    WHERE fixed_cost_other_cents = 0 AND monthly_cost_cents > 0;
  END IF;
END $$;

-- Remover colunas antigas se existirem (após migração dos dados)
ALTER TABLE professional_goals 
  DROP COLUMN IF EXISTS monthly_cost_cents,
  DROP COLUMN IF EXISTS target_hourly_rate_cents;

-- Remover campo de impostos (impostos são calculados sobre vendas, não custo fixo)
ALTER TABLE professional_goals
  DROP COLUMN IF EXISTS fixed_cost_taxes_cents;

-- Comentários para documentação
COMMENT ON COLUMN professional_goals.fixed_cost_rent_cents IS 'Custo fixo mensal de aluguel/imóvel em centavos';
COMMENT ON COLUMN professional_goals.fixed_cost_utilities_cents IS 'Custo fixo mensal de utilidades (luz, água, internet) em centavos';
COMMENT ON COLUMN professional_goals.fixed_cost_transport_cents IS 'Custo fixo mensal de transporte em centavos';
COMMENT ON COLUMN professional_goals.fixed_cost_salary_cents IS 'Salário/Pró-Labore desejado mensal em centavos';
COMMENT ON COLUMN professional_goals.fixed_cost_other_cents IS 'Outros custos fixos mensais em centavos';
COMMENT ON COLUMN professional_goals.profit_margin_cents IS 'Margem de lucro mensal desejada para reinvestimentos em centavos';
COMMENT ON COLUMN professional_goals.hours_available_per_month IS 'Horas disponíveis para trabalho por mês (padrão: 160h = 40h/semana x 4)';
COMMENT ON COLUMN professional_goals.monthly_income_goal_cents IS 'Meta de renda total mensal desejada em centavos';

