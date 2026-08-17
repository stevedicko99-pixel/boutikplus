-- Chat media URLs are persisted as public URLs in messages, so the bucket remains
-- public for backward compatibility. Object mutations are restricted by RLS.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800,
  ARRAY['audio/m4a', 'audio/mp4', 'audio/webm', 'video/mp4', 'video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "chat_media_participant_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_participant_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_owner_delete" ON storage.objects;

CREATE POLICY "chat_media_participant_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id::text = (storage.foldername(name))[1]
      AND (
        conversations.buyer_id = auth.uid()
        OR conversations.seller_id = auth.uid()
      )
  )
);

CREATE POLICY "chat_media_participant_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id::text = (storage.foldername(name))[1]
      AND (
        conversations.buyer_id = auth.uid()
        OR conversations.seller_id = auth.uid()
      )
  )
);

CREATE POLICY "chat_media_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id::text = (storage.foldername(name))[1]
      AND (
        conversations.buyer_id = auth.uid()
        OR conversations.seller_id = auth.uid()
      )
  )
);
