# Supabase Edge Function Auto-Conclude Setup

## Step 1: Set up the Database Function

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Copy the content from `supabase-auto-conclude-setup.sql` and run it
3. This creates the `auto_conclude_past_events()` function

## Step 2: Create the Edge Function

### Install Supabase CLI
```bash
npm install -g supabase
```

### Initialize Supabase (if not done)
```bash
supabase login
supabase init
```

### Create the Edge Function
```bash
supabase functions new auto-conclude-events
```

### Replace the Function Code
1. Navigate to `supabase/functions/auto-conclude-events/index.ts`
2. Replace the content with the code from `supabase-edge-function-auto-conclude.ts`

### Deploy the Function
```bash
supabase functions deploy auto-conclude-events
```

## Step 3: Set up Automation (Choose One)

### Option A: GitHub Actions (Recommended)
Create `.github/workflows/auto-conclude.yml`:

```yaml
name: Auto Conclude Events

on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
  workflow_dispatch:       # Manual trigger

jobs:
  auto-conclude:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.SUPABASE_URL }}/functions/v1/auto-conclude-events"
```

**Required GitHub Secrets:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### Option B: External Cron Service

**Using cron-job.org or easycron.com:**
1. Create new HTTP cron job
2. URL: `https://YOUR_PROJECT.supabase.co/functions/v1/auto-conclude-events`
3. Method: POST
4. Headers: `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
5. Schedule: Every 2 hours (`0 */2 * * *`)

### Option C: From Your Next.js App

Create an API route that calls the edge function:

```typescript
// app/api/cron/conclude-events/route.ts
export async function POST() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-conclude-events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  return Response.json(data);
}
```

Then use Vercel Cron Jobs in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/conclude-events",
    "schedule": "0 */2 * * *"
  }]
}
```

## Step 4: Test the Setup

### Test Database Function
In Supabase SQL Editor:
```sql
SELECT auto_conclude_past_events();
```

### Test Edge Function
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  "https://YOUR_PROJECT.supabase.co/functions/v1/auto-conclude-events"
```

### Manual Trigger from App
Create a button in your admin panel:
```typescript
const handleConcludeEvents = async () => {
  const response = await fetch('/api/cron/conclude-events', {
    method: 'POST'
  });
  const result = await response.json();
  console.log('Concluded events:', result);
};
```

## Step 5: Monitor

- Check Supabase Functions logs for execution
- Monitor your automation service (GitHub Actions, cron service)
- Add alerts for failures

## Troubleshooting

- Ensure your service role key has proper permissions
- Check function logs in Supabase Dashboard
- Verify the cron schedule syntax
- Test the function manually first

## Function Response Format

Success:
```json
{
  "success": true,
  "updated_count": 3,
  "updated_events": [...],
  "timestamp": "2025-06-14T10:00:00Z"
}
```

Error:
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-06-14T10:00:00Z"
}
```
