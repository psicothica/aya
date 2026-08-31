-- =============================================================================
-- AyA — Construtor de formulários/questionários (prontuário estruturado, bloco 2)
-- Migration 0007.
--
-- Modelo (form_templates) → atribuição a um paciente (form_assignments,
-- denormaliza professional_id/patient_user_id) → cópia editável das perguntas
-- (form_assignment_questions) → respostas (form_responses). Mesmo formato de
-- supabase/migrations/0005_programs_courses.sql (programas), agora aplicado a
-- formulários customizados.
--
-- `respondent` na atribuição decide quem preenche: o próprio profissional
-- (uso interno, como os registros de sessão) ou o paciente (via
-- /meus-formularios — só funciona se o paciente tiver conta vinculada,
-- patients.client_user_id não é nulo).
--
-- Já vem com um template de sistema (author_id null): "Anamnese padrão",
-- inserido de forma idempotente no fim desta migration.
-- =============================================================================

-- ---------- modelos ----------
create table public.form_templates (
  id                 uuid primary key default gen_random_uuid(),
  author_id          uuid references public.profiles (id) on delete set null, -- null = AyA/sistema
  title              text not null,
  description        text,
  category           text,
  default_respondent text not null default 'professional' check (default_respondent in ('professional','patient')),
  status             text not null default 'published' check (status in ('draft','published','archived')),
  created_at         timestamptz not null default now()
);

create table public.form_template_questions (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  section     text,
  position    int not null default 0,
  kind        text not null check (kind in ('short_text','long_text','scale','multiple_choice','yes_no')),
  label       text not null,
  help_text   text,
  options     jsonb,
  required    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index form_template_questions_template_idx on public.form_template_questions (template_id, position);

-- ---------- atribuição a um paciente ----------
create table public.form_assignments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null, -- conta do paciente (se houver)
  template_id     uuid references public.form_templates (id) on delete set null,
  title           text not null,
  description     text,
  respondent      text not null check (respondent in ('professional','patient')),
  status          text not null default 'pending' check (status in ('pending','completed')),
  assigned_at     timestamptz not null default now(),
  completed_at    timestamptz
);
create index form_assignments_pro_idx on public.form_assignments (professional_id);
create index form_assignments_patient_idx on public.form_assignments (patient_id);
create index form_assignments_patient_user_idx on public.form_assignments (patient_user_id);

-- Cópia editável das perguntas da atribuição (profissional edita; paciente lê a própria).
create table public.form_assignment_questions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.form_assignments (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null,
  section         text,
  position        int not null default 0,
  kind            text not null check (kind in ('short_text','long_text','scale','multiple_choice','yes_no')),
  label           text not null,
  help_text       text,
  options         jsonb,
  required        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index form_assignment_questions_assign_idx on public.form_assignment_questions (assignment_id, position);

-- Respostas: quem escreve depende de `form_assignments.respondent`.
create table public.form_responses (
  id                      uuid primary key default gen_random_uuid(),
  assignment_question_id  uuid not null references public.form_assignment_questions (id) on delete cascade,
  assignment_id           uuid not null references public.form_assignments (id) on delete cascade,
  professional_id         uuid not null references public.profiles (id) on delete cascade,
  patient_user_id         uuid references public.profiles (id) on delete set null,
  value_text              text,
  value_number            numeric,
  value_bool              boolean,
  answered_at             timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (assignment_question_id)
);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.form_templates            enable row level security;
alter table public.form_template_questions   enable row level security;
alter table public.form_assignments          enable row level security;
alter table public.form_assignment_questions enable row level security;
alter table public.form_responses            enable row level security;

-- Templates: autor dono; sistema (author_id is null) legível por todo profissional; admin gerencia tudo.
create policy form_templates_read on public.form_templates for select
  using (author_id = auth.uid() or author_id is null);
create policy form_templates_owner_all on public.form_templates for all
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy form_templates_admin_all on public.form_templates for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Perguntas do template: mesma visibilidade do template dono.
create policy form_template_questions_read on public.form_template_questions for select
  using (author_id = auth.uid() or author_id is null);
create policy form_template_questions_owner_all on public.form_template_questions for all
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy form_template_questions_admin_all on public.form_template_questions for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Atribuição: profissional dono (tudo); paciente lê a própria.
create policy form_assignments_pro_all on public.form_assignments for all
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy form_assignments_patient_read on public.form_assignments for select
  using (patient_user_id = auth.uid());

-- Perguntas da atribuição: profissional edita; paciente lê a própria.
create policy form_assignment_questions_pro_all on public.form_assignment_questions for all
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy form_assignment_questions_patient_read on public.form_assignment_questions for select
  using (patient_user_id = auth.uid());

-- Respostas: profissional sempre gerencia (dono do prontuário); paciente só
-- quando a atribuição foi marcada para ELE responder.
create policy form_responses_pro_all on public.form_responses for all
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy form_responses_patient_all on public.form_responses for all
  using (
    patient_user_id = auth.uid()
    and exists (select 1 from public.form_assignments fa
                where fa.id = form_responses.assignment_id and fa.respondent = 'patient')
  )
  with check (
    patient_user_id = auth.uid()
    and exists (select 1 from public.form_assignments fa
                where fa.id = form_responses.assignment_id and fa.respondent = 'patient')
  );

-- Grants (Supabase concede por default; explícito para robustez).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on
      public.form_templates, public.form_template_questions,
      public.form_assignments, public.form_assignment_questions, public.form_responses
      to authenticated;
  end if;
end$$;

-- =============================================================================
-- Anamnese padrão (template de sistema, author_id null) — idempotente.
-- =============================================================================
do $$
declare
  v_template_id uuid;
begin
  if not exists (select 1 from public.form_templates where author_id is null and category = 'anamnese') then
    insert into public.form_templates (author_id, title, description, category, default_respondent, status)
    values (null, 'Anamnese padrão', 'Modelo inicial de anamnese, editável pelo profissional.', 'anamnese', 'professional', 'published')
    returning id into v_template_id;

    insert into public.form_template_questions
      (template_id, author_id, section, position, kind, label, help_text, options, required)
    values
      (v_template_id, null, 'Dados pessoais', 1, 'short_text', 'Estado civil', null, null, false),
      (v_template_id, null, 'Dados pessoais', 2, 'short_text', 'Profissão / ocupação', null, null, false),
      (v_template_id, null, 'Dados pessoais', 3, 'short_text', 'Com quem mora', null, null, false),
      (v_template_id, null, 'Queixa e história', 4, 'long_text', 'Queixa principal', 'O que trouxe o paciente ao atendimento, nas palavras dele(a).', null, true),
      (v_template_id, null, 'Queixa e história', 5, 'short_text', 'Início dos sintomas', null, null, false),
      (v_template_id, null, 'Queixa e história', 6, 'long_text', 'Tratamentos anteriores', 'Terapias, medicações ou internações já realizadas.', null, false),
      (v_template_id, null, 'Sintomas atuais', 7, 'scale', 'Humor (0 = muito baixo, 10 = muito bom)', null, null, false),
      (v_template_id, null, 'Sintomas atuais', 8, 'scale', 'Ansiedade (0 = ausente, 10 = intensa)', null, null, false),
      (v_template_id, null, 'Sintomas atuais', 9, 'scale', 'Qualidade do sono (0 = péssima, 10 = ótima)', null, null, false),
      (v_template_id, null, 'Sintomas atuais', 10, 'long_text', 'Observações sobre os sintomas', null, null, false),
      (v_template_id, null, 'Blocos por área da vida', 11, 'long_text', 'Trabalho / estudos', null, null, false),
      (v_template_id, null, 'Blocos por área da vida', 12, 'long_text', 'Família', null, null, false),
      (v_template_id, null, 'Blocos por área da vida', 13, 'long_text', 'Relacionamentos', null, null, false),
      (v_template_id, null, 'Blocos por área da vida', 14, 'long_text', 'Saúde física', null, null, false);
  end if;
end$$;

-- Fim da migration 0007.
