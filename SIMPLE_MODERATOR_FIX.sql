-- Simple RLS fix for moderator functionality
-- Run this if the full script has conflicts

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('events', 'users')
ORDER BY tablename, policyname;

-- Add the essential moderator policy for updating events
-- This is the key policy needed for approve/reject functionality

DROP POLICY IF EXISTS "moderator_update_events" ON events;

CREATE POLICY "moderator_update_events" ON events
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'moderator'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'moderator'
        )
    );

-- Ensure the events table has RLS enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT UPDATE ON events TO authenticated;

-- Test the policy
SELECT 'Moderator update policy created successfully' as result;
