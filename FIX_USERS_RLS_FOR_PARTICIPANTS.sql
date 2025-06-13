-- SQL Script to Fix RLS Policies for Users Table
-- Goal: Allow event participants and hosts to see each other's relevant profile information.

-- Ensure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies on the users table to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can read basic info of others" ON public.users;
-- Also drop any other potentially conflicting SELECT policies you might have added for testing
DROP POLICY IF EXISTS "Event participants can view each other" ON public.users; -- If created from previous attempts


-- Create a new comprehensive SELECT policy for the 'users' table
CREATE POLICY "Allow access to relevant user profiles for events" ON public.users
FOR SELECT
TO authenticated
USING (
  -- 1. Users can always see their own profile
  auth.uid() = id
  OR
  -- 2. Users can see profiles of other participants in events they are also 'joined' in
  EXISTS (
    SELECT 1
    FROM public.event_participants ep1
    JOIN public.event_participants ep2 ON ep1.event_id = ep2.event_id
    WHERE ep1.user_id = auth.uid()  -- The current authenticated user is a participant
    AND ep1.status = 'joined'
    AND ep2.user_id = users.id      -- The profile being accessed belongs to another participant
    AND ep2.status = 'joined'
  )
  OR
  -- 3. Hosts can see profiles of participants in events they host
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.event_participants ep ON e.id = ep.event_id
    WHERE e.host_id = auth.uid()    -- The current authenticated user is the host
    AND ep.user_id = users.id       -- The profile being accessed belongs to a participant
    AND ep.status = 'joined'
  )
  OR
  -- 4. Participants can see the profile of the host of events they are 'joined' in
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.event_participants ep ON e.id = ep.event_id
    WHERE ep.user_id = auth.uid()   -- The current authenticated user is a participant
    AND ep.status = 'joined'
    AND e.host_id = users.id        -- The profile being accessed belongs to the host
  )
);

-- Verify the policies on the users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Reminder: The INSERT, UPDATE, DELETE policies you had seem fine:
-- ("Allow insert for authenticated users" TO authenticated WITH CHECK (true) or similar)
-- ("Allow users to update their own profile" TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id))
-- ("Allow users to delete their own profile" TO authenticated USING (auth.uid() = id))
-- Ensure these are also in place and correctly configured if you dropped all policies at some point.
