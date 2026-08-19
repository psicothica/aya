-- =============================================================================
-- AyA — Registros de sessão (prontuário estruturado)
-- Migration 0006.
--
-- Cada registro de sessão reúne os domínios de acompanhamento clínico: humor,
-- risco (autolesão/suicídio), medicação, sono, alimentação, saúde física,
-- mobilidade e saúde social. É DADO CLÍNICO CONFIDENCIAL: só o profissional
-- responsável acessa (mesma trava das evoluções). Admin NÃO acessa.
--
-- Observação de responsabilidade: os campos de risco e alimentação são
-- QUALITATIVOS (avaliação do profissional), não coletam método nem metas
-- numéricas — por cuidado clínico.
-- =============================================================================

create table public.session_records (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.profiles (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  appointment_id   uuid references public.appointments (id) on delete set null,
  session_date     date not null default current_date,

  mood_scale       int check (mood_scale between 0 and 10),
  mood_notes       text,
  risk_level       text check (risk_level in ('nenhum','baixo','moderado','alto','grave')),
  risk_notes       text,
  medication_notes text,
  sleep_notes      text,
  eating_notes     text,
  physical_notes   text,
  mobility_notes   text,
  social_notes     text,
  general_notes    text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index session_records_patient_idx on public.session_records (patient_id, session_date desc);

alter table public.session_records enable row level security;

-- Só o profissional dono (sem admin, sem paciente) — confidencial.
create policy session_records_owner_all on public.session_records
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on public.session_records to authenticated;
  end if;
end$$;

-- Fim da migration 0006.
