DROP POLICY IF EXISTS "portfolio_insert" ON storage.objects;
CREATE POLICY "portfolio_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "portfolio_select" ON storage.objects;
CREATE POLICY "portfolio_select" ON storage.objects
FOR SELECT USING (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "portfolio_delete" ON storage.objects;
CREATE POLICY "portfolio_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'portfolio');
