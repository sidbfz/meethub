-- Comprehensive Fix for RLS Issues Blocking Event Access
-- This addresses the empty error objects and blocked queries

-- 1. Check current RLS status and policies
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('events', 'event_participants', 'users', 'messages')
AND schemaname = 'public';

-- 2. Show current policies for debugging
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'event_participants', 'users')
ORDER BY tablename, policyname;

-- 3. Fix Events table policies
DROP POLICY IF EXISTS "Allow event access" ON events;
DROP POLICY IF EXISTS "Allow public to read approved events" ON events;
DROP POLICY IF EXISTS "Allow hosts to read own events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to create events" ON events;
DROP POLICY IF EXISTS "Allow hosts to update own events" ON events;
DROP POLICY IF EXISTS "Allow hosts to delete own events" ON events;

-- Create very permissive SELECT policy for events to fix immediate access issues
CREATE POLICY "Allow broad event access" ON events
FOR SELECT
TO public
USING (
  -- Allow public access to approved events
  status = 'approved'
  OR
  -- Allow authenticated users to see their hosted events (any status)
  (auth.uid() IS NOT NULL AND auth.uid() = host_id)
  OR
  -- Allow authenticated users to see events they participate in
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM event_participants ep 
    WHERE ep.event_id = events.id 
    AND ep.user_id = auth.uid()
  ))
);

-- Recreate other events policies
CREATE POLICY "Allow event creation" ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Allow host event updates" ON events
FOR UPDATE
TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Allow host event deletion" ON events
FOR DELETE
TO authenticated
USING (auth.uid() = host_id);

-- 4. Fix Event Participants table policies
DROP POLICY IF EXISTS "Allow participant viewing" ON event_participants;
DROP POLICY IF EXISTS "Allow participant insertion" ON event_participants;
DROP POLICY IF EXISTS "Allow participant updates" ON event_participants;

-- Very permissive policy for event_participants
CREATE POLICY "Allow event participant access" ON event_participants
FOR SELECT
TO public
USING (
  -- Allow viewing participants of approved events
  EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = event_participants.event_id 
    AND e.status = 'approved'
  )
  OR
  -- Allow authenticated users to see participants of their hosted events
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = event_participants.event_id 
    AND e.host_id = auth.uid()
  ))
  OR
  -- Allow authenticated users to see participants of events they're in
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM events e 
    JOIN event_participants ep ON e.id = ep.event_id
    WHERE e.id = event_participants.event_id 
    AND ep.user_id = auth.uid()
  ))
);

CREATE POLICY "Allow joining events" ON event_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow leaving events" ON event_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Ensure Users table has the correct policy (already fixed earlier)
-- The "Allow viewing participant profiles for public events" policy should be sufficient

-- 6. Verify all policies are working
SELECT 
  'events' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'events'
UNION ALL
SELECT 
  'event_participants' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'event_participants'
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'users';

-- 7. Show final policies for verification
SELECT 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN 'public' = ANY(roles) THEN 'PUBLIC'
    WHEN 'authenticated' = ANY(roles) THEN 'AUTHENTICATED'
    ELSE array_to_string(roles, ',')
  END as access_level
FROM pg_policies 
WHERE tablename IN ('events', 'event_participants', 'users')
ORDER BY tablename, cmd, policyname;
