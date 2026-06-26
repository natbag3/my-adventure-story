
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Storage policies for adventurer-photos bucket: each user manages their own folder
CREATE POLICY "Users read own adventurer photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'adventurer-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own adventurer photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'adventurer-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own adventurer photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'adventurer-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own adventurer photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'adventurer-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
