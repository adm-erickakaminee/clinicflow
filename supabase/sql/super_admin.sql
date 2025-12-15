-- Infra do Super Admin

-- Tabela de auditoria
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  super_admin_id uuid not null,
  target_user_id uuid,
  target_organization_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

-- Coluna de status na organizations (se não existir)
alter table public.organizations
  add column if not exists status text check (status in ('active','suspended','delinquent')) default 'active';

alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Super admin full access audit_logs') then
    create policy "Super admin full access audit_logs"
      on public.audit_logs
      using (auth.jwt()->>'role' = 'super_admin')
      with check (auth.jwt()->>'role' = 'super_admin');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Super admin read organizations') then
    create policy "Super admin read organizations"
      on public.organizations
      for select
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role = 'super_admin'
        )
      );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Super admin insert organizations') then
    create policy "Super admin insert organizations"
      on public.organizations
      for insert
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role = 'super_admin'
        )
      );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Super admin update organizations') then
    create policy "Super admin update organizations"
      on public.organizations
      for update
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role = 'super_admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role = 'super_admin'
        )
      );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Super admin read financial_transactions') then
    create policy "Super admin read financial_transactions"
      on public.financial_transactions
      for select
      using (auth.jwt()->>'role' = 'super_admin');
  end if;
end
$$;

-- Observação: para acesso irrestrito total, repetir política de super_admin para tabelas críticas (appointments, profiles, services, organization_settings, etc.) ou criar um papel de banco com bypass RLS.


