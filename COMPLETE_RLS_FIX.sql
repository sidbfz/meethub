-- Comprehensive RLS fix for moderator system
-- This addresses all permission issues

-- First, let's see what we have
SELECT 'Current RLS policies for events:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'events';

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view approved events" ON events;
DROP POLICY IF EXISTS "view_approved_events" ON events;
DROP POLICY IF EXISTS "Host can view their own events" ON events;
DROP POLICY IF EXISTS "host_view_own_events" ON events;
DROP POLICY IF EXISTS "Moderators can view all events" ON events;
DROP POLICY IF EXISTS "moderator_view_all_events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "host_create_events" ON events;
DROP POLICY IF EXISTS "Host can update their own events" ON events;
DROP POLICY IF EXISTS "host_update_own_events" ON events;
DROP POLICY IF EXISTS "Moderators can update all events" ON events;
DROP POLICY IF EXISTS "moderator_update_all_events" ON events;
DROP POLICY IF EXISTS "moderator_can_update_events" ON events;
DROP POLICY IF EXISTS "Moderators can delete events" ON events;
DROP POLICY IF EXISTS "moderator_delete_events" ON events;

-- Create simple, comprehensive policies

-- 1. SELECT policies
CREATE POLICY "public_select_approved" ON events
    FOR SELECT 
    USING (status = 'approved');

CREATE POLICY "host_select_own" ON events
    FOR SELECT 
    USING (auth.uid() = host_id);

CREATE POLICY "moderator_select_all" ON events
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'moderator'
        )
    );

-- 2. INSERT policy (for creating events)
CREATE POLICY "authenticated_insert" ON events
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. UPDATE policy (key for moderator approve/reject)
CREATE POLICY "host_update_own" ON events
    FOR UPDATE 
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY "moderator_update_all" ON events
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

-- 4. DELETE policy (for moderators)
CREATE POLICY "moderator_delete_all" ON events
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'moderator'
        )
    );

-- Ensure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Also ensure users table policies are correct
DROP POLICY IF EXISTS "view_user_profiles" ON users;
DROP POLICY IF EXISTS "update_own_profile" ON users;
DROP POLICY IF EXISTS "insert_own_profile" ON users;

CREATE POLICY "users_select_all" ON users
    FOR SELECT 
    USING (true);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Verify policies were created
SELECT 'New policies created:' as result;
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('events', 'users')
ORDER BY tablename, cmd, policyname;
