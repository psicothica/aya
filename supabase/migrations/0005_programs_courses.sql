-- =============================================================================
-- AyA — Programas terapêuticos + Cursos/Módulos
-- Migration 0005.
--
-- Dois sistemas:
--  (1) PROGRAMAS (estilo MyDose): modelos de programa com atividades; o
--      profissional ADQUIRE (licença), ATRIBUI a um paciente (cria uma cópia
--      editável das atividades) e ACOMPANHA; o paciente MARCA PROGRESSO e faz
--      ANOTAÇÕES. Sigilo preservado: progresso é do paciente; atividades são do
--      profissional; admin não lê nada disso.
--  (2) CURSOS/MÓDULOS: conteúdo educativo (estudantes/profissionais/público),
--      gratuito ou pago, com inscrição e progresso por aula.
--
-- Pagamento real dos itens "pagos" = Fase 4 (gateway). Aqui a aquisição/inscrição
-- fica registrada (campo `paid`), com o ponto de cobrança preparado.
-- Denormalizamos professional_id / patient_user_id para RLS simples e rápida.
-- =============================================================================

-- ---------- (1) PROGRAMAS: modelos ----------
create table public.programs (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.profiles (id) on delete set null, -- null = AyA
  title        text not null,
  description  text,
  category     text,
  is_paid      boolean not null default false,
  price        numeric(10,2),
  status       text not null default 'draft' check (status in ('draft','published','archived')),
  created_at   timestamptz not null default now()
);
create table public.program_activities (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.programs (id) on delete cascade,
  position     int not null default 0,
  title        text not null,
  instructions text,
  kind         text not null default 'task',
  created_at   timestamptz not null default now()
);
create index program_activities_prog_idx on public.program_activities (program_id, position);

-- Licença: o profissional adquire o direito de atribuir o programa.
create table public.program_licenses (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  program_id      uuid not null references public.programs (id) on delete cascade,
  paid            boolean not null default false,
  acquired_at     timestamptz not null default now(),
  unique (professional_id, program_id)
);

-- Atribuição a um paciente (cópia editável do programa).
create table public.program_assignments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null, -- conta do paciente (se houver)
  program_id      uuid references public.programs (id) on delete set null,
  title           text not null,
  status          text not null default 'active' check (status in ('active','completed','paused')),
  assigned_at     timestamptz not null default now()
);
create index program_assignments_pro_idx on public.program_assignments (professional_id);
create index program_assignments_patient_user_idx on public.program_assignments (patient_user_id);

-- Atividades da atribuição (editáveis pelo profissional; lidas pelo paciente).
create table public.assignment_activities (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.program_assignments (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null,
  position        int not null default 0,
  title           text not null,
  instructions    text,
  created_at      timestamptz not null default now()
);
create index assignment_activities_assign_idx on public.assignment_activities (assignment_id, position);

-- Progresso/anotações (escritos pelo PACIENTE; lidos pelo profissional).
create table public.assignment_progress (
  id                     uuid primary key default gen_random_uuid(),
  assignment_activity_id uuid not null references public.assignment_activities (id) on delete cascade,
  assignment_id          uuid not null references public.program_assignments (id) on delete cascade,
  professional_id        uuid not null references public.profiles (id) on delete cascade,
  patient_user_id        uuid references public.profiles (id) on delete set null,
  done                   boolean not null default false,
  done_at                timestamptz,
  patient_note           text,
  updated_at             timestamptz not null default now(),
  unique (assignment_activity_id)
);

-- ---------- (2) CURSOS ----------
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.profiles (id) on delete set null,
  title        text not null,
  description  text,
  audience     text not null default 'all' check (audience in ('student','professional','public','all')),
  is_paid      boolean not null default false,
  price        numeric(10,2),
  status       text not null default 'draft' check (status in ('draft','published','archived')),
  created_at   timestamptz not null default now()
);
create table public.course_modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  position   int not null default 0,
  title      text not null
);
create table public.course_lessons (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references public.course_modules (id) on delete cascade,
  course_id  uuid not null references public.courses (id) on delete cascade,
  position   int not null default 0,
  title      text not null,
  content    text,
  kind       text not null default 'text',
  video_url  text
);
create index course_lessons_course_idx on public.course_lessons (course_id, position);

create table public.course_enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  paid        boolean not null default false,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create table public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.course_lessons (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  completed    boolean not null default true,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.programs              enable row level security;
alter table public.program_activities    enable row level security;
alter table public.program_licenses      enable row level security;
alter table public.program_assignments   enable row level security;
alter table public.assignment_activities enable row level security;
alter table public.assignment_progress   enable row level security;
alter table public.courses               enable row level security;
alter table public.course_modules        enable row level security;
alter table public.course_lessons        enable row level security;
alter table public.course_enrollments    enable row level security;
alter table public.lesson_progress       enable row level security;

-- Programas (catálogo): público lê publicados; autor/admin gerenciam.
create policy programs_public_read on public.programs for select using (status = 'published');
create policy programs_author_all on public.programs for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy programs_admin_all on public.programs for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy program_activities_public_read on public.program_activities for select using (
  exists (select 1 from public.programs p where p.id = program_activities.program_id and p.status = 'published')
);
create policy program_activities_admin_all on public.program_activities for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Licenças: do profissional.
create policy program_licenses_owner on public.program_licenses for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

-- Atribuição: profissional dono (tudo); paciente lê a própria.
create policy assignments_pro_all on public.program_assignments for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy assignments_patient_read on public.program_assignments for select using (patient_user_id = auth.uid());

-- Atividades da atribuição: profissional edita; paciente lê.
create policy assign_acts_pro_all on public.assignment_activities for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy assign_acts_patient_read on public.assignment_activities for select using (patient_user_id = auth.uid());

-- Progresso: paciente escreve o próprio; profissional lê.
create policy progress_patient_all on public.assignment_progress for all using (patient_user_id = auth.uid()) with check (patient_user_id = auth.uid());
create policy progress_pro_read on public.assignment_progress for select using (professional_id = auth.uid());

-- Cursos: público lê publicados; autor/admin gerenciam.
create policy courses_public_read on public.courses for select using (status = 'published');
create policy courses_author_all on public.courses for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy courses_admin_all on public.courses for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy modules_public_read on public.course_modules for select using (
  exists (select 1 from public.courses c where c.id = course_modules.course_id and c.status = 'published')
);
create policy modules_admin_all on public.course_modules for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Aulas: livres se o curso é gratuito+publicado; inscritos leem as suas; admin tudo.
create policy lessons_free_read on public.course_lessons for select using (
  exists (select 1 from public.courses c where c.id = course_lessons.course_id and c.status='published' and c.is_paid = false)
);
create policy lessons_enrolled_read on public.course_lessons for select using (
  exists (select 1 from public.course_enrollments e where e.course_id = course_lessons.course_id and e.user_id = auth.uid())
);
create policy lessons_admin_all on public.course_lessons for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Inscrições e progresso de aula: do próprio usuário.
create policy enrollments_owner on public.course_enrollments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lesson_progress_owner on public.lesson_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Grants (Supabase concede por default; explícito para robustez).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.programs, public.program_activities, public.courses,
      public.course_modules, public.course_lessons to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on
      public.programs, public.program_activities, public.program_licenses,
      public.program_assignments, public.assignment_activities, public.assignment_progress,
      public.courses, public.course_modules, public.course_lessons,
      public.course_enrollments, public.lesson_progress
      to authenticated;
  end if;
end$$;

-- Fim da migration 0005.
