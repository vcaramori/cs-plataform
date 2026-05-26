-- 1. Create the storage bucket for attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the attachments bucket
-- Allow public access to view files (since bucket is public, but let's be explicit)
CREATE POLICY "Public Access to attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attachments' AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own uploaded files (optional, but good practice)
CREATE POLICY "Users can update their own attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'attachments' AND owner = auth.uid()
  );

CREATE POLICY "Users can delete their own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'attachments' AND owner = auth.uid()
  );

-- 3. Add file_urls to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS file_urls JSONB DEFAULT '[]'::jsonb;

-- 4. Add file_urls to interactions
ALTER TABLE public.interactions 
ADD COLUMN IF NOT EXISTS file_urls JSONB DEFAULT '[]'::jsonb;
