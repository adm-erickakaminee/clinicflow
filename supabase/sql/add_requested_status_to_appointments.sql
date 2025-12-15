-- Migration: Adicionar status 'requested' na tabela appointments
-- Data: 2024-12
-- Descrição: Permite que clientes façam solicitações de agendamento que precisam ser confirmadas pela recepcionista

-- Atualizar constraint CHECK para incluir 'requested'
DO $$
BEGIN
  -- Remover constraint antiga
  ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

  -- Adicionar constraint nova com 'requested'
  ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'waiting', 'in_progress', 'medical_done', 'completed', 'cancelled', 'requested'));
END $$;

COMMENT ON COLUMN public.appointments.status IS 'Status do agendamento: requested (solicitado pelo cliente, aguardando confirmação), pending (pendente), confirmed (confirmado), waiting (aguardando), in_progress (em atendimento), medical_done (atendimento médico concluído), completed (finalizado), cancelled (cancelado)';


