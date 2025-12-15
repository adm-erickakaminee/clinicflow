-- ============================================================================
-- SCRIPT CRÍTICO: Unificação Final de Colunas da Tabela appointments
-- ============================================================================
-- Este script garante que todas as colunas de appointments estejam com
-- nomes unificados em snake_case para leitura correta pelo frontend.
-- ============================================================================

DO $$ 
BEGIN
  -- Verificar e renomear id_do_cliente para client_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_do_cliente'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_do_cliente" TO client_id;
    RAISE NOTICE '✅ Coluna id_do_cliente renomeada para client_id';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna client_id já existe ou id_do_cliente não existe';
  END IF;

  -- Verificar e renomear id_do_servico para service_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_do_servico'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_do_servico" TO service_id;
    RAISE NOTICE '✅ Coluna id_do_servico renomeada para service_id';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna service_id já existe ou id_do_servico não existe';
  END IF;

  -- Verificar e renomear id_do_profissional para professional_id (se ainda existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_do_profissional'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_do_profissional" TO professional_id;
    RAISE NOTICE '✅ Coluna id_do_profissional renomeada para professional_id';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna professional_id já existe ou id_do_profissional não existe';
  END IF;

  -- Verificar outras variações possíveis de nomes em português
  -- id_do_cliente, id_cliente, cliente_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_cliente'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_cliente" TO client_id;
    RAISE NOTICE '✅ Coluna id_cliente renomeada para client_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "cliente_id" TO client_id;
    RAISE NOTICE '✅ Coluna cliente_id renomeada para client_id';
  END IF;

  -- id_do_servico, id_servico, servico_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_servico'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_servico" TO service_id;
    RAISE NOTICE '✅ Coluna id_servico renomeada para service_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'servico_id'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "servico_id" TO service_id;
    RAISE NOTICE '✅ Coluna servico_id renomeada para service_id';
  END IF;

  -- id_do_profissional, id_profissional, profissional_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'id_profissional'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "id_profissional" TO professional_id;
    RAISE NOTICE '✅ Coluna id_profissional renomeada para professional_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'profissional_id'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN "profissional_id" TO professional_id;
    RAISE NOTICE '✅ Coluna profissional_id renomeada para professional_id';
  END IF;

  RAISE NOTICE '✅ Unificação de colunas de appointments concluída!';
END $$;

-- Verificar estrutura final da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appointments'
ORDER BY ordinal_position;
