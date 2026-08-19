-- =============================================================================
-- AyA — SEED de exemplos (programas terapêuticos + curso). Dev.
-- Autor = AyA (author_id null). Rode após as migrations.
-- =============================================================================

-- Programa terapêutico de exemplo (gratuito) + atividades.
insert into public.programs (id, title, description, category, is_paid, price, status)
values ('11110000-0000-0000-0000-0000000000a1',
  'Higiene do sono em 7 dias',
  'Um programa curto para reorganizar a rotina de sono, com práticas simples e registro diário. Ajustável pelo profissional para cada paciente.',
  'Sono', false, null, 'published')
on conflict (id) do nothing;

insert into public.program_activities (program_id, position, title, instructions, kind) values
 ('11110000-0000-0000-0000-0000000000a1', 1, 'Horário fixo para deitar', 'Escolha um horário e mantenha-o por todos os dias, mesmo nos fins de semana.', 'task'),
 ('11110000-0000-0000-0000-0000000000a1', 2, 'Sem telas 1h antes', 'Evite celular/TV na última hora antes de dormir. Anote como se sentiu.', 'task'),
 ('11110000-0000-0000-0000-0000000000a1', 3, 'Diário de sono', 'Registre a que horas dormiu e acordou, e a qualidade percebida (0–10).', 'reflection'),
 ('11110000-0000-0000-0000-0000000000a1', 4, 'Ritual de relaxamento', 'Teste uma prática de respiração ou leitura leve antes de dormir.', 'practice')
on conflict do nothing;

-- Programa pago de exemplo (cobrança real vem na Fase 4).
insert into public.programs (id, title, description, category, is_paid, price, status)
values ('11110000-0000-0000-0000-0000000000a2',
  'Manejo da ansiedade — protocolo base',
  'Protocolo estruturado de psicoeducação e exercícios para manejo da ansiedade, para o profissional adaptar ao caso.',
  'Ansiedade', true, 79.90, 'published')
on conflict (id) do nothing;
insert into public.program_activities (program_id, position, title, instructions, kind) values
 ('11110000-0000-0000-0000-0000000000a2', 1, 'Mapa dos gatilhos', 'Liste situações que disparam ansiedade e a intensidade (0–10).', 'reflection'),
 ('11110000-0000-0000-0000-0000000000a2', 2, 'Respiração diafragmática', 'Pratique 2x ao dia por 5 minutos; registre antes/depois.', 'practice'),
 ('11110000-0000-0000-0000-0000000000a2', 3, 'Reestruturação de pensamentos', 'Escolha um pensamento ansioso e escreva uma alternativa mais equilibrada.', 'task')
on conflict do nothing;

-- Curso de exemplo (gratuito) com módulos e aulas.
insert into public.courses (id, title, description, audience, is_paid, price, status)
values ('22220000-0000-0000-0000-0000000000b1',
  'Introdução ao autocuidado em saúde mental',
  'Um curso introdutório aberto ao público: o que é autocuidado, sinais de alerta e quando buscar ajuda.',
  'public', false, null, 'published')
on conflict (id) do nothing;

insert into public.course_modules (id, course_id, position, title) values
 ('22221000-0000-0000-0000-0000000000c1','22220000-0000-0000-0000-0000000000b1',1,'Fundamentos'),
 ('22221000-0000-0000-0000-0000000000c2','22220000-0000-0000-0000-0000000000b1',2,'Na prática')
on conflict (id) do nothing;

insert into public.course_lessons (module_id, course_id, position, title, content, kind) values
 ('22221000-0000-0000-0000-0000000000c1','22220000-0000-0000-0000-0000000000b1',1,'O que é autocuidado','Autocuidado não é egoísmo: é o conjunto de práticas que sustentam seu bem-estar físico e emocional ao longo do tempo.','text'),
 ('22221000-0000-0000-0000-0000000000c1','22220000-0000-0000-0000-0000000000b1',2,'Sinais de alerta','Aprenda a reconhecer sinais de que algo precisa de atenção — sono, humor, energia e relações.','text'),
 ('22221000-0000-0000-0000-0000000000c2','22220000-0000-0000-0000-0000000000b1',1,'Montando sua rotina','Como desenhar uma rotina realista de autocuidado, começando pequeno.','text'),
 ('22221000-0000-0000-0000-0000000000c2','22220000-0000-0000-0000-0000000000b1',2,'Quando buscar ajuda','Sinais de que é hora de procurar um profissional — e como a AyA pode ajudar nessa ponte.','text')
on conflict do nothing;

-- Curso pago de exemplo (para profissionais).
insert into public.courses (id, title, description, audience, is_paid, price, status)
values ('22220000-0000-0000-0000-0000000000b2',
  'Formação: primeiros atendimentos em ansiedade',
  'Curso para profissionais e estudantes sobre condução dos primeiros atendimentos em casos de ansiedade.',
  'professional', true, 149.90, 'published')
on conflict (id) do nothing;
insert into public.course_modules (id, course_id, position, title) values
 ('22221000-0000-0000-0000-0000000000d1','22220000-0000-0000-0000-0000000000b2',1,'Avaliação inicial')
on conflict (id) do nothing;
insert into public.course_lessons (module_id, course_id, position, title, content, kind) values
 ('22221000-0000-0000-0000-0000000000d1','22220000-0000-0000-0000-0000000000b2',1,'Acolhimento e triagem','Conteúdo exclusivo para inscritos: como conduzir o acolhimento inicial.','text')
on conflict do nothing;
