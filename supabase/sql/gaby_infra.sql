-- Tabela de regras da Gaby
create table if not exists public.gaby_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_type text check (rule_type in ('retention','upsell','cashback','pricing')),
  rule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dados de retenção por cliente/serviço
create table if not exists public.client_retention_data (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  last_visit_date date,
  service_cycle_days integer default 45,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, service_id)
);

-- Configurações da organização (Gaby + outros)
create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  solo_mode boolean default false,
  gaby_config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.gaby_rules enable row level security;
alter table public.client_retention_data enable row level security;
alter table public.organization_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Org members select gaby_rules') then
    create policy "Org members select gaby_rules"
      on public.gaby_rules
      for select
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = gaby_rules.organization_id));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Org members insert gaby_rules') then
    create policy "Org members insert gaby_rules"
      on public.gaby_rules
      for insert
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = gaby_rules.organization_id));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Org members select client_retention_data') then
    create policy "Org members select client_retention_data"
      on public.client_retention_data
      for select
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = client_retention_data.organization_id));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Org members insert client_retention_data') then
    create policy "Org members insert client_retention_data"
      on public.client_retention_data
      for insert
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = client_retention_data.organization_id));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Org members select organization_settings') then
    create policy "Org members select organization_settings"
      on public.organization_settings
      for select
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = organization_settings.organization_id));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Org members insert organization_settings') then
    create policy "Org members insert organization_settings"
      on public.organization_settings
      for insert
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = organization_settings.organization_id));
  end if;
end
$$;

-- Índices auxiliares
create index if not exists idx_gaby_rules_org on public.gaby_rules (organization_id);
create index if not exists idx_client_retention_org on public.client_retention_data (organization_id, client_id);


