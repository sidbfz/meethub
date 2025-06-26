-- Minimal RLS fix for moderator approve/reject functionality
-- This focuses only on the essential policies needed

-- First check what policies exist
SELECT 'Current policies:' as info;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY tablename, policyname;

-- Drop and recreate only the moderator update policy
DROP POLICY IF EXISTS "moderator_update_all_events" ON events;
DROP POLICY IF EXISTS "moderator_update_events" ON events;
DROP POLICY IF EXISTS "Moderators can update all events" ON events;

-- Create the essential moderator update policy
CREATE POLICY "moderator_can_update_events" ON events
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'moderator'
        )
    );

-- Ensure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Grant UPDATE permission to authenticated users
GRANT UPDATE ON events TO authenticated;

-- Verify the policy was created
SELECT 'Policy created successfully:' as result;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'events' 
AND policyname = 'moderator_can_update_events';
