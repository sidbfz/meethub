-- Setup for Database-based Chat with Postgres Changes
-- Run this in your Supabase SQL Editor

-- 1. Enable realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 2. The messages table should already exist with these columns:
-- CREATE TABLE messages (
--   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
--   event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
--   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   content text NOT NULL,
--   created_at timestamp without time zone DEFAULT now()
-- );

-- 3. RLS is already enabled with your existing policies:
-- - Allow delete for message owners
-- - Allow insert for authenticated users  
-- - Allow realtime for authenticated users
-- - Allow update for message owners
-- - Users can post messages in joined events (public role)
-- - Users can read messages for joined events (public role)

-- 4. Create a profiles table if it doesn't exist (for user info)
-- CREATE TABLE profiles (
--   id uuid REFERENCES auth.users(id) PRIMARY KEY,
--   full_name text,
--   email text,
--   avatar_url text,
--   created_at timestamp without time zone DEFAULT now()
-- );

-- 5. Enable RLS on profiles if needed
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create profile policies if needed
-- CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- That's it! Your chat should now work with:
-- ✅ Real-time updates via Postgres Changes
-- ✅ Message persistence in database
-- ✅ Proper RLS security
-- ✅ User profile integration