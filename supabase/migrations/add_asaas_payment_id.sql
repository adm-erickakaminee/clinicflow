-- Migration: Adicionar campo asaas_payment_id em financial_transactions
-- Data: 2024
-- Descrição: Armazena o ID único do pagamento no Asaas
--            Campo CRÍTICO para rastreamento e busca de pagamentos específicos

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financial_transactions' 
      AND column_name = 'asaas_payment_id'
  ) THEN
    ALTER TABLE public.financial_transactions 
    ADD COLUMN asaas_payment_id text;
    
    COMMENT ON COLUMN public.financial_transactions.asaas_payment_id IS 
      'ID único do pagamento no Asaas (campo "id" nas respostas de pagamento). '
      'CRÍTICO para: '
      '- Buscar pagamento específico no Asaas via API '
      '- Reconciliação de pagamentos '
      '- Suporte e troubleshooting '
      '- Rastreamento de status de pagamentos via webhook';
      
    -- Criar índice único para garantir que não duplicamos pagamentos
    CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_transactions_asaas_payment_id_unique 
    ON public.financial_transactions(asaas_payment_id) 
    WHERE asaas_payment_id IS NOT NULL;
    
    -- Índice para queries rápidas
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_asaas_payment_id 
    ON public.financial_transactions(asaas_payment_id) 
    WHERE asaas_payment_id IS NOT NULL;
  END IF;
END $$;

-- Adicionar campos adicionais úteis (opcional mas recomendado)
DO $$ 
BEGIN
  -- Link da fatura/invoice
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financial_transactions' 
      AND column_name = 'asaas_invoice_url'
  ) THEN
    ALTER TABLE public.financial_transactions 
    ADD COLUMN asaas_invoice_url text;
    
    COMMENT ON COLUMN public.financial_transactions.asaas_invoice_url IS 
      'URL da fatura/invoice do pagamento no Asaas (campo "invoiceUrl" nas respostas). '
      'Útil para envio por email ou acesso direto pelo usuário.';
  END IF;
  
  -- QR Code PIX
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financial_transactions' 
      AND column_name = 'asaas_pix_qr_code'
  ) THEN
    ALTER TABLE public.financial_transactions 
    ADD COLUMN asaas_pix_qr_code text;
    
    COMMENT ON COLUMN public.financial_transactions.asaas_pix_qr_code IS 
      'QR Code PIX do pagamento (campo "pixQrCode" nas respostas). '
      'Usado para exibir QR Code na UI para pagamento via PIX.';
  END IF;
  
  -- Código PIX copia-e-cola
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financial_transactions' 
      AND column_name = 'asaas_pix_copy_paste'
  ) THEN
    ALTER TABLE public.financial_transactions 
    ADD COLUMN asaas_pix_copy_paste text;
    
    COMMENT ON COLUMN public.financial_transactions.asaas_pix_copy_paste IS 
      'Código PIX copia-e-cola (campo "pixCopiaECola" nas respostas). '
      'Usado para permitir que o usuário copie o código PIX.';
  END IF;
END $$;

