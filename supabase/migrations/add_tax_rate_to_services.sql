-- Migration: Adicionar campo de taxa de imposto na tabela services
-- Impostos são calculados como porcentagem sobre o valor vendido do produto/serviço

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS tax_rate_percent numeric(5,2) DEFAULT 0 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100);

COMMENT ON COLUMN services.tax_rate_percent IS 'Taxa de imposto em porcentagem (0-100%) aplicada sobre o valor do serviço. Ex: 5.00 = 5%';

-- Exemplo: Se um serviço custa R$ 100 e tem tax_rate_percent = 5, o imposto será R$ 5

