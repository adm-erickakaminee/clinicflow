-- ============================================================================
-- RECRIAR POLÍTICAS RLS: TABELAS DEPENDENTES
-- ============================================================================
-- Este script recria as políticas RLS das tabelas que tiveram políticas removidas
-- porque dependiam de profiles.organization_id
-- Agora usam clinic_id ou a função auxiliar user_organization_and_role()
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROFESSIONAL_SERVICES
-- ============================================================================

-- Verificar se a tabela existe e tem clinic_id ou organization_id
DO $$
DECLARE
    has_clinic_id BOOLEAN;
    has_organization_id BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'professional_services'
        AND column_name = 'clinic_id'
    ) INTO has_clinic_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'professional_services'
        AND column_name = 'organization_id'
    ) INTO has_organization_id;
    
    IF has_clinic_id THEN
        -- Usar clinic_id diretamente
        DROP POLICY IF EXISTS "Allow org members select professional_services" ON public.professional_services;
        CREATE POLICY "Allow org members select professional_services"
          ON public.professional_services
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = professional_services.clinic_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Allow org members insert professional_services" ON public.professional_services;
        CREATE POLICY "Allow org members insert professional_services"
          ON public.professional_services
          FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = professional_services.clinic_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Allow org members delete professional_services" ON public.professional_services;
        CREATE POLICY "Allow org members delete professional_services"
          ON public.professional_services
          FOR DELETE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = professional_services.clinic_id
                OR uoar.role = 'super_admin'
            )
          );
        
        RAISE NOTICE '✅ Políticas RLS criadas para professional_services usando clinic_id';
    ELSIF has_organization_id THEN
        -- Usar organization_id
        DROP POLICY IF EXISTS "Allow org members select professional_services" ON public.professional_services;
        CREATE POLICY "Allow org members select professional_services"
          ON public.professional_services
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = professional_services.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Allow org members insert professional_services" ON public.professional_services;
        CREATE POLICY "Allow org members insert professional_services"
          ON public.professional_services
          FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = professional_services.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Allow org members delete professional_services" ON public.professional_services;
        CREATE POLICY "Allow org members delete professional_services"
          ON public.professional_services
          FOR DELETE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = professional_services.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        RAISE NOTICE '✅ Políticas RLS criadas para professional_services usando organization_id';
    ELSE
        RAISE NOTICE '⚠️ Tabela professional_services não encontrada ou sem campo de organização';
    END IF;
END $$;

-- ============================================================================
-- FINANCIAL_TRANSACTIONS
-- ============================================================================

-- Esta tabela já tem organization_id próprio (não precisa de profiles.organization_id)
-- Criar políticas usando organization_id da própria tabela
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'financial_transactions'
    ) THEN
        DROP POLICY IF EXISTS "Allow org members select financial_transactions" ON public.financial_transactions;
        CREATE POLICY "Allow org members select financial_transactions"
          ON public.financial_transactions
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = financial_transactions.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Allow org members insert financial_transactions" ON public.financial_transactions;
        CREATE POLICY "Allow org members insert financial_transactions"
          ON public.financial_transactions
          FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = financial_transactions.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Allow org members update financial_transactions" ON public.financial_transactions;
        CREATE POLICY "Allow org members update financial_transactions"
          ON public.financial_transactions
          FOR UPDATE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = financial_transactions.organization_id
                OR uoar.role = 'super_admin'
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = financial_transactions.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        RAISE NOTICE '✅ Políticas RLS criadas para financial_transactions';
    END IF;
END $$;

-- ============================================================================
-- GABY_RULES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gaby_rules'
    ) THEN
        DROP POLICY IF EXISTS "Org members select gaby_rules" ON public.gaby_rules;
        CREATE POLICY "Org members select gaby_rules"
          ON public.gaby_rules
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = gaby_rules.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Org members insert gaby_rules" ON public.gaby_rules;
        CREATE POLICY "Org members insert gaby_rules"
          ON public.gaby_rules
          FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = gaby_rules.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        RAISE NOTICE '✅ Políticas RLS criadas para gaby_rules';
    END IF;
END $$;

-- ============================================================================
-- CLIENT_RETENTION_DATA
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_retention_data'
    ) THEN
        DROP POLICY IF EXISTS "Org members select client_retention_data" ON public.client_retention_data;
        CREATE POLICY "Org members select client_retention_data"
          ON public.client_retention_data
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = client_retention_data.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Org members insert client_retention_data" ON public.client_retention_data;
        CREATE POLICY "Org members insert client_retention_data"
          ON public.client_retention_data
          FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = client_retention_data.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        RAISE NOTICE '✅ Políticas RLS criadas para client_retention_data';
    END IF;
END $$;

-- ============================================================================
-- ORGANIZATION_SETTINGS
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_settings'
    ) THEN
        DROP POLICY IF EXISTS "Org members select organization_settings" ON public.organization_settings;
        CREATE POLICY "Org members select organization_settings"
          ON public.organization_settings
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = organization_settings.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Org members insert organization_settings" ON public.organization_settings;
        CREATE POLICY "Org members insert organization_settings"
          ON public.organization_settings
          FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = organization_settings.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        DROP POLICY IF EXISTS "Org members update organization_settings" ON public.organization_settings;
        CREATE POLICY "Org members update organization_settings"
          ON public.organization_settings
          FOR UPDATE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = organization_settings.organization_id
                OR uoar.role = 'super_admin'
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_organization_and_role() uoar
              WHERE uoar.organization_id = organization_settings.organization_id
                OR uoar.role = 'super_admin'
            )
          );
        
        RAISE NOTICE '✅ Políticas RLS criadas para organization_settings';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ============================================================================

-- Verificar políticas criadas
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%user_organization_and_role%' OR with_check::text LIKE '%user_organization_and_role%' 
    THEN '✅ OTIMIZADA (função auxiliar)'
    ELSE 'VERIFICAR'
  END AS status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'professional_services',
    'financial_transactions',
    'gaby_rules',
    'client_retention_data',
    'organization_settings'
  )
ORDER BY tablename, policyname;
