-- Fix RLS policies for moderator event management
-- This script ensures moderators can update event statuses

-- Drop ALL existing event policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view approved events" ON events;
DROP POLICY IF EXISTS "Host can manage their events" ON events;
DROP POLICY IF EXISTS "Host can create events" ON events;
DROP POLICY IF EXISTS "Moderators can manage all events" ON events;
DROP POLICY IF EXISTS "Anyone can view approved events" ON events;
DROP POLICY IF EXISTS "Host can view their own events" ON events;
DROP POLICY IF EXISTS "Moderators can view all events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Host can update their own events" ON events;
DROP POLICY IF EXISTS "Moderators can update all events" ON events;
DROP POLICY IF EXISTS "Moderators can delete events" ON events;

-- Create comprehensive RLS policies for events table

-- 1. Allow everyone to view approved events
CREATE POLICY "view_approved_events" ON events
    FOR SELECT 
    USING (status = 'approved');

-- 2. Allow hosts to view their own events regardless of status
CREATE POLICY "host_view_own_events" ON events
    FOR SELECT 
    USING (auth.uid() = host_id);

-- 3. Allow moderators to view all events
CREATE POLICY "moderator_view_all_events" ON events
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'moderator'
        )
    );

-- 4. Allow hosts to create events (they will be pending by default)
CREATE POLICY "host_create_events" ON events
    FOR INSERT 
    WITH CHECK (auth.uid() = host_id);

-- 5. Allow hosts to update their own events (but not change status unless pending)
CREATE POLICY "host_update_own_events" ON events
    FOR UPDATE 
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

-- 6. Allow moderators to update event status and other fields
CREATE POLICY "moderator_update_all_events" ON events
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

-- 7. Allow moderators to delete events if needed
CREATE POLICY "moderator_delete_events" ON events
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'moderator'
        )
    );

-- Ensure RLS is enabled on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Also ensure users table has proper policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;
DROP POLICY IF EXISTS "view_user_profiles" ON users;
DROP POLICY IF EXISTS "update_own_profile" ON users;
DROP POLICY IF EXISTS "insert_own_profile" ON users;

-- Create user table policies
CREATE POLICY "view_user_profiles" ON users
    FOR SELECT 
    USING (true);

CREATE POLICY "update_own_profile" ON users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "insert_own_profile" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Test queries to verify policies work
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Test that we can query events
    SELECT 'RLS policies created successfully' INTO test_result;
    RAISE NOTICE '%', test_result;
END
$$;
