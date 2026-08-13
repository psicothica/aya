-- =============================================================================
-- AyA — Fase 2 (Gestão da prática)
-- Migration 0003: agendamento por SOLICITAÇÃO (booking_requests).
--
-- Por que uma tabela separada: as tabelas clínicas (patients/appointments) são
-- privadas do profissional (RLS: professional_id = auth.uid()). O cliente NÃO
-- pode escrever nelas. Então o cliente cria uma SOLICITAÇÃO aqui; quando o
-- profissional aceita (na sessão dele), aí sim nascem o paciente e a sessão —
-- preservando o isolamento clínico da Fase 0.
-- =============================================================================

create type public.booking_status as enum ('requested', 'accepted', 'declined', 'cancelled');

create table public.booking_requests (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles (id) on delete cascade,
  professional_id  uuid not null references public.profiles (id) on delete cascade,
  client_name      text not null,
  client_contact   text,
  requested_at     timestamptz,               -- horário proposto pelo cliente
  note             text,
  status           public.booking_status not null default 'requested',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index booking_requests_pro_idx on public.booking_requests (professional_id, status);
create index booking_requests_client_idx on public.booking_requests (client_id);

create trigger trg_booking_requests_updated_at before update on public.booking_requests
  for each row execute function public.set_updated_at();

alter table public.booking_requests enable row level security;

-- Cliente gerencia as próprias solicitações (criar, ver, cancelar).
create policy booking_client_all on public.booking_requests
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Profissional vê e responde às solicitações endereçadas a ele.
create policy booking_pro_read on public.booking_requests
  for select using (professional_id = auth.uid());
create policy booking_pro_update on public.booking_requests
  for update using (professional_id = auth.uid());

-- Grants (Supabase já concede por default; explícito para clareza/robustez).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update on public.booking_requests to authenticated;
  end if;
end$$;

-- Fim da migration 0003.
