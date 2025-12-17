-- ✅ Migration: Adicionar flag de onboarding na tabela profiles
-- Data: $(date)
-- Descrição: Adiciona coluna has_seen_gaby_onboarding para controlar se o usuário já viu o onboarding

-- Adicionar coluna se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'has_seen_gaby_onboarding'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN has_seen_gaby_onboarding boolean NOT NULL DEFAULT false;
    
    RAISE NOTICE '✅ Coluna has_seen_gaby_onboarding adicionada à tabela profiles';
  ELSE
    RAISE NOTICE '⚠️ Coluna has_seen_gaby_onboarding já existe na tabela profiles';
  END IF;
END $$;

-- Comentário na coluna
COMMENT ON COLUMN public.profiles.has_seen_gaby_onboarding IS 
'Flag que indica se o usuário admin já completou o onboarding da Gaby. false = mostrar onboarding, true = já viu';

