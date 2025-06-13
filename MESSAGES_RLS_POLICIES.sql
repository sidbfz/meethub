-- RLS Policies for Messages Table
-- Run this in your Supabase SQL Editor

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read messages from events they participate in" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to events they participate in" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Policy 1: Users can read messages from events they participate in OR host
CREATE POLICY "Users can read event messages" ON messages
FOR SELECT
TO authenticated
USING (
  -- User is the host of the event
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = messages.event_id 
    AND events.host_id = auth.uid()
  )
  OR
  -- User is a participant of the event
  EXISTS (
    SELECT 1 FROM event_participants ep
    JOIN events e ON e.id = ep.event_id
    WHERE ep.event_id = messages.event_id 
    AND ep.user_id = auth.uid()
    AND e.status = 'approved'
  )
);

-- Policy 2: Users can insert messages to events they participate in OR host
CREATE POLICY "Users can send messages to events" ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the one sending the message
  auth.uid() = user_id
  AND
  (
    -- User is the host of the event
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = messages.event_id 
      AND events.host_id = auth.uid()
    )
    OR
    -- User is a participant of the event
    EXISTS (
      SELECT 1 FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      WHERE ep.event_id = messages.event_id 
      AND ep.user_id = auth.uid()
      AND e.status = 'approved'
    )
  )
);

-- Policy 3: Users can update their own messages (optional - for editing)
CREATE POLICY "Users can update own messages" ON messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own messages (optional)
CREATE POLICY "Users can delete own messages" ON messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_event_id ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Make sure the messages table has the correct structure
-- (This should already exist, but just in case)
/*
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/
