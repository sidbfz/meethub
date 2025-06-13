# Fix RLS Policies and Error Handling

## 🚨 **Current Issue**
- Database error: {} (empty error object)
- RLS policies applied to wrong roles
- INSERT policy should be for `authenticated` users, not `public`

## 📋 **Correct RLS Policies for Events Table**

Run these SQL commands in your Supabase SQL Editor:

### 1. Drop existing incorrect policies
```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public to read approved events" ON events;
DROP POLICY IF EXISTS "Hosts can insert pending events" ON events;
DROP POLICY IF EXISTS "Hosts can update their own events" ON events;
```

### 2. Create correct RLS policies
```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow everyone (including public) to read approved events
CREATE POLICY "Allow everyone to read events" ON events
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to create events (they become the host)
CREATE POLICY "Allow authenticated users to create events" ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

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

## 🔧 **Policy Explanation**

### **SELECT Policy** - `public`
- **Who**: Everyone (public)
- **What**: Can read all events
- **Why**: Public events should be visible to everyone

### **INSERT Policy** - `authenticated`
- **Who**: Authenticated users only
- **What**: Can create events where they are the host
- **Check**: `auth.uid() = host_id`

### **UPDATE Policy** - `authenticated`
- **Who**: Authenticated users only
- **What**: Can update events they host
- **Check**: `auth.uid() = host_id`

### **DELETE Policy** - `authenticated`
- **Who**: Authenticated users only
- **What**: Can delete events they host
- **Check**: `auth.uid() = host_id`

## 🐛 **Fix Error Handling**

The current error handling logs an empty object. This is likely because the error structure is being logged incorrectly.

## ✅ **Expected Result**

After applying these policies:
- ✅ Public users can view approved events
- ✅ Authenticated users can create events (they become the host)
- ✅ Hosts can update/delete their own events
- ✅ Proper error messages will be displayed
- ✅ No more RLS policy violations

## 🧪 **Testing Steps**

1. Apply the SQL policies above
2. Try creating an event while logged in
3. Verify the event is created with `status: 'pending'`
4. Check that proper error messages appear if something fails

## 🔍 **Debug Tips**

If you still get errors:
1. Check Supabase logs in Dashboard > Logs
2. Verify user is authenticated: `console.log(refreshedSession?.user)`
3. Check RLS policies are active: `SHOW rls` in SQL editor
4. Verify table permissions in Supabase dashboard
