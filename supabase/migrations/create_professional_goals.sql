-- professional_goals: Tabela para metas, custos e calculos pessoais do profissional
CREATE TABLE IF NOT EXISTS professional_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  monthly_cost_cents integer DEFAULT 0 CHECK (monthly_cost_cents >= 0),
  monthly_income_goal_cents integer DEFAULT 0 CHECK (monthly_income_goal_cents >= 0),
  target_hourly_rate_cents integer DEFAULT 0 CHECK (target_hourly_rate_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id)
);

-- Habilitar RLS
ALTER TABLE professional_goals ENABLE ROW LEVEL SECURITY;

-- RLS: Apenas o dono pode ver suas próprias metas
CREATE POLICY "Profissionais veem suas metas"
ON professional_goals FOR SELECT 
USING (profile_id = auth.uid());

-- RLS: Profissionais podem inserir suas próprias metas
CREATE POLICY "Profissionais podem inserir suas metas"
ON professional_goals FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- RLS: Profissionais podem atualizar suas metas
CREATE POLICY "Profissionais podem atualizar suas metas"
ON professional_goals FOR UPDATE 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_professional_goals_profile_id ON professional_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_professional_goals_clinic_id ON professional_goals(clinic_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_professional_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_professional_goals_updated_at
BEFORE UPDATE ON professional_goals
FOR EACH ROW
EXECUTE FUNCTION update_professional_goals_updated_at();

