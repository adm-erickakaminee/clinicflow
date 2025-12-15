-- Script para atualizar a tabela appointments com novos status e campos
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar novos campos se não existirem
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS check_in_time timestamptz,
ADD COLUMN IF NOT EXISTS start_time_actual timestamptz,
ADD COLUMN IF NOT EXISTS end_time_actual timestamptz,
ADD COLUMN IF NOT EXISTS medical_notes text;

-- 2. Atualizar constraint de status (se existir)
-- Primeiro, remover constraint antiga se existir
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
  END IF;
END $$;

-- 3. Adicionar nova constraint com todos os status
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_status_check 
CHECK (status IN (
  'pending', 
  'confirmed', 
  'waiting', 
  'in_progress', 
  'medical_done', 
  'completed', 
  'cancelled'
));

-- 4. Verificar estrutura atual
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND table_schema = 'public'
ORDER BY ordinal_position;

