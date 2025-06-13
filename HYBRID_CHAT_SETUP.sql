-- =============================================================================
-- HYBRID CHAT SETUP: Complete SQL Setup for Persistent + Real-time Chat
-- =============================================================================
-- This setup combines database persistence with real-time features
-- Always loads from database + uses broadcast for immediate updates
-- =============================================================================

-- 1. UPDATE EXISTING MESSAGES TABLE WITH SOFT DELETE SUPPORT
-- ===========================================================

-- Your messages table already exists with: id, event_id, user_id, content, created_at
-- We need to add soft delete columns for the hybrid chat system

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add is_deleted column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'is_deleted') THEN
        ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_deleted column to messages table';
    END IF;
    
    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'deleted_at') THEN
        ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE 'Added deleted_at column to messages table';
    END IF;
    
    -- Add deleted_by column if it doesn't exist (references users table, not auth.users)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'deleted_by') THEN
        ALTER TABLE messages ADD COLUMN deleted_by UUID REFERENCES users(id);
        RAISE NOTICE 'Added deleted_by column to messages table';
    END IF;
    
    -- Add content length constraint if it doesn't exist
    BEGIN
        ALTER TABLE messages ADD CONSTRAINT messages_content_length_check 
        CHECK (length(content) > 0 AND length(content) <= 1000);
        RAISE NOTICE 'Added content length constraint';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Content length constraint already exists';
    END;
    
    -- Add foreign key constraints if they don't exist
    BEGIN
        -- Check if event_id foreign key exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'messages' AND constraint_name LIKE '%event_id%' AND constraint_type = 'FOREIGN KEY') THEN
            ALTER TABLE messages ADD CONSTRAINT messages_event_id_fkey 
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added event_id foreign key constraint';
        END IF;
        
        -- Check if user_id foreign key exists  
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'messages' AND constraint_name LIKE '%user_id%' AND constraint_type = 'FOREIGN KEY') THEN
            ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added user_id foreign key constraint';
        END IF;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Foreign key constraints may already exist or tables may have different structure';
    END;
END $$;

-- 2. CREATE OPTIMIZED INDEXES FOR FAST QUERIES
-- =============================================

-- Main query index: event_id + created_at (for loading messages)
CREATE INDEX IF NOT EXISTS idx_messages_event_created 
ON messages(event_id, created_at);

-- User messages index: user_id + created_at
CREATE INDEX IF NOT EXISTS idx_messages_user_created 
ON messages(user_id, created_at);

-- Soft delete index: is_deleted + event_id
CREATE INDEX IF NOT EXISTS idx_messages_deleted_event 
ON messages(is_deleted, event_id) WHERE is_deleted = true;

-- Composite index for chat queries: event_id + is_deleted + created_at
CREATE INDEX IF NOT EXISTS idx_messages_event_active_created 
ON messages(event_id, is_deleted, created_at);

-- 3. CREATE SECURE RLS POLICIES
-- =============================

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages for events they participate in" ON messages;
DROP POLICY IF EXISTS "Users can send messages to events they participate in" ON messages;
DROP POLICY IF EXISTS "Users can soft delete their own messages" ON messages;
DROP POLICY IF EXISTS "Hosts can soft delete any message in their events" ON messages;

-- Policy 1: SELECT - Users can view messages for events they participate in OR host
CREATE POLICY "message_select_policy" ON messages
FOR SELECT
USING (
    -- User is a participant in the event (auth.uid() matches user_id in participants)
    EXISTS (
        SELECT 1 FROM event_participants ep 
        WHERE ep.event_id = messages.event_id 
        AND ep.user_id = auth.uid()
    )
    OR
    -- User is the host of the event (auth.uid() matches host_id in events)
    EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = messages.event_id 
        AND e.host_id = auth.uid()
    )
);

-- Policy 2: INSERT - Users can send messages to events they participate in OR host
CREATE POLICY "message_insert_policy" ON messages
FOR INSERT
WITH CHECK (
    -- User is authenticated
    auth.uid() IS NOT NULL
    AND
    -- User is inserting their own message (auth.uid() matches user_id)
    messages.user_id = auth.uid()
    AND
    -- User is a participant in the event OR host
    (
        EXISTS (
            SELECT 1 FROM event_participants ep 
            WHERE ep.event_id = messages.event_id 
            AND ep.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = messages.event_id 
            AND e.host_id = auth.uid()
        )
    )
);

-- Policy 3: UPDATE - Users can soft delete their own messages
CREATE POLICY "message_update_own_policy" ON messages
FOR UPDATE
USING (
    -- User owns the message
    messages.user_id = auth.uid()
    AND
    -- User is still a participant or host
    (
        EXISTS (
            SELECT 1 FROM event_participants ep 
            WHERE ep.event_id = messages.event_id 
            AND ep.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = messages.event_id 
            AND e.host_id = auth.uid()
        )
    )
)
WITH CHECK (
    -- Only allow soft delete operations (set is_deleted = true)
    messages.is_deleted = true
    AND messages.deleted_at IS NOT NULL
    AND messages.deleted_by = auth.uid()
);

-- Policy 4: UPDATE - Hosts can soft delete any message in their events
CREATE POLICY "message_update_host_policy" ON messages
FOR UPDATE
USING (
    -- User is the host of the event
    EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = messages.event_id 
        AND e.host_id = auth.uid()
    )
)
WITH CHECK (
    -- Only allow soft delete operations
    messages.is_deleted = true
    AND messages.deleted_at IS NOT NULL
    AND messages.deleted_by = auth.uid()
);

-- 4. CREATE FUNCTIONS FOR SOFT DELETE
-- ===================================

-- Function to soft delete a message
CREATE OR REPLACE FUNCTION soft_delete_message(message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the message to mark it as deleted
    UPDATE messages 
    SET 
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE id = message_id
    AND (
        -- User owns the message
        user_id = auth.uid()
        OR
        -- User is the host of the event
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = messages.event_id 
            AND e.host_id = auth.uid()
        )
    );
    
    -- Return true if a row was updated
    RETURN FOUND;
END;
$$;

-- 5. ENABLE REALTIME FOR HYBRID APPROACH
-- ======================================

-- Enable realtime on messages table for postgres_changes (fallback)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 6. GRANT NECESSARY PERMISSIONS
-- ==============================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_message(UUID) TO authenticated;

-- 7. CREATE UTILITY VIEWS (OPTIONAL)
-- ==================================

-- View for active (non-deleted) messages with user info
CREATE OR REPLACE VIEW active_messages AS
SELECT 
    m.id,
    m.event_id,
    m.user_id,
    m.content,
    m.created_at,
    u.email,
    u.full_name,
    u.avatar_url,
    -- Check if user is the host
    CASE WHEN e.host_id = m.user_id THEN true ELSE false END as is_host
FROM messages m
JOIN users u ON m.user_id = u.id
JOIN events e ON m.event_id = e.id
WHERE m.is_deleted = false
ORDER BY m.created_at ASC;

-- Grant select on the view
GRANT SELECT ON active_messages TO authenticated;

-- 8. VERIFICATION QUERIES
-- =======================

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'messages';

-- Verify RLS policies
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'messages';

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================
-- 
-- Your hybrid chat system is now ready with:
-- ✅ Persistent message storage in database
-- ✅ Real-time updates via broadcast + postgres_changes fallback
-- ✅ Secure RLS policies for access control
-- ✅ Soft delete functionality
-- ✅ Optimized indexes for fast queries
-- ✅ Host indicators and participant-only access
-- ✅ Automatic timestamp management
-- 
-- The chat component will:
-- 1. Always load messages from database on open
-- 2. Use broadcast for immediate real-time updates
-- 3. Fall back to postgres_changes if broadcast fails
-- 4. Periodically refresh from database as safety net
-- 
-- This ensures users ALWAYS see all messages, even if sent before they
-- opened the chat, while maintaining real-time responsiveness.
-- =============================================================================
