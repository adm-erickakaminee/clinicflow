-- Tabela financial_transactions (valores em centavos, sem float)
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  professional_id uuid references public.profiles(id) on delete set null,
  payment_method text,
  commission_model text check (commission_model in ('commissioned','rental','hybrid')),
  amount_cents integer not null,
  platform_fee_cents integer not null default 0,
  professional_share_cents integer not null default 0,
  clinic_share_cents integer not null default 0,
  is_fee_ledger_pending boolean not null default false,
  status text not null default 'pending',
  asaas_wallet_id text,
  asaas_split_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow org members select financial_transactions'
  ) then
    create policy "Allow org members select financial_transactions"
      on public.financial_transactions
      for select
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.organization_id = financial_transactions.organization_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Allow org members insert financial_transactions'
  ) then
    create policy "Allow org members insert financial_transactions"
      on public.financial_transactions
      for insert
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.organization_id = financial_transactions.organization_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Allow org members update financial_transactions'
  ) then
    create policy "Allow org members update financial_transactions"
      on public.financial_transactions
      for update
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.organization_id = financial_transactions.organization_id
        )
      );
  end if;
end
$$;

-- Índices úteis
create index if not exists idx_financial_transactions_org on public.financial_transactions (organization_id);
create index if not exists idx_financial_transactions_appointment on public.financial_transactions (appointment_id);
create index if not exists idx_financial_transactions_professional on public.financial_transactions (professional_id);

-- Campo em profiles para carteiras Asaas (se não existir)
-- alter table public.profiles add column if not exists asaas_wallet_id text;
-- alter table public.profiles add column if not exists commission_model text check (commission_model in ('commissioned','rental','hybrid'));
-- alter table public.profiles add column if not exists commission_rate numeric; -- percent (0.0-1.0)
-- alter table public.profiles add column if not exists rental_base_cents integer default 0;


