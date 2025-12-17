-- ✅ Migration: Criar tabela para gerenciar cobranças fixas mensais (rental) de profissionais
-- Data: $(date)
-- Descrição: Tabela para armazenar links de pagamento gerados automaticamente para profissionais com modelo rental/hybrid

CREATE TABLE IF NOT EXISTS public.professional_rental_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL, -- Valor em centavos
  due_date date NOT NULL, -- Data de vencimento
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  asaas_payment_id text, -- ID do pagamento no Asaas
  payment_link text, -- Link para pagamento (Pix QR Code ou URL)
  pix_qr_code text, -- QR Code Pix (base64 ou URL)
  pix_copy_paste text, -- Código Pix copia e cola
  paid_at timestamptz, -- Data de pagamento
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_professional_rental_billings_professional_id ON public.professional_rental_billings(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_rental_billings_clinic_id ON public.professional_rental_billings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_professional_rental_billings_status ON public.professional_rental_billings(status);
CREATE INDEX IF NOT EXISTS idx_professional_rental_billings_due_date ON public.professional_rental_billings(due_date);

-- RLS
ALTER TABLE public.professional_rental_billings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$
BEGIN
  -- Profissionais podem ver suas próprias cobranças
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'professional_rental_billings' 
      AND policyname = 'Professionals can view own billings'
  ) THEN
    CREATE POLICY "Professionals can view own billings"
      ON public.professional_rental_billings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.professional_id = professional_rental_billings.professional_id
        )
      );
  END IF;

  -- Admins podem ver todas as cobranças da clínica
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'professional_rental_billings' 
      AND policyname = 'Admins can view clinic billings'
  ) THEN
    CREATE POLICY "Admins can view clinic billings"
      ON public.professional_rental_billings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = professional_rental_billings.clinic_id
            AND p.role IN ('admin', 'clinic_owner')
        )
      );
  END IF;
END $$;

-- Comentários
COMMENT ON TABLE public.professional_rental_billings IS 'Cobranças fixas mensais (rental) geradas automaticamente para profissionais';
COMMENT ON COLUMN public.professional_rental_billings.due_date IS 'Data de vencimento da cobrança';
COMMENT ON COLUMN public.professional_rental_billings.status IS 'Status da cobrança: pending, paid, overdue, cancelled';
COMMENT ON COLUMN public.professional_rental_billings.amount_cents IS 'Valor da cobrança em centavos';
COMMENT ON COLUMN public.professional_rental_billings.asaas_payment_id IS 'ID do pagamento gerado no Asaas';
COMMENT ON COLUMN public.professional_rental_billings.payment_link IS 'Link para pagamento (Pix QR Code ou URL)';

