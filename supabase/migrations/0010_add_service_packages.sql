-- =============================================================================
-- AyA — Pacotes de serviços
-- Migration 0010.
-- =============================================================================

create type public.package_status as enum ('active', 'inactive', 'archived');

-- Catálogo de pacotes que o profissional oferece (ex.: "10 sessões de TCC").
create table public.service_packages (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  title           text not null,
  description     text,
  session_count   int,
  price_total     numeric(10,2),
  price_per_item  numeric(10,2),
  valid_days      int,
  status          public.package_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index service_packages_pro_idx on public.service_packages (professional_id, status);

-- Contratação de um pacote por um paciente específico.
create table public.patient_packages (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients (id) on delete cascade,
  package_id      uuid not null references public.service_packages (id) on delete cascade,
  sessions_used   int not null default 0,
  started_at      timestamptz not null default now(),
  expires_at      timestamptz,
  status          text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at      timestamptz not null default now()
);
create index patient_packages_patient_idx on public.patient_packages (patient_id, status);
create index patient_packages_package_idx on public.patient_packages (package_id);

-- Calcula expires_at a partir de service_packages.valid_days no momento da
-- contratação (started_at). Pacote sem validade definida (valid_days null)
-- não expira.
create or replace function public.calc_package_expiry()
returns trigger
language plpgsql
as $$
declare
  v_valid_days int;
begin
  select sp.valid_days into v_valid_days
  from public.service_packages sp
  where sp.id = new.package_id;

  if v_valid_days is not null then
    new.expires_at := new.started_at + (v_valid_days || ' days')::interval;
  end if;

  return new;
end;
$$;

create trigger trg_patient_packages_expiry
  before insert on public.patient_packages
  for each row execute function public.calc_package_expiry();

alter table public.service_packages enable row level security;
alter table public.patient_packages enable row level security;

create policy service_packages_owner_all on public.service_packages
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

-- patient_packages não tem professional_id próprio: o acesso passa pelo
-- dono do paciente vinculado (mesmo padrão de enrollments_host_read/0008).
create policy patient_packages_via_patient on public.patient_packages
  for all using (
    exists (
      select 1 from public.patients p
      where p.id = patient_packages.patient_id and p.professional_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.patients p
      where p.id = patient_packages.patient_id and p.professional_id = auth.uid()
    )
  );

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on
      public.service_packages, public.patient_packages
      to authenticated;
  end if;
end$$;

-- Fim da migration 0010.
