import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useScheduler } from "../context/SchedulerContext";

type Props = {
  open: boolean;
  onClose: () => void;
  durationMinutes: number;
  onApply: (price: number) => void;
};

export function PricingCalculatorModal({ open, onClose, durationMinutes, onApply }: Props) {
  const { pricingSettings, updatePricingSettings } = useScheduler();
  const [step, setStep] = useState(1);
  const [salary, setSalary] = useState(pricingSettings.salaryMonthly);
  const [fixed, setFixed] = useState(pricingSettings.fixedMonthly);
  const [hoursPerDay, setHoursPerDay] = useState(pricingSettings.hoursPerDay);
  const [daysPerMonth, setDaysPerMonth] = useState(pricingSettings.daysPerMonth);
  const [materials, setMaterials] = useState(10);
  const [tax, setTax] = useState(pricingSettings.taxPercent);
  const [card, setCard] = useState(pricingSettings.cardPercent);
  const [commission, setCommission] = useState(pricingSettings.commissionPercent);
  const [profit, setProfit] = useState(pricingSettings.profitPercent);

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const custoHora = useMemo(() => {
    const denom = hoursPerDay * daysPerMonth || 1;
    return (salary + fixed) / denom;
  }, [salary, fixed, hoursPerDay, daysPerMonth]);

  const maoObra = useMemo(() => (custoHora * durationMinutes) / 60, [custoHora, durationMinutes]);
  const custoBase = useMemo(() => maoObra + materials, [maoObra, materials]);

  const precoSugerido = useMemo(() => {
    const totalPercent = tax + card + commission + profit;
    const fator = 1 - totalPercent / 100;
    if (fator <= 0) return custoBase;
    return custoBase / fator;
  }, [tax, card, commission, profit, custoBase]);

  const breakdown = useMemo(() => {
    const totalPercent = tax + card + commission + profit;
    const fator = 1 - totalPercent / 100;
    const price = fator > 0 ? custoBase / fator : custoBase;
    const impostos = (price * tax) / 100;
    const cartao = (price * card) / 100;
    const comiss = (price * commission) / 100;
    const lucro = price - (custoBase + impostos + cartao + comiss);
    return {
      price,
      custoBase,
      impostos,
      cartao,
      comiss,
      lucro,
    };
  }, [tax, card, commission, profit, custoBase]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">🪄 Ajuda para Precificar</p>
            <p className="text-xs text-gray-600">3 passos para sugerir um preço ideal</p>
          </div>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <Stepper current={step} />

        {/* Passo 1 */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Passo 1: Quanto vale seu tempo?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InputNumber
                label="Salário mensal desejado (R$)"
                value={salary}
                onChange={setSalary}
              />
              <InputNumber label="Custos fixos mensais (R$)" value={fixed} onChange={setFixed} />
              <InputNumber
                label="Horas trabalhadas por dia"
                value={hoursPerDay}
                onChange={setHoursPerDay}
              />
              <InputNumber
                label="Dias trabalhados por mês"
                value={daysPerMonth}
                onChange={setDaysPerMonth}
              />
            </div>
            <div className="rounded-2xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 shadow-sm">
              Seu custo hora é: <span className="font-semibold">R$ {custoHora.toFixed(2)}</span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  updatePricingSettings({
                    salaryMonthly: salary,
                    fixedMonthly: fixed,
                    hoursPerDay,
                    daysPerMonth,
                  });
                  setStep(2);
                }}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Passo 2 */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Passo 2: Custos do procedimento</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InputNumber
                label="Duração do serviço (min)"
                value={durationMinutes}
                onChange={() => {}}
                disabled
              />
              <InputNumber
                label="Custo de materiais/produtos (R$)"
                value={materials}
                onChange={setMaterials}
              />
            </div>
            <div className="rounded-2xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 shadow-sm space-y-1">
              <div>Custo mão de obra: R$ {maoObra.toFixed(2)}</div>
              <div>Materiais: R$ {materials.toFixed(2)}</div>
              <div className="font-semibold">Custo base: R$ {custoBase.toFixed(2)}</div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-sm font-semibold text-gray-900"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Passo 3 */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Passo 3: Venda e Lucro (Markup)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InputNumber label="Impostos (%)" value={tax} onChange={setTax} />
              <InputNumber label="Taxa de cartão (%)" value={card} onChange={setCard} />
              <InputNumber label="Comissão (%)" value={commission} onChange={setCommission} />
              <InputNumber
                label="Margem de lucro desejada (%)"
                value={profit}
                onChange={setProfit}
              />
            </div>
            <div className="rounded-2xl bg-white/70 border border-white/60 px-3 py-3 text-sm text-gray-900 shadow-sm space-y-1">
              <div>
                Preço sugerido:{" "}
                <span className="text-xl font-bold">R$ {precoSugerido.toFixed(2)}</span>
              </div>
              <div className="space-y-1 text-xs text-gray-700">
                <Bar
                  label="Custo"
                  value={breakdown.custoBase}
                  total={breakdown.price}
                  color="#0f172a"
                />
                <Bar
                  label="Impostos"
                  value={breakdown.impostos}
                  total={breakdown.price}
                  color="#f59e0b"
                />
                <Bar
                  label="Cartão"
                  value={breakdown.cartao}
                  total={breakdown.price}
                  color="#6366f1"
                />
                <Bar
                  label="Comissão"
                  value={breakdown.comiss}
                  total={breakdown.price}
                  color="#22c55e"
                />
                <Bar
                  label="Lucro"
                  value={breakdown.lucro}
                  total={breakdown.price}
                  color="#ef4444"
                />
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-sm font-semibold text-gray-900"
              >
                Voltar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updatePricingSettings({
                      taxPercent: tax,
                      cardPercent: card,
                      commissionPercent: commission,
                      profitPercent: profit,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-sm font-semibold text-gray-900"
                >
                  Salvar preferências
                </button>
                <button
                  onClick={() => {
                    onApply(precoSugerido);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Usar este preço
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold text-gray-700">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`flex-1 h-2 rounded-full ${current >= s ? "bg-gray-900" : "bg-white/70 border border-white/60"}`}
        />
      ))}
    </div>
  );
}

function InputNumber({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 disabled:bg-gray-100"
      />
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between">
        <span>{label}</span>
        <span>R$ {value.toFixed(2)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/70 border border-white/60 overflow-hidden">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}
