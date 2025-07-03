-- Create post-media bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own media
CREATE POLICY "Users can upload post media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own media
CREATE POLICY "Users can update own post media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'post-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own media
CREATE POLICY "Users can delete own post media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'post-media' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view post media
CREATE POLICY "Public can view post media" ON storage.objects
FOR SELECT USING (bucket_id = 'post-media');

-- Add media columns to posts table if they don't exist
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_urls TEXT[],
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add repost_of column for quote reposts
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS repost_of UUID REFERENCES posts(id);
