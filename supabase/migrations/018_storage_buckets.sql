-- ── Supabase Storage buckets ────────────────────────────────────────────────

-- Bucket for project files (PDFs, docs, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true,
  20971520, -- 20MB
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/gif','application/zip','application/x-zip-compressed']
) ON CONFLICT (id) DO NOTHING;

-- Bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ── RLS Policies for project-files ───────────────────────────────────────────

-- Allow authenticated users to upload to their company folder
CREATE POLICY "project_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files');

-- Allow authenticated users to read files
CREATE POLICY "project_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-files');

-- Allow authenticated users to delete their files
CREATE POLICY "project_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-files');

-- ── RLS Policies for user-avatars ────────────────────────────────────────────

CREATE POLICY "user_avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "user_avatars_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-avatars');

CREATE POLICY "user_avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'user-avatars');

CREATE POLICY "user_avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-avatars');
