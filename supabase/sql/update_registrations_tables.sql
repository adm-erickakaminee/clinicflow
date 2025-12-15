-- Script SQL para atualizar as tabelas de Cadastros
-- Execute este script no Supabase SQL Editor

-- 1. Atualizar tabela professionals
-- Adicionar colunas se não existirem
DO $$
BEGIN
  -- Adicionar role se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professionals' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.professionals ADD COLUMN role text;
  END IF;

  -- Adicionar color se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professionals' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE public.professionals ADD COLUMN color text DEFAULT '#6366f1';
  END IF;

  -- Adicionar commission_rate se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professionals' 
    AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE public.professionals ADD COLUMN commission_rate numeric(5,2) DEFAULT 0;
  END IF;

  -- Adicionar avatar_url se não existir (pode já existir como 'avatar')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professionals' 
    AND column_name = 'avatar_url'
  ) THEN
    -- Se existe 'avatar', copiar para 'avatar_url' e depois remover 'avatar'
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'professionals' 
      AND column_name = 'avatar'
    ) THEN
      ALTER TABLE public.professionals ADD COLUMN avatar_url text;
      UPDATE public.professionals SET avatar_url = avatar WHERE avatar IS NOT NULL;
      -- Não removemos 'avatar' para manter compatibilidade, mas podemos usar 'avatar_url' daqui pra frente
    ELSE
      ALTER TABLE public.professionals ADD COLUMN avatar_url text;
    END IF;
  END IF;

  -- Adicionar work_schedule (JSONB) para jornada de trabalho
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professionals' 
    AND column_name = 'work_schedule'
  ) THEN
    ALTER TABLE public.professionals ADD COLUMN work_schedule jsonb DEFAULT NULL;
  END IF;
END $$;

-- 2. Atualizar tabela services
-- Adicionar professional_ids (array de UUIDs) se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'professional_ids'
  ) THEN
    ALTER TABLE public.services ADD COLUMN professional_ids uuid[] DEFAULT NULL;
    
    -- Migrar dados existentes: se existe professional_id (singular), converter para array
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'services' 
      AND column_name = 'professional_id'
    ) THEN
      UPDATE public.services 
      SET professional_ids = ARRAY[professional_id]::uuid[]
      WHERE professional_id IS NOT NULL 
        AND professional_id != 'all'::text
        AND professional_ids IS NULL;
    END IF;
  END IF;
END $$;

-- 3. Garantir que a tabela clinics existe e tem os campos necessários
DO $$
BEGIN
  -- Verificar se a tabela clinics existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clinics'
  ) THEN
    -- Criar tabela clinics se não existir
    CREATE TABLE IF NOT EXISTS public.clinics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      phone text,
      email text,
      address text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;

  -- Adicionar colunas se não existirem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinics' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.clinics ADD COLUMN phone text;
  END IF;
END $$;

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_professionals_clinic_id ON public.professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_services_clinic_id ON public.services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_services_professional_ids ON public.services USING GIN(professional_ids);

-- 5. Comentários para documentação
COMMENT ON COLUMN public.professionals.role IS 'Cargo/Especialidade do profissional (ex: Dermatologista, Esteticista)';
COMMENT ON COLUMN public.professionals.color IS 'Cor usada na agenda para identificar o profissional';
COMMENT ON COLUMN public.professionals.commission_rate IS 'Percentual de comissão sobre serviços realizados (0-100)';
COMMENT ON COLUMN public.professionals.work_schedule IS 'Jornada de trabalho do profissional em formato JSONB: {days: [0-6], start: "HH:mm", end: "HH:mm", breakStart?: "HH:mm", breakEnd?: "HH:mm"}';
COMMENT ON COLUMN public.services.professional_ids IS 'Array de UUIDs dos profissionais que podem realizar este serviço. NULL ou vazio = todos da clínica';

-- Verificação final
SELECT 
  'Tabela professionals - Colunas:' as info,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'professionals'
UNION ALL
SELECT 
  'Tabela services - Colunas:' as info,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'services'
UNION ALL
SELECT 
  'Tabela clinics - Colunas:' as info,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'clinics';
