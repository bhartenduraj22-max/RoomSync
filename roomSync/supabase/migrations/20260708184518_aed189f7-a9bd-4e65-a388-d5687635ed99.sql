
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Allow anyone (anon + authenticated) to read from the room-media bucket
CREATE POLICY "Anyone can view room media" ON storage.objects FOR SELECT
  USING (bucket_id = 'room-media');
CREATE POLICY "Authenticated users can upload room media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'room-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own room media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'room-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own room media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'room-media' AND auth.uid()::text = (storage.foldername(name))[1]);
