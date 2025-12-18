/**
 * Funções utilitárias para cálculos relacionados às metas do profissional
 */

export interface ProfessionalGoals {
  id?: string;
  profile_id: string;
  clinic_id: string;
  fixed_cost_rent_cents: number;
  fixed_cost_utilities_cents: number;
  fixed_cost_transport_cents: number;
  fixed_cost_salary_cents: number;
  fixed_cost_other_cents: number;
  profit_margin_cents: number; // Margem de lucro para reinvestimentos
  clinic_fee_cents: number; // Taxa mensal que o profissional paga para a clínica
  hours_available_per_month: number;
  monthly_income_goal_cents: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Calcula o custo total fixo mensal (soma de todos os custos fixos)
 * @param goals - Objeto com os custos detalhados do profissional
 * @returns Custo total fixo mensal em centavos
 */
export const calculateTotalFixedCostCents = (goals: ProfessionalGoals): number => {
  return (
    goals.fixed_cost_rent_cents +
    goals.fixed_cost_utilities_cents +
    goals.fixed_cost_transport_cents +
    goals.fixed_cost_salary_cents +
    goals.fixed_cost_other_cents
  );
};

/**
 * Calcula o custo por hora baseado nos custos fixos mensais
 * @param goals - Objeto com os custos detalhados e horas disponíveis
 * @returns Custo por hora em centavos (ou 0 se horas não estiverem definidas)
 */
export const calculateHourlyCost = (goals: ProfessionalGoals): number => {
  const totalFixedCostCents = calculateTotalFixedCostCents(goals);

  // Retorna o Custo por Hora em centavos (ou zero se horas não estiverem definidas)
  if (goals.hours_available_per_month > 0) {
    return Math.round(totalFixedCostCents / goals.hours_available_per_month);
  }
  return 0;
};

/**
 * Calcula o valor hora necessário para atingir a meta de renda
 * Considera: custos fixos + meta de renda mensal
 * @param goals - Objeto com custos detalhados, horas disponíveis e meta de renda
 * @returns Valor hora necessário em centavos
 */
export const calculateTargetHourlyRate = (goals: ProfessionalGoals): number => {
  const totalFixedCostCents = calculateTotalFixedCostCents(goals);
  const totalNeededCents =
    totalFixedCostCents + goals.monthly_income_goal_cents + goals.profit_margin_cents;

  if (goals.hours_available_per_month > 0) {
    return Math.round(totalNeededCents / goals.hours_available_per_month);
  }
  return 0;
};

/**
 * Formata valor em centavos para moeda brasileira
 * @param cents - Valor em centavos
 * @returns String formatada (ex: "R$ 150,00")
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};
