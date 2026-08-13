# AyA — Plataforma (Fase 0)

Scaffold do ecossistema de saúde integrada da AyA. Stack: **Next.js 14 (App Router) +
TypeScript + Tailwind + Supabase (Postgres, Auth, RLS)**.

## O que já vem
- **Rede Viva** (`src/components/RedeViva.tsx`): a assinatura da marca — céu no crepúsculo
  com a rede de luzes que cresce e se une. Fundo único do layout raiz. Respeita
  `prefers-reduced-motion`.
- **Design system** aplicado em `src/app/globals.css` (tokens da paleta e tipografia).
- **Auth + RBAC**: login e cadastro (cliente x profissional), sessão via `@supabase/ssr`,
  middleware protegendo `/painel`, e leitura de papéis em `src/lib/auth.ts`.
- **Banco da Fase 0**: `supabase/migrations/0001_aya_foundation.sql` (schema + RLS).
  O isolamento clínico é imposto pelo Postgres, não pela app.

## Rodando localmente
1. Crie um projeto no Supabase e rode a migration:
   - SQL Editor → cole `supabase/migrations/0001_aya_foundation.sql` → Run
   - (ou `supabase db push` com a CLI)
2. `cp .env.local.example .env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Fluxo de papéis
- Todo cadastro nasce **cliente** (trigger `handle_new_user`).
- Cadastro como profissional grava a intenção; na 1ª visita ao `/painel` cria
  `professional_profiles` como **pending**. A **aprovação** e o papel `professional`
  são concedidos pelo **admin** (curadoria) — reflete a Seção 3.1 do guia.

## Fase 1 — Descoberta e conteúdo (incluída)
Rotas voltadas ao cliente, todas sobre a RLS da Fase 0:
- **/profissionais** — diretório com filtros (área, modalidade, preço) e busca; **/profissionais/[id]** perfil público + publicações + salvar.
- **/praticas** — atividades em grupo. **/apps** — vitrine dos apps terapêuticos.
- **/feed** — feed filtrável por tema; **/feed/[id]** detalhe com curtir/salvar, comentários e o aviso "não substitui avaliação profissional".
- **/feed/novo** — publicação (só profissional aprovado/admin); todo post entra como `pending_review`.
- **/admin/moderacao** — fila de revisão do admin (aprovar/recusar).

Migration desta fase: `supabase/migrations/0002_discovery.sql` (nome/avatar públicos do
profissional, índices de filtro, grants). Rode-a após a `0001`.

### Popular com dados de exemplo (dev)
`supabase/seed.sql` cria profissionais, atividades, apps e posts para o diretório/feed
não nascerem vazios. Rode no SQL Editor **depois** das migrations. Observações:
- As contas criadas pelo seed são só autores/donos de conteúdo — **não têm senha**.
  Para testar login, crie contas reais pelo `/cadastro`.
- Para virar **admin** e ver a moderação: cadastre-se e rode
  `insert into public.user_roles (user_id, role) values ('SEU-UUID','admin');`
- Se sua versão do Supabase recusar o `insert` em `auth.users`, cadastre 2 profissionais
  pelo app, aprove-os (`update professional_profiles set status='approved' ...`) e ajuste
  os UUIDs do restante do seed.

## Fase 2 — Gestão da prática (incluída)
O "núcleo Elo", privado do profissional (RLS: `professional_id = auth.uid()`).
- **Agendamento por solicitação:** no perfil público, o cliente pede um horário
  (`booking_requests`); o profissional **aceita** e aí nascem o paciente e a sessão —
  sem o cliente escrever nas tabelas clínicas.
- **/painel/agenda** — solicitações + sessões (marcar realizada/cancelada/faltou).
- **/painel/pacientes** e **/painel/pacientes/[id]** — cadastro, evoluções sigilosas,
  sessões e **documentos** (upload privado + link assinado temporário).
- **/painel/financeiro** — lançamentos, status pago/pendente e resumo.

Migration desta fase: `supabase/migrations/0003_booking.sql`. Rode-a após `0001`/`0002`.

### Storage de documentos (rode uma vez no Supabase)
Os documentos ficam num bucket privado. Rode `supabase/storage_setup.sql` no SQL Editor
para criar o bucket `patient-documents` e sua política (só o profissional dono acessa a
própria pasta). Sem isso, o upload falha.

Decisões adotadas nesta fase: **agendamento pela plataforma = sim** (modelo de
solicitação/confirmação); **pagamento online = adiado para a Fase 4** (o financeiro é
manual, pago/pendente).

## Fase 3 — Aprofundamento (incluída)
- **Árvore relacional familiar** — na ficha do paciente (`/painel/pacientes/[id]`):
  adicionar familiares, ligar relações e ver a árvore em SVG. Privada do profissional
  (mesma RLS do prontuário — admin não vê).
- **Relatórios / BI** (`/painel/relatorios`) — recebido, a receber, despesas, lucro
  líquido, pacientes, faturamento dos últimos 6 meses, despesas por categoria e sessões
  por status.
- **Apps + adesão** (`/apps`) — abrir registra uso em `app_usage`; o handoff por **SSO**
  fica marcado no código como ponto de integração (quando os apps expuserem login/API).
- **Feed enriquecido** — canal de **denúncia** (report), contagem de curtidas/comentários
  no feed, e fila de conteúdo denunciado na **moderação** (admin pode arquivar).
- **Mídia no feed** — imagem opcional na publicação (bucket público `post-media`); a
  imagem passa pela **moderação humana** junto do post antes de ir ao ar. Moderação
  automática de imagem (serviço externo de visão) fica como próximo passo.

Para a mídia funcionar, rode novamente `supabase/storage_setup.sql` (agora cria também o
bucket público `post-media`).

## Mensagens automáticas — confirmação e lembrete (incluída)
Confirmação ao agendar e lembrete ~24h antes da sessão, com **canal trocável**:
e-mail funciona já; **WhatsApp fica pronto para ligar** (Meta Cloud API) sem mexer na
estrutura.

- Migration: `supabase/migrations/0004_notifications.sql` (confirmação de presença +
  tabela `notifications`, com `unique(appointment_id, kind)` que impede envio duplicado).
- Ao aceitar uma solicitação ou criar uma sessão, o sistema **enfileira e envia a
  confirmação** (best-effort; nunca quebra o agendamento). O e-mail traz um link seguro
  (assinado) **"Confirmar presença"**; ao clicar, marca `patient_confirmed_at` e a agenda
  mostra "✓ confirmada pelo paciente".
- Os **lembretes** são criados/enviados pelo cron `GET /api/cron/reminders` (config em
  `vercel.json`, a cada 6h). Alternativa ao cron da Vercel: chamar essa URL pelo
  **pg_cron do Supabase** (útil no plano grátis).

### Como ativar o e-mail (agora)
1. Crie conta no **Resend**, verifique um domínio de envio.
2. Defina no ambiente: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `NOTIFY_SECRET`
   (string aleatória), `CRON_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` (**servidor apenas**).
3. Pronto. Sem chaves, as mensagens ficam registradas como `skipped` (nada quebra).

### Como ligar o WhatsApp (depois)
1. Tenha WhatsApp Business API (Meta ou provedor: Twilio/Z-API/Zenvia).
2. Crie os **templates aprovados** (`confirmacao_sessao`, `lembrete_sessao`) com 4
   variáveis: paciente, profissional, data/hora, link.
3. Defina `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID`. A partir daí, pacientes com telefone
   passam a receber por WhatsApp automaticamente (o código já escolhe o canal).

## Programas terapêuticos + Cursos (incluída)
Dois sistemas, sobre a migration `supabase/migrations/0005_programs_courses.sql` (rode
depois das anteriores) e o seed de exemplos `supabase/seed_programs.sql`.

**Programas (estilo MyDose)** — protocolos com atividades que o profissional atribui a
pacientes:
- `/programas` catálogo · `/programas/[id]` detalhe → **Adquirir** (licença; pago fica
  registrado, cobrança na Fase 4).
- `/painel/programas` → **atribuir** a um paciente (cria uma cópia editável das
  atividades) e acompanhar; `/painel/programas/[id]` → **ajustar atividades** e ver o
  progresso e as anotações do paciente.
- `/meus-programas` (paciente) → marcar cada atividade como concluída e **fazer
  anotações**. Sigilo garantido: o paciente só vê/edita o próprio progresso; o
  profissional lê o dos seus pacientes; **o admin não vê nada disso** (validado por teste).

**Cursos/módulos** — para estudantes, profissionais e público, gratuitos ou pagos:
- `/cursos` catálogo · `/cursos/[id]` detalhe → **inscrever-se** · `/cursos/[id]/aprender`
  aulas com marcação de progresso. Cursos pagos liberam o conteúdo após inscrição
  (cobrança real = Fase 4); gratuitos são abertos.

Próximos passos naturais: painel de **autoria** (admin cria programas/cursos pela
interface, hoje via seed) e a **cobrança** dos itens pagos (Fase 4).

## A fazer
- Substituir as fontes substitutas (Spectral/Sacramento) pelas licenciadas
  (Singel, Brittany, The Silver Editorial) em `/public/fonts` + `@font-face`.
- Regenerar `src/lib/database.types.ts` completo com `supabase gen types`.
- Moderação automática de imagem (serviço de visão) para o upload do feed.
- **Fase 4**: assinaturas e pagamentos (gateway: Stripe/Mercado Pago/Asaas), inscrições
  pagas em atividades, métricas de retenção, e subir Supabase/hospedagem para produção.
