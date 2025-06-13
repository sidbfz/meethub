-- Emergency Fix for Event Detail Page Access
-- This fixes the 404 issue where both hosts and users can't access event details

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events';

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow public to read approved events" ON events;
DROP POLICY IF EXISTS "Allow hosts to read own events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to create events" ON events;
DROP POLICY IF EXISTS "Allow hosts to update own events" ON events;
DROP POLICY IF EXISTS "Allow hosts to delete own events" ON events;

-- Create a comprehensive SELECT policy that allows access to events
CREATE POLICY "Allow event access" ON events
FOR SELECT
TO public  -- Allow both authenticated and anonymous users
USING (
  -- Allow access to approved events for everyone
  status = 'approved'
  OR
  -- Allow authenticated users to see their own hosted events (any status)
  (auth.uid() IS NOT NULL AND auth.uid() = host_id)
  OR
  -- Allow authenticated users to see events they're participating in
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM event_participants ep 
    WHERE ep.event_id = events.id 
    AND ep.user_id = auth.uid() 
    AND ep.status = 'joined'
  ))
);

-- Recreate other necessary policies
CREATE POLICY "Allow authenticated users to create events" ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Allow hosts to update own events" ON events
FOR UPDATE
TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Allow hosts to delete own events" ON events
FOR DELETE
TO authenticated
USING (auth.uid() = host_id);

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;
