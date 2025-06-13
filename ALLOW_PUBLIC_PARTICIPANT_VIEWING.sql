-- Update Users RLS Policy to Allow Public Viewing of Event Participants
-- This allows anyone to see participant profiles for approved events

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow access to relevant user profiles for events" ON public.users;

-- Create a new, more open policy that allows viewing participant profiles
CREATE POLICY "Allow viewing participant profiles for public events" ON public.users
FOR SELECT
TO public  -- Changed from 'authenticated' to 'public' to allow unauthenticated users too
USING (
  -- 1. Users can always see their own profile (if authenticated)
  (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR
  -- 2. Anyone can see profiles of users who are participants in approved events
  EXISTS (
    SELECT 1
    FROM public.event_participants ep
    JOIN public.events e ON ep.event_id = e.id
    WHERE ep.user_id = users.id
    AND ep.status = 'joined'
    AND e.status = 'approved'  -- Only for approved/public events
  )
  OR
  -- 3. Anyone can see profiles of hosts of approved events
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.host_id = users.id
    AND e.status = 'approved'  -- Only for approved/public events
  )
);

-- Verify the new policy
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
AND policyname = 'Allow viewing participant profiles for public events';
