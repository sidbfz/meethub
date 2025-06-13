# Supabase Setup Instructions

## 🚀 Complete Setup Guide for MeetHub

### 1. Storage Bucket Setup

1. Go to your **Supabase Dashboard** → **Storage**
2. Click **"Create Bucket"**
3. Enter bucket name: `events`
4. Set as **Public bucket** ✅
5. Configure these settings:
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/gif, image/webp`

### 2. Storage Policies (RLS)

In **Storage** → **Policies**, create these policies for the `events` bucket:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'events');
```

#### Policy 2: Allow public read access
```sql
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'events');
```

#### Policy 3: Allow users to delete their own files
```sql
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'events' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Database Tables

#### Events Table
```sql
CREATE TABLE events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  location text NOT NULL,
  date_time timestamp with time zone NOT NULL,
  max_participants integer NOT NULL,
  image_url text,
  host_id uuid REFERENCES auth.users(id) NOT NULL,
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### Users Table (if not exists from auth setup)
```sql
CREATE TABLE users (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### Event Participants Table
```sql
CREATE TABLE event_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'joined' CHECK (status IN ('joined', 'left')),
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

### 4. Row Level Security (RLS) Policies

#### Events Table Policies
```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create events
CREATE POLICY "Allow authenticated users to create events" ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

-- Allow everyone to read events
CREATE POLICY "Allow everyone to read events" ON events
FOR SELECT
TO public
USING (true);

-- Allow hosts to update their own events
CREATE POLICY "Allow hosts to update own events" ON events
FOR UPDATE
TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

-- Allow hosts to delete their own events
CREATE POLICY "Allow hosts to delete own events" ON events
FOR DELETE
TO authenticated
USING (auth.uid() = host_id);
```

#### Users Table Policies
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Allow users to read own data" ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to insert their own data
CREATE POLICY "Allow users to insert own data" ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Allow users to update own data" ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow public read access for user profiles (for event hosts, participants)
CREATE POLICY "Allow public read access for profiles" ON users
FOR SELECT
TO public
USING (true);
```

#### Event Participants Table Policies
```sql
-- Enable RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to join events
CREATE POLICY "Allow authenticated users to join events" ON event_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to leave events they joined
CREATE POLICY "Allow users to leave events" ON event_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow public read access to see event participants
CREATE POLICY "Allow public read access to participants" ON event_participants
FOR SELECT
TO public
USING (true);
```

#### Messages Table Policies
```sql
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow event participants to send messages
CREATE POLICY "Allow participants to send messages" ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_id = messages.event_id 
    AND user_id = auth.uid() 
    AND status = 'joined'
  )
);

-- Allow event participants and hosts to read messages
CREATE POLICY "Allow participants and hosts to read messages" ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_id = messages.event_id 
    AND user_id = auth.uid() 
    AND status = 'joined'
  ) OR
  EXISTS (
    SELECT 1 FROM events 
    WHERE id = messages.event_id 
    AND host_id = auth.uid()
  )
);
```

### 5. Test Your Setup

After completing the above steps, run:

```bash
node scripts/setup-supabase.js
```

You should see:
- ✅ Events bucket already exists
- ✅ Events table is accessible  
- ✅ Users table is accessible

### 6. Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 🎉 You're Ready!

Once all steps are completed, your MeetHub app will support:
- ✅ User authentication with email verification
- ✅ Event creation with image upload
- ✅ Event discovery with infinite scroll and filtering
- ✅ Join/Leave event functionality
- ✅ Event detail pages with participant lists
- ✅ Real-time chat for event participants
- ✅ Host controls (edit/cancel events)
- ✅ Image storage in Supabase
- ✅ Proper security with RLS policies
- ✅ Toast notifications
- ✅ Date formatting with date-fns
- ✅ Responsive design with Tailwind CSS
