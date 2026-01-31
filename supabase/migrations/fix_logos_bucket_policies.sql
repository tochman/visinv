-- Logos bucket RLS policies verification
-- All 4 policies should exist:
-- 1. "Logo images are publicly accessible" (SELECT)
-- 2. "Users can upload own logo" (INSERT)
-- 3. "Users can update own logo" (UPDATE)  
-- 4. "Users can delete own logo" (DELETE)

-- Verify all policies exist (case-insensitive search)
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (policyname ILIKE '%logo%')
ORDER BY policyname;
