-- =============================================================================
-- AyA — Mensagens automáticas (confirmação + lembrete de sessão)
-- Migration 0004: confirmação de presença + fila/registro de notificações.
--
-- Arquitetura: o CANAL é trocável (email agora; whatsapp/sms depois). A tabela
-- guarda o que foi enfileirado/enviado (idempotência e log). O envio em si é
-- feito pelo código (provedor externo), não pelo banco.
-- =============================================================================

-- Confirmação de presença pelo paciente (via link seguro no e-mail/whatsapp).
alter table public.appointments
  add column if not exists patient_confirmed_at timestamptz;

create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.profiles (id) on delete cascade,
  appointment_id   uuid references public.appointments (id) on delete cascade,
  kind             text not null check (kind in ('confirmation','reminder')),
  channel          text not null default 'email' check (channel in ('email','whatsapp','sms')),
  recipient        text,                 -- e-mail ou telefone do destinatário
  status           text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  error            text,
  scheduled_for    timestamptz,
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  -- idempotência: no máximo uma confirmação e um lembrete por sessão
  unique (appointment_id, kind)
);
create index if not exists notifications_status_idx on public.notifications (status, scheduled_for);
create index if not exists notifications_pro_idx on public.notifications (professional_id);

alter table public.notifications enable row level security;

-- O profissional dono gerencia (enfileira/vê) as próprias notificações.
-- O envio pelo cron usa a service role, que ignora RLS (processo de sistema).
drop policy if exists notifications_owner_all on public.notifications;
create policy notifications_owner_all on public.notifications
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update on public.notifications to authenticated;
  end if;
end$$;

-- Fim da migration 0004.
