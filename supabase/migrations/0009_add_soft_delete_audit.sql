-- =============================================================================
-- AyA — Soft delete de pacientes/posts + auditoria de exclusões
-- Migration 0009.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Paciente: soft delete + ativo/inativo
-- -----------------------------------------------------------------------------
alter table public.patients
  add column if not exists is_active  boolean not null default true,
  add column if not exists deleted_at timestamptz;

-- Índice parcial: acelera a listagem de pacientes ativos (caso comum).
create index if not exists patients_pro_active_idx
  on public.patients (professional_id, is_active)
  where is_active = true;

-- -----------------------------------------------------------------------------
-- 2. Posts: soft delete
-- -----------------------------------------------------------------------------
alter table public.posts
  add column if not exists deleted_at      timestamptz,
  add column if not exists deletion_reason text;

-- Post excluído não pode continuar aparecendo no feed público mesmo que
-- status ainda seja 'published'. O autor continua enxergando o próprio post
-- via posts_author_read_own (auditoria/possível restauração futura).
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select using (status = 'published' and deleted_at is null);

-- -----------------------------------------------------------------------------
-- 3. Auditoria de exclusões/reativações
--
--    Distinta de public.audit_log (que é só leitura de admin): esta tabela
--    existe para o PRÓPRIO profissional revisar o que excluiu/reativou.
--    Escrita só via service role (rotas de API usam createAdminClient) —
--    por isso não há policy de insert para authenticated.
-- -----------------------------------------------------------------------------
create table public.audit_deletions (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.profiles (id) on delete cascade,
  entity_type      text not null,
  entity_id        uuid not null,
  action           text not null,
  reason           text,
  old_data         jsonb,
  created_at       timestamptz not null default now()
);

create index audit_deletions_entity_idx on public.audit_deletions (entity_type, entity_id);
create index audit_deletions_pro_idx    on public.audit_deletions (professional_id, created_at desc);

alter table public.audit_deletions enable row level security;

create policy audit_deletions_owner_read on public.audit_deletions
  for select using (professional_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.audit_deletions to authenticated;
  end if;
end$$;

-- Fim da migration 0009.
