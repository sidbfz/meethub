-- Drop existing table and related objects if they exist, for a clean setup
DROP TABLE IF EXISTS public.messages CASCADE;

-- Create the messages table
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID, -- Made nullable to match your schema, though NOT NULL is recommended if every message MUST belong to an event
    user_id UUID, -- Made nullable to match your schema, though NOT NULL is recommended
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
    is_deleted BOOLEAN DEFAULT false NOT NULL, -- New field for soft delete
    deleted_at TIMESTAMPTZ, -- Optional: track when message was deleted
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL, -- Changed to TIMESTAMPTZ to be more standard, your schema showed timestamp without time zone
    CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE -- Changed to public.users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_event_id ON public.messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted); -- Index for filtering deleted messages

-- Enable Realtime for the messages table
-- In Supabase Studio, ensure "Enable Realtime" is checked for this table.
-- Or run: ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Secure the table with Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages table

-- Policy: Allow authenticated users to read messages for events they are participating in or hosting.
DROP POLICY IF EXISTS "Allow read access to event participants and host" ON public.messages;
CREATE POLICY "Allow read access to event participants and host"
ON public.messages
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  (
    -- User is the host of the event
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = messages.event_id AND e.host_id = auth.uid()
    )
    OR
    -- User is a participant in the event
    EXISTS (
      SELECT 1
      FROM public.event_participants ep
      WHERE ep.event_id = messages.event_id AND ep.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Allow insert access to event participants and host" ON public.messages;
CREATE POLICY "Allow insert access to event participants and host"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  messages.user_id = auth.uid() AND -- User can only insert messages as themselves
  (
    -- User is the host of the event
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = messages.event_id AND e.host_id = auth.uid()
    )
    OR
    -- User is a participant in the event
    EXISTS (
      SELECT 1
      FROM public.event_participants ep
      WHERE ep.event_id = messages.event_id AND ep.user_id = auth.uid()
    )
  )
);

-- Policy: Allow users to delete their own messages (soft delete by updating is_deleted = true).
DROP POLICY IF EXISTS "Allow users to delete their own messages" ON public.messages;
CREATE POLICY "Allow users to delete their own messages"
ON public.messages
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  messages.user_id = auth.uid()
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  messages.user_id = auth.uid()
);

-- Remove the old DELETE policies since we're using soft delete now
DROP POLICY IF EXISTS "Allow delete notifications for event participants" ON public.messages;

-- Ensure the 'authenticated' role has necessary privileges on referenced tables
-- for the EXISTS checks in RLS policies to function correctly.
-- e.g., GRANT SELECT ON public.events TO authenticated;
-- GRANT SELECT ON public.users TO authenticated; -- Changed from public.profiles
-- GRANT SELECT ON public.event_participants TO authenticated;

-- Notes on your schema vs. this script:
-- 1. Your 'messages' table had event_id and user_id as nullable. This script keeps them nullable
--    but it's generally recommended they be NOT NULL if a message must always have an event/user.
-- 2. Your 'messages.created_at' was 'timestamp without time zone'. This script uses TIMESTAMPTZ
--    which is generally preferred for storing timestamps.
-- 3. The foreign key for user_id now correctly points to 'public.users(id)'.

-- After running this SQL in your Supabase project, the 'messages' table RLS policies
-- will be updated to correctly reference your 'users' table.
