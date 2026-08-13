-- =============================================================================
-- AyA — Fase 0 (Fundações)
-- Migration 0001: schema base, RBAC e Row-Level Security (RLS)
-- Alvo: PostgreSQL 15+ / Supabase
--
-- PRINCÍPIO CENTRAL DESTA MIGRATION
--   O isolamento de dados clínicos é imposto no BANCO (RLS), não na aplicação.
--   Consequência prática: mesmo que um bug no frontend/API vaze uma query,
--   o Postgres recusa linhas que não pertencem ao usuário autenticado.
--
--   Fronteiras que esta migration trava desde já:
--     • Patient  ≠  Client        (dado clínico privado  vs  usuário do diretório)
--     • Profissional acessa APENAS os próprios pacientes/prontuários
--     • Admin da AyA NUNCA lê prontuário/evolução/documento clínico
--       (não existe policy que conceda isso — ver seção RLS CLÍNICO)
--
-- Convenção Supabase: a identidade vem de `auth.users`; `auth.uid()` retorna
--   o UUID do usuário autenticado na requisição corrente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensões
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- e-mail case-insensitive


-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------

-- Papéis de acesso (RBAC). Um usuário pode acumular papéis
-- (ex.: 'client' + 'professional'). 'admin' é a equipe AyA.
create type public.app_role as enum ('client', 'professional', 'admin');

-- Escopo profissional: psicólogos + demais áreas de saúde.
create type public.profession_type as enum (
  'psychologist',
  'psychiatrist',
  'physician',
  'nutritionist',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'nurse',
  'social_worker',
  'other'
);

-- Conselho de classe (para o registro profissional).
create type public.council_type as enum (
  'CRP',      -- Psicologia
  'CRM',      -- Medicina
  'CRN',      -- Nutrição
  'CREFITO',  -- Fisioterapia / Terapia Ocupacional
  'CREFONO',  -- Fonoaudiologia
  'COREN',    -- Enfermagem
  'CRESS',    -- Serviço Social
  'other'
);

-- Fluxo de aprovação manual antes do perfil ficar público (Seção 3.1 do doc).
create type public.professional_status as enum ('pending', 'approved', 'suspended', 'rejected');

create type public.attendance_modality as enum ('in_person', 'online', 'hybrid');

create type public.appointment_status as enum (
  'scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'
);

create type public.payment_status as enum ('pending', 'paid', 'overdue', 'refunded', 'cancelled');

create type public.transaction_type as enum ('income', 'expense');

create type public.activity_status as enum ('open', 'full', 'closed', 'cancelled');

create type public.enrollment_status as enum ('reserved', 'confirmed', 'cancelled', 'attended');

-- Acesso aos apps terapêuticos. Começamos por 'linked_sso' (Seção 3.3),
-- com 'embedded' já previsto no modelo.
create type public.app_access_type as enum ('linked_sso', 'embedded');

-- Moderação do feed (Seção 3.4 / 7). Default é revisão prévia.
create type public.post_status as enum ('draft', 'pending_review', 'published', 'rejected', 'archived');

create type public.interaction_type as enum ('like', 'save', 'comment', 'report');

create type public.document_type as enum ('report', 'anamnesis', 'consent', 'receipt', 'invoice', 'other');

-- Alvo de "favoritar" no diretório (profissional / atividade / app).
create type public.favorite_target as enum ('professional', 'activity', 'app');


-- -----------------------------------------------------------------------------
-- 2. Funções auxiliares (usadas dentro das policies)
--
--    SECURITY DEFINER + search_path fixo: evita recursão de RLS ao consultar
--    user_roles de dentro de uma policy, e evita hijack de search_path.
-- -----------------------------------------------------------------------------

-- (definida após public.user_roles existir — ver seção 3)


-- -----------------------------------------------------------------------------
-- 3. Identidade e RBAC
-- -----------------------------------------------------------------------------

-- Perfil-base de TODO usuário autenticado (a identidade "de cliente").
-- 1:1 com auth.users.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  email        citext,
  avatar_url   text,
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Identidade base de qualquer usuário autenticado (nível Cliente). Profissional = profiles + professional_profiles + papel professional.';

-- Papéis por usuário (RBAC many-to-many).
create table public.user_roles (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  role     public.app_role not null,
  primary key (user_id, role)
);

-- Verifica se um usuário possui um papel. STABLE + SECURITY DEFINER
-- para poder ser chamada com segurança dentro de policies.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- (public.is_approved_professional é definida na seção 4, após a tabela
--  professional_profiles existir — funções `language sql` são validadas na criação.)


-- -----------------------------------------------------------------------------
-- 4. Perfil público do profissional (alimenta o diretório de descoberta)
-- -----------------------------------------------------------------------------
create table public.professional_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  profession          public.profession_type not null,
  council             public.council_type,
  registration_number text,                    -- ex.: nº do CRP/CRM. AyA NÃO valida automaticamente.
  registration_uf     char(2),
  headline            text,                     -- chamada curta para o card do diretório
  bio                 text,
  approach            text,                     -- abordagem (ex.: TCC, psicanálise)
  specialties         text[] not null default '{}',
  modalities          public.attendance_modality[] not null default '{}',
  city                text,
  uf                  char(2),
  price_min           numeric(10,2),
  price_max           numeric(10,2),
  status              public.professional_status not null default 'pending',
  approved_by         uuid references public.profiles (id),
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column public.professional_profiles.registration_number is
  'AyA não valida o registro automaticamente. Verificação ocorre no fluxo de aprovação manual do admin (Seção 3.1).';

create index professional_profiles_directory_idx
  on public.professional_profiles (status, profession, uf);

-- Profissional aprovado? Usada nas policies de autoria (feed, atividades).
create or replace function public.is_approved_professional(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.professional_profiles
    where user_id = _user_id and status = 'approved'
  );
$$;


-- -----------------------------------------------------------------------------
-- 5. NÚCLEO CLÍNICO (privado do profissional) — Patient ≠ Client
--
--    professional_id é DENORMALIZADO nas tabelas-filhas (notes/appointments/
--    documents...) de propósito: mantém as policies simples e rápidas
--    (comparação direta com auth.uid(), sem JOIN).
-- -----------------------------------------------------------------------------

-- Paciente de UM profissional. Distinto de profiles/Client.
-- Pode, opcionalmente, estar vinculado a uma conta Cliente (client_user_id)
-- quando fizer sentido o próprio paciente acessar parte dos seus dados.
create table public.patients (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete restrict,
  client_user_id  uuid references public.profiles (id) on delete set null,
  full_name       text not null,
  birth_date      date,
  email           citext,
  phone           text,
  notes_summary   text,          -- resumo administrativo (NÃO é evolução clínica)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index patients_professional_idx on public.patients (professional_id);
create index patients_client_link_idx on public.patients (client_user_id);

create table public.appointments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete restrict,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          public.appointment_status not null default 'scheduled',
  modality        public.attendance_modality,
  price           numeric(10,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_professional_idx on public.appointments (professional_id, starts_at);
create index appointments_patient_idx on public.appointments (patient_id);

-- Evolução clínica. O dado mais sensível da plataforma.
create table public.clinical_notes (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete restrict,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  appointment_id  uuid references public.appointments (id) on delete set null,
  content         text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index clinical_notes_patient_idx on public.clinical_notes (patient_id);

-- Metadados de documentos. O arquivo em si vive no object storage (bucket
-- privado 'patient-documents'), com RLS própria — ver seção STORAGE ao final.
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete restrict,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  doc_type        public.document_type not null default 'other',
  title           text,
  storage_path    text not null,   -- caminho no bucket: {professional_id}/{patient_id}/{arquivo}
  created_at      timestamptz not null default now()
);
create index documents_patient_idx on public.documents (patient_id);

-- Árvore relacional familiar (Fase 3 no roadmap; tabela-base criada agora
-- para consolidar o padrão de isolamento por profissional).
create table public.family_tree_nodes (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete restrict,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  label           text not null,
  meta            jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create table public.family_relations (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete restrict,
  from_node_id    uuid not null references public.family_tree_nodes (id) on delete cascade,
  to_node_id      uuid not null references public.family_tree_nodes (id) on delete cascade,
  relation_label  text,
  created_at      timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 6. Financeiro (privado do profissional)
-- -----------------------------------------------------------------------------
create table public.financial_transactions (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete restrict,
  appointment_id  uuid references public.appointments (id) on delete set null,
  kind            public.transaction_type not null,
  category        text,
  amount          numeric(10,2) not null,
  status          public.payment_status not null default 'pending',
  occurred_on     date not null default current_date,
  created_at      timestamptz not null default now()
);
create index financial_professional_idx on public.financial_transactions (professional_id, occurred_on);


-- -----------------------------------------------------------------------------
-- 7. Descoberta pública: atividades, apps, favoritos
-- -----------------------------------------------------------------------------
create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid references public.profiles (id) on delete set null, -- profissional ou admin
  title           text not null,
  description     text,
  modality        public.attendance_modality not null default 'online',
  starts_at       timestamptz,
  capacity        int check (capacity is null or capacity >= 0),
  price           numeric(10,2),
  status          public.activity_status not null default 'open',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.activity_enrollments (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references public.activities (id) on delete cascade,
  client_id    uuid not null references public.profiles (id) on delete cascade,
  status       public.enrollment_status not null default 'reserved',
  created_at   timestamptz not null default now(),
  unique (activity_id, client_id)
);

-- Apps terapêuticos da AyA (produtos próprios).
create table public.apps (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  access_type  public.app_access_type not null default 'linked_sso',
  launch_url   text,
  meta         jsonb not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Registro de uso/adesão por cliente (métricas e continuidade de cuidado).
create table public.app_usage (
  id          uuid primary key default gen_random_uuid(),
  app_id      uuid not null references public.apps (id) on delete cascade,
  client_id   uuid not null references public.profiles (id) on delete cascade,
  last_used_at timestamptz not null default now(),
  usage_count int not null default 1
);

create table public.favorites (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  target_type  public.favorite_target not null,
  target_id    uuid not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);


-- -----------------------------------------------------------------------------
-- 8. Feed de conteúdo
-- -----------------------------------------------------------------------------
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  body          text,
  media         jsonb not null default '[]',   -- [{type,url,...}]
  category      text,
  tags          text[] not null default '{}',
  status        public.post_status not null default 'pending_review',
  moderated_by  uuid references public.profiles (id),
  moderated_at  timestamptz,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index posts_feed_idx on public.posts (status, published_at desc);

create table public.interactions (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         public.interaction_type not null,
  comment_body text,                            -- só quando kind = 'comment'
  created_at   timestamptz not null default now()
);
create index interactions_post_idx on public.interactions (post_id, kind);
-- Curtir/salvar são idempotentes por usuário/post; comentário/denúncia não.
create unique index interactions_unique_toggle
  on public.interactions (post_id, user_id, kind)
  where kind in ('like', 'save');


-- -----------------------------------------------------------------------------
-- 9. Auditoria (Seção 7): trilha para ações sensíveis
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    text,
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);


-- -----------------------------------------------------------------------------
-- 10. Triggers utilitários
-- -----------------------------------------------------------------------------

-- 10a. updated_at automático.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','professional_profiles','patients','appointments',
    'clinical_notes','activities','posts'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- 10b. Ao criar um usuário no auth.users, cria o profile e concede papel 'client'
--      por padrão (todo mundo é cliente; profissional/admin são concedidos depois).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'client')
  on conflict do nothing;

  return new;
end;
$$;

-- (No Supabase o gatilho fica em auth.users. Fora dele, este create funciona igual.)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- 11. ROW-LEVEL SECURITY
--
--   Regra de ouro: RLS habilitada + nenhuma policy = acesso negado por padrão.
--   Portanto, o simples ATO DE NÃO ESCREVER uma policy de admin nas tabelas
--   clínicas é o que garante o sigilo. Não há brecha silenciosa.
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.user_roles            enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.patients              enable row level security;
alter table public.appointments          enable row level security;
alter table public.clinical_notes        enable row level security;
alter table public.documents             enable row level security;
alter table public.family_tree_nodes     enable row level security;
alter table public.family_relations      enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.activities            enable row level security;
alter table public.activity_enrollments  enable row level security;
alter table public.apps                  enable row level security;
alter table public.app_usage             enable row level security;
alter table public.favorites             enable row level security;
alter table public.posts                 enable row level security;
alter table public.interactions          enable row level security;
alter table public.audit_log             enable row level security;

-- ---- 11.1 profiles -----------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Perfil-base público mínimo (nome/avatar) é exposto via VIEW dedicada na app,
-- não abrindo a tabela inteira. Mantemos profiles fechado por padrão.

-- ---- 11.2 user_roles ---------------------------------------------------------
create policy user_roles_select_own on public.user_roles
  for select using (user_id = auth.uid());
create policy user_roles_admin_all on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
-- INSERT de papéis é feito por admin/serviço; usuário não se auto-promove.

-- ---- 11.3 professional_profiles (diretório) ---------------------------------
-- Público/anon lê apenas perfis aprovados.
create policy prof_public_read_approved on public.professional_profiles
  for select using (status = 'approved');
-- Dono gerencia o próprio perfil (qualquer status).
create policy prof_owner_all on public.professional_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Admin lê todos (fila de aprovação) e altera status.
create policy prof_admin_read on public.professional_profiles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy prof_admin_update on public.professional_profiles
  for update using (public.has_role(auth.uid(), 'admin'));

-- ---- 11.4 NÚCLEO CLÍNICO — isolamento estrito -------------------------------
--   Apenas o profissional dono. SEM policy de admin (sigilo).
create policy patients_owner_all on public.patients
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());
-- Paciente vinculado (conta cliente) pode LER o próprio cadastro básico.
create policy patients_linked_client_read on public.patients
  for select using (client_user_id = auth.uid());

create policy appointments_owner_all on public.appointments
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());
-- Paciente vinculado vê seus próprios agendamentos.
create policy appointments_linked_client_read on public.appointments
  for select using (
    exists (select 1 from public.patients p
            where p.id = appointments.patient_id and p.client_user_id = auth.uid())
  );

-- Evolução clínica: SÓ o profissional. Nem admin, nem paciente por padrão.
-- (Acesso do paciente às evoluções é decisão editorial futura — abrir com
--  cautela, pois evolução costuma conter anotações de trabalho do profissional.)
create policy clinical_notes_owner_all on public.clinical_notes
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

create policy documents_owner_all on public.documents
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

create policy family_nodes_owner_all on public.family_tree_nodes
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy family_relations_owner_all on public.family_relations
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

create policy financial_owner_all on public.financial_transactions
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

-- ---- 11.5 Atividades ---------------------------------------------------------
create policy activities_public_read on public.activities
  for select using (status <> 'cancelled');
create policy activities_host_manage on public.activities
  for all using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy activities_admin_manage on public.activities
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy enrollments_client_manage on public.activity_enrollments
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());
-- Host da atividade lê a lista de inscritos.
create policy enrollments_host_read on public.activity_enrollments
  for select using (
    exists (select 1 from public.activities a
            where a.id = activity_enrollments.activity_id and a.host_id = auth.uid())
  );

-- ---- 11.6 Apps ---------------------------------------------------------------
create policy apps_public_read on public.apps
  for select using (is_active);
create policy apps_admin_manage on public.apps
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy app_usage_owner on public.app_usage
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());
-- Admin lê uso agregado para métricas de plataforma (não é dado clínico).
create policy app_usage_admin_read on public.app_usage
  for select using (public.has_role(auth.uid(), 'admin'));

-- ---- 11.7 Favoritos ----------------------------------------------------------
create policy favorites_owner on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- 11.8 Feed ---------------------------------------------------------------
-- Qualquer um lê posts publicados.
create policy posts_public_read on public.posts
  for select using (status = 'published');
-- Autor lê/edita os próprios rascunhos.
create policy posts_author_read_own on public.posts
  for select using (author_id = auth.uid());
create policy posts_author_update_own on public.posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
-- Só admin ou profissional aprovado pode criar post (moderação prévia: entra
-- como pending_review; a app não deve deixar o autor setar 'published').
create policy posts_author_insert on public.posts
  for insert with check (
    author_id = auth.uid()
    and (public.has_role(auth.uid(), 'admin') or public.is_approved_professional(auth.uid()))
  );
-- Admin modera tudo.
create policy posts_admin_all on public.posts
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Interações: usuário autenticado gerencia as próprias; leitura em post publicado.
create policy interactions_read_on_published on public.interactions
  for select using (
    exists (select 1 from public.posts p
            where p.id = interactions.post_id and p.status = 'published')
  );
create policy interactions_owner_write on public.interactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy interactions_admin_read on public.interactions
  for select using (public.has_role(auth.uid(), 'admin'));  -- ver denúncias

-- ---- 11.9 Auditoria ----------------------------------------------------------
-- Escrita ocorre via service role / triggers (que ignoram RLS). Leitura: só admin.
create policy audit_admin_read on public.audit_log
  for select using (public.has_role(auth.uid(), 'admin'));


-- =============================================================================
-- 12. STORAGE (Supabase) — documentos clínicos
--
--   Executar no projeto Supabase (bucket privado). Caminho por convenção:
--     patient-documents/{professional_id}/{patient_id}/{arquivo}
--
--   insert into storage.buckets (id, name, public) values
--     ('patient-documents','patient-documents', false);
--
--   -- Só o profissional dono acessa arquivos sob a própria pasta:
--   create policy "prof_rw_own_patient_docs" on storage.objects for all
--     using (
--       bucket_id = 'patient-documents'
--       and (storage.foldername(name))[1] = auth.uid()::text
--     )
--     with check (
--       bucket_id = 'patient-documents'
--       and (storage.foldername(name))[1] = auth.uid()::text
--     );
--
--   Entrega dos arquivos ao cliente/paciente: sempre via URL assinada gerada
--   no backend, nunca expondo o bucket.
-- =============================================================================

-- Fim da migration 0001.
