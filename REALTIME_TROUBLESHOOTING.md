# Supabase Realtime Setup Instructions

## Current Issue: Channel Subscription Error

The error indicates that Realtime authorization is failing. This can happen for several reasons:

### 1. Realtime Not Enabled
- Go to your Supabase Dashboard
- Navigate to Settings > API
- Make sure Realtime is enabled

### 2. Authorization Issues
Realtime uses RLS policies on the `realtime.messages` table. You have two options:

#### Option A: Public Channels (Recommended for simple chat)
```sql
-- Allow anyone to read broadcast messages (no authentication required)
CREATE POLICY "Enable read access for all users" ON "realtime"."messages"
FOR SELECT USING (true);

-- Allow anyone to send broadcast messages (no authentication required)  
CREATE POLICY "Enable insert access for all users" ON "realtime"."messages"
FOR INSERT WITH CHECK (true);
```

#### Option B: Authenticated Channels (More secure)
```sql
-- Allow authenticated users to read broadcast messages
CREATE POLICY "authenticated can read broadcast" ON "realtime"."messages"
FOR SELECT TO authenticated USING (
  extension = 'broadcast'
);

-- Allow authenticated users to send broadcast messages
CREATE POLICY "authenticated can send broadcast" ON "realtime"."messages"
FOR INSERT TO authenticated WITH CHECK (
  extension = 'broadcast'
);
```

### 3. Alternative: Simple In-Memory Chat
If Realtime continues to fail, we can implement a simple polling-based chat or use a different approach.

## Testing Steps:

1. **Check Realtime Status**: Go to Supabase Dashboard > Settings > API
2. **Enable Realtime**: If disabled, enable it
3. **Run SQL Policies**: Execute one of the policy sets above
4. **Test Connection**: The chat should work after applying policies

## Troubleshooting:

- Check browser console for detailed error messages
- Verify environment variables are correct
- Ensure Supabase project has Realtime enabled
- Check if you're on the free tier (has limitations)
