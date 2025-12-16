-- ✅ Migration: Corrigir políticas RLS das tabelas Gaby para usar clinic_id
-- Data: $(date)
-- Descrição: Atualiza políticas RLS de gaby_rules, client_retention_data e organization_settings
-- Verifica qual coluna existe (organization_id ou clinic_id) e cria políticas adequadas

DO $$
DECLARE
  gaby_has_org_id boolean;
  gaby_has_clinic_id boolean;
  retention_has_org_id boolean;
  retention_has_clinic_id boolean;
  settings_has_org_id boolean;
  settings_has_clinic_id boolean;
  gaby_col_name text;
  retention_col_name text;
  settings_col_name text;
BEGIN
  -- Verificar quais colunas existem em cada tabela
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'gaby_rules' 
      AND column_name = 'organization_id'
  ) INTO gaby_has_org_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'gaby_rules' 
      AND column_name = 'clinic_id'
  ) INTO gaby_has_clinic_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'client_retention_data' 
      AND column_name = 'organization_id'
  ) INTO retention_has_org_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'client_retention_data' 
      AND column_name = 'clinic_id'
  ) INTO retention_has_clinic_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organization_settings' 
      AND column_name = 'organization_id'
  ) INTO settings_has_org_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organization_settings' 
      AND column_name = 'clinic_id'
  ) INTO settings_has_clinic_id;

  -- Determinar qual coluna usar para cada tabela
  IF gaby_has_clinic_id THEN
    gaby_col_name := 'clinic_id';
  ELSIF gaby_has_org_id THEN
    gaby_col_name := 'organization_id';
  ELSE
    RAISE EXCEPTION 'Tabela gaby_rules não possui coluna organization_id nem clinic_id';
  END IF;

  IF retention_has_clinic_id THEN
    retention_col_name := 'clinic_id';
  ELSIF retention_has_org_id THEN
    retention_col_name := 'organization_id';
  ELSE
    RAISE EXCEPTION 'Tabela client_retention_data não possui coluna organization_id nem clinic_id';
  END IF;

  IF settings_has_clinic_id THEN
    settings_col_name := 'clinic_id';
  ELSIF settings_has_org_id THEN
    settings_col_name := 'organization_id';
  ELSE
    RAISE EXCEPTION 'Tabela organization_settings não possui coluna organization_id nem clinic_id';
  END IF;

  -- ============================================
  -- GABY_RULES
  -- ============================================
  
  -- Remover políticas antigas
  DROP POLICY IF EXISTS "Org members select gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Org members insert gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Org members update gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Org members delete gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Clinic members select gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Clinic members insert gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Clinic members update gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Clinic members delete gaby_rules" ON public.gaby_rules;
  
  -- Criar políticas dinamicamente usando a coluna correta
  -- SELECT
  EXECUTE format('
    CREATE POLICY "Org members select gaby_rules"
      ON public.gaby_rules
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.%I
        )
      )', gaby_col_name);

  -- INSERT
  EXECUTE format('
    CREATE POLICY "Org members insert gaby_rules"
      ON public.gaby_rules
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.%I
        )
      )', gaby_col_name);

  -- UPDATE
  EXECUTE format('
    CREATE POLICY "Org members update gaby_rules"
      ON public.gaby_rules
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.%I
        )
      )', gaby_col_name);

  -- DELETE
  EXECUTE format('
    CREATE POLICY "Org members delete gaby_rules"
      ON public.gaby_rules
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = gaby_rules.%I
        )
      )', gaby_col_name);

  -- ============================================
  -- CLIENT_RETENTION_DATA
  -- ============================================
  
  -- Remover políticas antigas
  DROP POLICY IF EXISTS "Org members select client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Org members insert client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Org members update client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Org members delete client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Clinic members select client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Clinic members insert client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Clinic members update client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Clinic members delete client_retention_data" ON public.client_retention_data;
  
  -- SELECT
  EXECUTE format('
    CREATE POLICY "Org members select client_retention_data"
      ON public.client_retention_data
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.%I
        )
      )', retention_col_name);

  -- INSERT
  EXECUTE format('
    CREATE POLICY "Org members insert client_retention_data"
      ON public.client_retention_data
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.%I
        )
      )', retention_col_name);

  -- UPDATE
  EXECUTE format('
    CREATE POLICY "Org members update client_retention_data"
      ON public.client_retention_data
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.%I
        )
      )', retention_col_name);

  -- DELETE
  EXECUTE format('
    CREATE POLICY "Org members delete client_retention_data"
      ON public.client_retention_data
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = client_retention_data.%I
        )
      )', retention_col_name);

  -- ============================================
  -- ORGANIZATION_SETTINGS
  -- ============================================
  
  -- Remover políticas antigas
  DROP POLICY IF EXISTS "Org members select organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Org members insert organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Org members update organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Org members delete organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Clinic members select organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Clinic members insert organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Clinic members update organization_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "Clinic members delete organization_settings" ON public.organization_settings;
  
  -- SELECT
  EXECUTE format('
    CREATE POLICY "Org members select organization_settings"
      ON public.organization_settings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = organization_settings.%I
        )
      )', settings_col_name);

  -- INSERT
  EXECUTE format('
    CREATE POLICY "Org members insert organization_settings"
      ON public.organization_settings
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = organization_settings.%I
        )
      )', settings_col_name);

  -- UPDATE
  EXECUTE format('
    CREATE POLICY "Org members update organization_settings"
      ON public.organization_settings
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = organization_settings.%I
        )
      )', settings_col_name);

  -- DELETE
  EXECUTE format('
    CREATE POLICY "Org members delete organization_settings"
      ON public.organization_settings
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.clinic_id = organization_settings.%I
        )
      )', settings_col_name);

  -- ============================================
  -- SUPER ADMIN ACCESS
  -- ============================================
  
  -- Remover políticas antigas de super_admin se existirem
  DROP POLICY IF EXISTS "Super admin full access gaby_rules" ON public.gaby_rules;
  DROP POLICY IF EXISTS "Super admin full access client_retention_data" ON public.client_retention_data;
  DROP POLICY IF EXISTS "Super admin full access organization_settings" ON public.organization_settings;
  
  -- Criar políticas de super_admin (não dependem da coluna, apenas do role)
  CREATE POLICY "Super admin full access gaby_rules"
    ON public.gaby_rules
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'super_admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'super_admin'
      )
    );

  CREATE POLICY "Super admin full access client_retention_data"
    ON public.client_retention_data
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'super_admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'super_admin'
      )
    );

  CREATE POLICY "Super admin full access organization_settings"
    ON public.organization_settings
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'super_admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'super_admin'
      )
    );

  RAISE NOTICE '✅ Políticas RLS atualizadas com sucesso';
  RAISE NOTICE 'gaby_rules usa: %', gaby_col_name;
  RAISE NOTICE 'client_retention_data usa: %', retention_col_name;
  RAISE NOTICE 'organization_settings usa: %', settings_col_name;

END $$;

-- Verificar se as políticas foram criadas
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('gaby_rules', 'client_retention_data', 'organization_settings');
  
  RAISE NOTICE 'Total de políticas criadas: %', policy_count;
END $$;
