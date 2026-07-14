CREATE POLICY "Users can read their own story audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'story-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload their own story audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'story-audio' AND (storage.foldername(name))[1] = auth.uid()::text);