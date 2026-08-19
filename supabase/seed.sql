-- =============================================================================
-- AyA — SEED de DESENVOLVIMENTO (não use em produção)
-- Popula o diretório e o feed com conteúdo de exemplo.
--
-- IMPORTANTE: cria usuários diretamente em auth.users apenas para servir de
-- AUTORES/DONOS do conteúdo público. Essas contas não têm senha utilizável —
-- são só para o diretório/feed não nascerem vazios. Para testar login, crie
-- contas reais pelo /cadastro. Se a sua versão do Supabase recusar o insert em
-- auth.users, cadastre 2 profissionais pelo app e ajuste os UUIDs abaixo.
-- =============================================================================

-- Profissionais (autores/donos do conteúdo)
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a1111111-1111-1111-1111-111111111111','authenticated','authenticated','alanne@exemplo.aya',
   '', now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Alanne Farias"}', now(), now()),
  ('a2222222-2222-2222-2222-222222222222','authenticated','authenticated','rafael@exemplo.aya',
   '', now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Rafael Nunes"}', now(), now()),
  ('a3333333-3333-3333-3333-333333333333','authenticated','authenticated','marina@exemplo.aya',
   '', now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Marina Belo"}', now(), now())
on conflict (id) do nothing;

-- (o trigger handle_new_user já criou profiles + papel 'client'.)
-- Concede o papel profissional aos três.
insert into public.user_roles (user_id, role) values
  ('a1111111-1111-1111-1111-111111111111','professional'),
  ('a2222222-2222-2222-2222-222222222222','professional'),
  ('a3333333-3333-3333-3333-333333333333','professional')
on conflict do nothing;

-- Perfis públicos aprovados.
insert into public.professional_profiles
  (user_id, profession, council, registration_number, registration_uf, display_name,
   headline, bio, approach, specialties, modalities, city, uf, price_min, price_max, status, approved_at)
values
  ('a1111111-1111-1111-1111-111111111111','psychologist','CRP','06/123456','PB','Alanne Farias',
   'Psicóloga · TCC · ansiedade e autoconhecimento',
   'Atendo adultos em processos de ansiedade, autoconhecimento e transições de vida. Espaço seguro e colaborativo.',
   'Terapia Cognitivo-Comportamental',
   array['Ansiedade','Autoconhecimento','Transições de vida'],
   array['online','in_person']::attendance_modality[], 'Patos','PB', 120, 180, 'approved', now()),
  ('a2222222-2222-2222-2222-222222222222','nutritionist','CRN','1234','PB','Rafael Nunes',
   'Nutricionista · comportamento alimentar',
   'Nutrição com foco em relação saudável com a comida, sem dietas restritivas. Abordagem acolhedora e sustentável.',
   'Nutrição comportamental',
   array['Comportamento alimentar','Saúde integrativa'],
   array['online']::attendance_modality[], 'Patos','PB', 100, 150, 'approved', now()),
  ('a3333333-3333-3333-3333-333333333333','physiotherapist','CREFITO','98765','PB','Marina Belo',
   'Fisioterapeuta · dor crônica e movimento',
   'Fisioterapia voltada a dor crônica, reeducação de movimento e bem-estar. Cuidado próximo e baseado em evidências.',
   'Fisioterapia baseada em evidências',
   array['Dor crônica','Reabilitação','Movimento'],
   array['in_person','hybrid']::attendance_modality[], 'Patos','PB', 90, 140, 'approved', now())
on conflict (user_id) do nothing;

-- Atividades (práticas em grupo).
insert into public.activities (host_id, title, description, modality, starts_at, capacity, price, status)
values
  ('a1111111-1111-1111-1111-111111111111','Roda de conversa: ansiedade no trabalho',
   'Encontro guiado para compartilhar experiências e estratégias de regulação. Mediação interdisciplinar.',
   'online', now() + interval '12 days', 12, 0, 'open'),
  ('a2222222-2222-2222-2222-222222222222','Oficina: comer com atenção',
   'Prática de alimentação consciente e escuta do corpo, sem culpa e sem dietas.',
   'online', now() + interval '20 days', 15, 40, 'open'),
  ('a3333333-3333-3333-3333-333333333333','Movimento e respiração',
   'Sessão presencial de reeducação do movimento e respiração para aliviar tensões.',
   'in_person', now() + interval '8 days', 8, 30, 'open')
on conflict do nothing;

-- Apps terapêuticos (produtos da AyA).
insert into public.apps (name, description, access_type, launch_url, is_active)
values
  ('Respira','Prática guiada de respiração para momentos de sobrecarga.','linked_sso','https://apps.aya/respira', true),
  ('Diário','Um diário orientado para acompanhar humor e pensamentos entre sessões.','linked_sso','https://apps.aya/diario', true),
  ('Presença','Trilhas curtas de atenção plena para o dia a dia.','linked_sso','https://apps.aya/presenca', true)
on conflict do nothing;

-- Feed: posts publicados + um em revisão.
insert into public.posts (author_id, title, body, category, tags, status, published_at)
values
  ('a1111111-1111-1111-1111-111111111111',
   'O que o corpo faz quando você respira fundo',
   'Respirar devagar ativa o ramo do sistema nervoso que acalma o corpo. Um panorama breve — sem promessas, com fundamento — sobre como a respiração participa da regulação emocional.',
   'Fisiologia', array['respiração','ansiedade','regulação'], 'published', now() - interval '2 days'),
  ('a2222222-2222-2222-2222-222222222222',
   'Fome física e fome emocional: como diferenciar',
   'Nem toda vontade de comer é fome do estômago. Entender a diferença ajuda a construir uma relação mais gentil com a comida.',
   'Comportamento alimentar', array['alimentação','autocuidado'], 'published', now() - interval '5 days'),
  ('a3333333-3333-3333-3333-333333333333',
   'Movimento como cuidado, não como punição',
   'Reposicionar o exercício como um cuidado com o corpo muda a experiência da dor crônica ao longo do tempo.',
   'Movimento', array['dor crônica','movimento'], 'published', now() - interval '1 day'),
  ('a1111111-1111-1111-1111-111111111111',
   'Rascunho em revisão',
   'Este post está em revisão de moderação e não deve aparecer no feed público.',
   'Geral', array['teste'], 'pending_review', null)
on conflict do nothing;

-- Fim do seed.
