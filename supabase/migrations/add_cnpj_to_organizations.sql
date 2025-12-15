-- Adicionar coluna CNPJ à tabela organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN cnpj TEXT;
    
    RAISE NOTICE '✅ Campo cnpj adicionado em organizations';
  ELSE
    RAISE NOTICE '⚠️ Campo cnpj já existe em organizations';
  END IF;
END
$$;

-- Comentário para documentação
COMMENT ON COLUMN public.organizations.cnpj IS
'CNPJ (Cadastro Nacional da Pessoa Jurídica) da organização/clínica. Formato: XX.XXX.XXX/XXXX-XX';

