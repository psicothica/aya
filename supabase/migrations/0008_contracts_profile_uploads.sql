-- =============================================================================
-- AyA — Contrato terapêutico, perfil completo do paciente e uploads categorizados
-- Migration 0008.
--
-- Três blocos, cada um seguindo o padrão de isolamento já estabelecido no projeto:
--   professional_id = auth.uid()   → o profissional
--   patient_user_id = auth.uid()   → o paciente (quando tem conta vinculada)
-- SEM policy de admin em nenhuma tabela clínica desta migration — vínculo
-- profissional/paciente não é dado que a equipe AyA acessa.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Formalização de contrato
--
--    contract_templates      → modelo editável (o profissional edita o próprio;
--                               author_id null = modelo do sistema/AyA, semeado
--                               a partir do contrato-base ao final desta migration).
--    contract_assignments    → contrato enviado a um paciente: cópia IMUTÁVEL do
--                               texto no momento do envio (o paciente não edita).
--    contract_acceptances    → registro do aceite, em tabela separada, para o
--                               corpo do contrato em contract_assignments nunca
--                               ser tocado depois de enviado.
-- -----------------------------------------------------------------------------

create table public.contract_templates (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles (id) on delete set null, -- null = modelo do sistema/AyA
  title       text not null,
  body        text not null,
  version     int not null default 1,
  status      text not null default 'published' check (status in ('draft','published','archived')),
  created_at  timestamptz not null default now()
);

create table public.contract_assignments (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.profiles (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  patient_user_id  uuid references public.profiles (id) on delete set null, -- null se paciente sem conta
  title            text not null,
  body             text not null,   -- snapshot do texto do template no momento do envio
  version          int not null default 1,
  status           text not null default 'pending' check (status in ('pending','accepted')),
  sent_at          timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index contract_assignments_pro_idx on public.contract_assignments (professional_id);
create index contract_assignments_patient_idx on public.contract_assignments (patient_id);
create index contract_assignments_patient_user_idx on public.contract_assignments (patient_user_id);

create table public.contract_acceptances (
  id               uuid primary key default gen_random_uuid(),
  assignment_id    uuid not null references public.contract_assignments (id) on delete cascade,
  patient_user_id  uuid not null references public.profiles (id) on delete cascade,
  accepted_meta    text, -- opcional: identificador simples (ex.: user-agent). Sem dados desnecessários.
  accepted_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (assignment_id) -- um aceite por atribuição
);

alter table public.contract_templates    enable row level security;
alter table public.contract_assignments  enable row level security;
alter table public.contract_acceptances  enable row level security;

-- Templates: autor dono (tudo); modelo do sistema (author_id is null) legível por
-- todo profissional. SEM policy de admin.
create policy contract_templates_read on public.contract_templates for select
  using (author_id = auth.uid() or author_id is null);
create policy contract_templates_owner_all on public.contract_templates for all
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Atribuição: profissional dono faz tudo; paciente só LÊ a própria (não edita o corpo).
create policy contract_assignments_pro_all on public.contract_assignments for all
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy contract_assignments_patient_read on public.contract_assignments for select
  using (patient_user_id = auth.uid());

-- Aceites: paciente insere o próprio aceite (só em atribuição sua); profissional lê
-- os aceites dos contratos que ele enviou.
create policy contract_acceptances_patient_insert on public.contract_acceptances for insert
  with check (
    patient_user_id = auth.uid()
    and exists (
      select 1 from public.contract_assignments ca
      where ca.id = contract_acceptances.assignment_id and ca.patient_user_id = auth.uid()
    )
  );
create policy contract_acceptances_patient_read on public.contract_acceptances for select
  using (patient_user_id = auth.uid());
create policy contract_acceptances_pro_read on public.contract_acceptances for select
  using (
    exists (
      select 1 from public.contract_assignments ca
      where ca.id = contract_acceptances.assignment_id and ca.professional_id = auth.uid()
    )
  );

-- O paciente só tem SELECT em contract_assignments (não edita o corpo do
-- contrato — ver policies acima). Por isso o "aceite" não pode ser um UPDATE
-- feito pela sessão do paciente: a RLS bloquearia. Em vez disso, o INSERT em
-- contract_acceptances (que o paciente PODE fazer) dispara este trigger
-- SECURITY DEFINER, que marca a atribuição como aceita. O corpo do contrato
-- nunca é tocado por este caminho — só o campo status.
create or replace function public.mark_contract_assignment_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contract_assignments
  set status = 'accepted'
  where id = new.assignment_id;
  return new;
end;
$$;

create trigger trg_contract_acceptance_marks_assignment
  after insert on public.contract_acceptances
  for each row execute function public.mark_contract_assignment_accepted();

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on
      public.contract_templates, public.contract_assignments
      to authenticated;
    grant select, insert on public.contract_acceptances to authenticated;
  end if;
end$$;

-- Modelo do sistema (author_id null), semeado a partir do contrato-base da AyA.
-- Idempotente — não duplica em reruns.
do $$
begin
  if not exists (select 1 from public.contract_templates where author_id is null) then
    insert into public.contract_templates (author_id, title, body, version, status)
    values (null, 'Contrato terapêutico — modelo AyA', $CONTRACT$CONTRATO DE PRESTAÇÃO DE SERVIÇOS TERAPÊUTICOS

Pelo presente instrumento, de um lado [NOME DO PROFISSIONAL], [profissão], inscrito(a) no [conselho de classe, ex.: CRP] sob o nº [número de registro], doravante denominado(a) CONTRATADO(A), e de outro lado o(a) paciente identificado(a) na ficha de atendimento, doravante denominado(a) CONTRATANTE, resolvem firmar o presente contrato de prestação de serviços terapêuticos, mediante as cláusulas a seguir.

1. OBJETO
O presente contrato tem por objeto a prestação de serviços de atendimento terapêutico ao(à) CONTRATANTE, realizado pelo(a) CONTRATADO(A), com a periodicidade e modalidade (presencial e/ou online) acordadas entre as partes.

2. SIGILO PROFISSIONAL
O(A) CONTRATADO(A) compromete-se a manter sigilo sobre todas as informações compartilhadas pelo(a) CONTRATANTE durante os atendimentos, conforme o código de ética profissional aplicável. Excetuam-se dessa regra situações de risco iminente à vida do(a) CONTRATANTE ou de terceiros, suspeita de maus-tratos, determinação judicial ou outras hipóteses previstas em lei ou no código de ética da categoria.

3. SESSÕES E DURAÇÃO
As sessões terão duração aproximada de [duração] minutos, com periodicidade [semanal/quinzenal/a combinar], em dia e horário definidos entre as partes.

4. VALORES E FORMA DE PAGAMENTO
O valor de cada sessão é de R$ [valor], a ser pago [à vista/mensalmente], via [forma de pagamento], até [prazo de vencimento].

5. CANCELAMENTOS E FALTAS
Cancelamentos devem ser comunicados com antecedência mínima de [prazo, ex.: 24 horas]. Cancelamentos fora desse prazo, bem como faltas não justificadas, poderão ser cobrados integralmente, salvo acordo em contrário.

6. COMUNICAÇÃO ENTRE SESSÕES
O contato entre sessões (mensagens, e-mail, telefone) destina-se a questões operacionais (agendamento, remarcação). Não substitui o atendimento terapêutico e pode não ter resposta imediata.

7. SITUAÇÕES DE EMERGÊNCIA
Este contrato não cobre atendimento de urgência/emergência. Em caso de risco iminente, o(a) CONTRATANTE deve procurar o serviço de emergência mais próximo (SAMU 192) ou, em caso de risco de suicídio, o CVV (188, 24h, ligação gratuita).

8. PRONTUÁRIO E PROTEÇÃO DE DADOS (LGPD)
As informações do(a) CONTRATANTE são registradas em prontuário eletrônico privado, protegido por controles de acesso, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O acesso a esses dados é restrito ao(à) profissional responsável.

9. RESCISÃO
Qualquer das partes pode rescindir este contrato a qualquer momento, mediante comunicação prévia, preservando-se o disposto na cláusula de cancelamento quanto a sessões já agendadas.

10. FORO
Fica eleito o foro da comarca de [cidade/UF] para dirimir eventuais controvérsias decorrentes deste contrato.

Ao aceitar este contrato, o(a) CONTRATANTE declara ter lido e compreendido todas as cláusulas acima, concordando com os seus termos.$CONTRACT$, 1, 'published');
  end if;
end$$;


-- -----------------------------------------------------------------------------
-- 2. Perfil do paciente mais completo
--
--    Amplia public.patients (mantém a trava professional-only já existente —
--    nenhuma policy nova aqui, só colunas). avatar_url aponta para um objeto no
--    bucket privado 'patient-avatars' (ver storage_setup.sql); NUNCA um bucket
--    público — é dado sensível.
-- -----------------------------------------------------------------------------
alter table public.patients
  add column if not exists avatar_url             text,
  add column if not exists gender                 text,
  add column if not exists address                text,
  add column if not exists occupation              text,
  add column if not exists marital_status          text,
  add column if not exists emergency_contact_name  text,
  add column if not exists emergency_contact_phone text;
-- birth_date, phone, email, notes_summary já existem desde a migration 0001.


-- -----------------------------------------------------------------------------
-- 3. Upload de arquivos, prontuários e fichas — categorização
--
--    Reaproveita a tabela documents e o bucket privado 'patient-documents' já
--    existentes (mesmo isolamento professional-only, mesma URL assinada). Só
--    adiciona categoria/descrição para organizar a ficha do paciente.
-- -----------------------------------------------------------------------------
alter table public.documents
  add column if not exists category text not null default 'outro'
    check (category in ('prontuario','ficha_atendimento','laudo','exame','recibo','outro')),
  add column if not exists description text;

-- Fim da migration 0008.
