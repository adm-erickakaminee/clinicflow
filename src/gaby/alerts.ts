import { differenceInCalendarDays } from 'date-fns'
import type { ToastContext } from '../components/ui/Toast'

export interface GabyConfig {
  cashback_multiplier?: number
  min_profit_margin?: number // ex: 0.2 -> 20%
  retention_cycle_days?: number // ex: 45
}

export function checkPricingAlert(
  priceCents: number,
  costCents: number,
  gabyConfig?: GabyConfig,
  toast?: ToastContext
): string | null {
  if (!gabyConfig?.min_profit_margin) return null
  if (priceCents <= 0 || costCents <= 0) return null
  const margin = (priceCents - costCents) / priceCents
  if (margin < gabyConfig.min_profit_margin) {
    const msg = 'Margem abaixo do mínimo configurado (Gaby). Ajuste o preço/custo.'
    toast?.error?.(msg)
    return msg
  }
  return null
}

export function checkRetentionAlert(
  lastVisit: Date | null,
  cycleDays: number | undefined,
  toast?: ToastContext
): string | null {
  if (!lastVisit || !cycleDays) return null
  const days = differenceInCalendarDays(new Date(), lastVisit)
  if (days > cycleDays) {
    const msg = `Cliente sem retorno há ${days} dias (ciclo ${cycleDays}).`
    toast?.info?.(msg)
    return msg
  }
  return null
}


