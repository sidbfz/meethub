-- Simple Realtime Setup for Messages Table
-- Run these commands in your Supabase SQL Editor

-- 1. Enable realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 2. Grant realtime access to authenticated users
GRANT SELECT ON messages TO authenticated;
GRANT INSERT ON messages TO authenticated;

-- 3. Simple realtime policy (since RLS is already enabled)
-- This allows authenticated users to receive realtime updates for messages
DROP POLICY IF EXISTS "Realtime access for authenticated users" ON messages;
CREATE POLICY "Realtime access for authenticated users" ON messages
FOR SELECT
TO authenticated  
USING (true);

-- 4. Verify the setup
SELECT 
  schemaname, 
  tablename, 
  rowfilter, 
  policyname
FROM pg_policies 
WHERE tablename = 'messages';

-- 5. Check realtime publication
SELECT * 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';
