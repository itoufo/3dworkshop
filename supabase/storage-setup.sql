-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('stl-files', 'stl-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('workshop-images', 'workshop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for STL files
CREATE POLICY "Allow public uploads for stl" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'stl-files');

CREATE POLICY "Allow public downloads for stl" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'stl-files');

-- Set up storage policies for workshop images
CREATE POLICY "Allow public uploads for workshop images" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'workshop-images');

CREATE POLICY "Allow public downloads for workshop images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'workshop-images');

CREATE POLICY "Allow public delete for workshop images" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'workshop-images');

CREATE POLICY "Allow public update for workshop images" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'workshop-images');