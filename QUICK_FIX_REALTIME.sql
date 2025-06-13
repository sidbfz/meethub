-- Fix Realtime Policies for Messages (table already in publication)
-- Run this in your Supabase SQL Editor

-- Since the table is already in supabase_realtime publication,
-- we just need to create proper RLS policies

-- 1. Create a simple SELECT policy for realtime to work
DROP POLICY IF EXISTS "Allow realtime for authenticated users" ON messages;
CREATE POLICY "Allow realtime for authenticated users" ON messages
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Ensure INSERT policy exists for sending messages
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON messages;
CREATE POLICY "Allow insert for authenticated users" ON messages
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 3. Allow DELETE for message owners (for realtime delete events)
DROP POLICY IF EXISTS "Allow delete for message owners" ON messages;
CREATE POLICY "Allow delete for message owners" ON messages
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Allow UPDATE for message owners (for realtime update events)
DROP POLICY IF EXISTS "Allow update for message owners" ON messages;
CREATE POLICY "Allow update for message owners" ON messages
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Grant necessary permissions
GRANT SELECT ON messages TO authenticated;
GRANT INSERT ON messages TO authenticated;
GRANT DELETE ON messages TO authenticated;
GRANT UPDATE ON messages TO authenticated;

-- 6. Verify policies are created
SELECT 
  policyname, 
  cmd, 
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- 7. Test realtime subscription
-- Your browser console should now show "SUBSCRIBED" status
