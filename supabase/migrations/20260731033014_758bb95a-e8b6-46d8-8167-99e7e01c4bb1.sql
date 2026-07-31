CREATE POLICY "own medical files read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own medical files insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own medical files update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medical-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own medical files delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medical-docs' AND auth.uid()::text = (storage.foldername(name))[1]);