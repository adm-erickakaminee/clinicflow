import { z } from 'zod'

const paymentMethodEnum = z.enum(['pix', 'credit', 'cash', 'proprietary_machine'])

const moneyInt = z
  .number({
    required_error: 'Valor é obrigatório',
    invalid_type_error: 'Valor inválido',
  })
  .int('Valor deve estar em centavos (inteiro)')
  .nonnegative('Valor não pode ser negativo')

const itemSchema = z.object({
  id: z.string().min(1, 'Item inválido'),
  name: z.string().min(1, 'Nome do item é obrigatório'),
  price_cents: moneyInt,
  quantity: z.number().int().positive().optional().default(1),
  type: z.enum(['service', 'product']).optional(),
})

export const checkoutSchema = z
  .object({
    clinic_id: z.string().uuid(), // ✅ Mudado de organization_id para clinic_id
    appointment_id: z.string().uuid().optional(),
    client_id: z.string().uuid().optional(),
    items: z.array(itemSchema).min(1, 'Inclua ao menos um item'),
    payment_method: paymentMethodEnum,
    amount_paid: moneyInt,
    discount_amount_cents: moneyInt.optional().default(0),
    cashback_to_redeem_cents: moneyInt.optional().default(0),
    subtotal_gross: moneyInt,
    platform_fee: moneyInt,
    total_to_pay_clinic: moneyInt,
    split_base_value: moneyInt,
    service_subtotal: moneyInt.optional().default(0),
    cashback_multiplier: z.number().positive().default(3),
  })
  .refine((data) => data.amount_paid >= data.total_to_pay_clinic, {
    message: 'amount_paid deve ser maior ou igual ao total_to_pay_clinic',
    path: ['amount_paid'],
  })
  .refine(
    (data) => {
      if (!data.cashback_to_redeem_cents) return true
      // Regra: pode usar até 33% do valor do serviço em cashback
      const maxUsable = Math.floor(data.service_subtotal * 0.33)
      return data.cashback_to_redeem_cents <= maxUsable
    },
    {
      message: 'Cashback só pode ser usado até 33% do valor do serviço',
      path: ['cashback_to_redeem_cents'],
    }
  )

export type CheckoutPayload = z.infer<typeof checkoutSchema>
export type PaymentMethod = z.infer<typeof paymentMethodEnum>


