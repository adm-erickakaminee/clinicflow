import { useMemo } from "react";

export type CheckoutItem = {
  id: string;
  name: string;
  price_cents: number;
  quantity?: number;
  type?: "service" | "product";
};

export type CheckoutCalculationInput = {
  items: CheckoutItem[];
  discount_amount_cents?: number;
  cashback_to_redeem_cents?: number;
  platform_fee_percent?: number; // default 6%
};

export type CheckoutCalculationResult = {
  subtotal_gross: number;
  platform_fee: number;
  total_to_pay_clinic: number;
  split_base_value: number;
  service_subtotal: number;
};

function toInt(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 0;
  return Math.round(value);
}

export function useCheckoutCalculator({
  items,
  discount_amount_cents = 0,
  cashback_to_redeem_cents = 0,
  platform_fee_percent = 0.06,
}: CheckoutCalculationInput): CheckoutCalculationResult {
  return useMemo(() => {
    const subtotal_gross = items.reduce((acc, item) => {
      const qty = item.quantity ?? 1;
      return acc + toInt(item.price_cents) * qty;
    }, 0);

    const service_subtotal = items
      .filter((i) => i.type === "service")
      .reduce((acc, item) => acc + toInt(item.price_cents) * (item.quantity ?? 1), 0);

    const discount = toInt(discount_amount_cents);
    const cashback = toInt(cashback_to_redeem_cents);

    const platform_fee = toInt(subtotal_gross * platform_fee_percent);

    const total_to_pay_clinic = Math.max(subtotal_gross - discount - cashback, 0);

    const split_base_value = Math.max(subtotal_gross - platform_fee, 0);

    return {
      subtotal_gross,
      platform_fee,
      total_to_pay_clinic,
      split_base_value,
      service_subtotal,
    };
  }, [items, discount_amount_cents, cashback_to_redeem_cents, platform_fee_percent]);
}
