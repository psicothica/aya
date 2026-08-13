-- =============================================================================
-- AyA — Configuração de STORAGE (rode no projeto Supabase)
-- Bucket privado para documentos clínicos. Caminho por convenção:
--   patient-documents/{professional_id}/{patient_id}/{arquivo}
-- Só o profissional dono acessa arquivos sob a própria pasta.
-- (Fora do bloco de migrations porque depende do schema `storage` do Supabase.)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

drop policy if exists "prof_rw_own_patient_docs" on storage.objects;
create policy "prof_rw_own_patient_docs"
on storage.objects for all to authenticated
using (
  bucket_id = 'patient-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'patient-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Entrega ao cliente/paciente: sempre via URL assinada gerada no backend,
-- nunca expondo o bucket publicamente.

-- =============================================================================
-- Fase 3 — Mídia do feed. Bucket PÚBLICO (imagens de posts publicados são
-- públicas). Escrita só por autenticado, na própria pasta; leitura pública.
-- A moderação da imagem é humana: o post só vai ao ar após aprovação do admin.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

drop policy if exists "authed_upload_own_post_media" on storage.objects;
create policy "authed_upload_own_post_media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "public_read_post_media" on storage.objects;
create policy "public_read_post_media"
on storage.objects for select to anon, authenticated
using (bucket_id = 'post-media');
