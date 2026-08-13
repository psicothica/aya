-- =============================================================================
-- AyA — Fase 1 (Descoberta e conteúdo)
-- Migration 0002: campos públicos do profissional, índices de filtro e grants.
--
-- Por que: o diretório público precisa do NOME e AVATAR do profissional, mas a
-- tabela `profiles` é fechada por RLS (identidade-base). Em vez de abri-la,
-- denormalizamos um nome/imagem PÚBLICOS no professional_profiles — que já é
-- lido publicamente quando status='approved'. O nome público pode, inclusive,
-- diferir do nome da conta.
-- =============================================================================

alter table public.professional_profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text;

-- Backfill: usa o nome da conta como nome público inicial.
update public.professional_profiles pp
set display_name = p.full_name
from public.profiles p
where p.id = pp.user_id and pp.display_name is null;

-- Índices para filtros do diretório e do feed.
create index if not exists prof_specialties_gin on public.professional_profiles using gin (specialties);
create index if not exists posts_tags_gin on public.posts using gin (tags);
create index if not exists posts_category_idx on public.posts (category);
create index if not exists activities_time_idx on public.activities (starts_at);

-- -----------------------------------------------------------------------------
-- Grants defensivos. No Supabase os papéis anon/authenticated já recebem
-- privilégios por default nas tabelas de `public` (a RLS é quem filtra), mas
-- deixamos explícito o essencial da Fase 1. Guardado por existência do papel,
-- para rodar também em Postgres puro na validação local.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on
      public.professional_profiles, public.activities, public.apps,
      public.posts, public.interactions
      to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on
      public.posts, public.interactions, public.favorites,
      public.activity_enrollments, public.professional_profiles, public.app_usage
      to authenticated;
    grant select on
      public.professional_profiles, public.activities, public.apps,
      public.posts, public.interactions, public.profiles
      to authenticated;
  end if;
end$$;

-- Fim da migration 0002.
