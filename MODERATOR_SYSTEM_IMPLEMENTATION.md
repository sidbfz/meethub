# Moderator System Implementation

## Overview
The MeetHub moderator system allows designated users to review and approve/reject events before they go live. This ensures quality control and content moderation.

## Database Changes Made

### 1. Users Table Updates
- Added role constraint: `role IN ('user', 'moderator')`
- Default role remains 'user'

### 2. Chat Messages Table (New)
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);
```

### 3. Row Level Security (RLS) Policies
- **Chat Messages**: Users can only see messages they sent/received, hosts can see event-related messages, moderators can see all
- **Events**: Moderators can view and moderate all events
- **Users**: Public read access maintained

## Frontend Implementation

### 1. Components Added
- `ModeratorDashboard.tsx` - Main dashboard for moderators
- `useModeratorData.ts` - Custom hook for moderator data management

### 2. Pages Added
- `/moderator` - Protected moderator dashboard page

### 3. Navigation Updates
- Added moderator link to GlobalHeader (only visible to moderators)
- Added Shield icon for moderator identification
- Mobile menu includes moderator dashboard link

### 4. API Routes Added
- `POST /api/moderator/events` - Approve/reject events

## Event Status Flow

1. **Event Creation**: New events start with status `'pending_approval'`
2. **Moderator Review**: Moderators can see all pending events in dashboard
3. **Approval**: Status changes to `'approved'` → event becomes visible to public
4. **Rejection**: Status changes to `'rejected'` → event hidden from public

## Features

### Moderator Dashboard
- **Statistics Cards**: Shows counts of pending, approved, rejected, and total events
- **Pending Events List**: Displays all events awaiting approval with:
  - Event details (title, date, location, description)
  - Host information
  - Event image
  - Approve/Reject buttons
- **Real-time Updates**: Dashboard updates immediately after actions
- **Responsive Design**: Works on desktop and mobile

### Access Control
- Only users with `role = 'moderator'` can access `/moderator`
- Automatic redirect for unauthorized users
- Server-side protection on the moderator page

## Setup Instructions

### 1. Create a Moderator User
```sql
-- First, ensure the user exists in your system through normal signup
-- Then update their role:
UPDATE users 
SET role = 'moderator' 
WHERE email = 'moderator@example.com';
```

### 2. Test the System
```bash
# Run the test script
node test-moderator-system.js
```

### 3. Create Test Events
- Sign up as a regular user
- Create some events (they will be pending_approval)
- Login as moderator and visit `/moderator`
- Test approving/rejecting events

## Security Features

- **Server-side Protection**: Moderator page checks user role on server
- **API Protection**: Moderator API routes verify user role
- **RLS Policies**: Database-level security for all operations
- **Client-side Guards**: UI elements only shown to authorized users

## Usage

1. **For Moderators:**
   - Visit `/moderator` to access the dashboard
   - Review pending events in the list
   - Click "View" to see full event details
   - Use "Approve" or "Reject" buttons to moderate events
   - Use "Refresh" button to update the dashboard

2. **For Event Hosts:**
   - Create events normally - they will be pending approval
   - Receive notification once event is approved/rejected (future feature)
   - Can edit events while pending (existing functionality)

3. **For Regular Users:**
   - Only see approved events in the main feed
   - Cannot access moderator dashboard
   - Normal event participation continues unchanged

## Future Enhancements

- [ ] Email notifications for approval/rejection
- [ ] Moderator notes/comments on events
- [ ] Bulk approval/rejection actions
- [ ] Moderator activity logs
- [ ] Advanced filtering and search in moderator dashboard
- [ ] Event reporting system for users
- [ ] Chat system between hosts and moderators

## Troubleshooting

### Common Issues

1. **"Access Denied" on /moderator page**
   - Ensure user has `role = 'moderator'` in database
   - Check that user is properly authenticated

2. **Events not showing as pending**
   - Verify `status = 'pending_approval'` in CreateEventForm
   - Check RLS policies are properly applied

3. **Approve/Reject not working**
   - Check browser console for API errors
   - Verify moderator API route is accessible
   - Ensure user has moderator role

### Testing Queries

```sql
-- Check moderator users
SELECT id, full_name, email, role FROM users WHERE role = 'moderator';

-- Check pending events
SELECT id, title, status, created_at FROM events WHERE status = 'pending_approval';

-- Check event status distribution
SELECT status, COUNT(*) FROM events GROUP BY status;
```

## File Changes Summary

### New Files
- `src/app/moderator/page.tsx`
- `src/components/ModeratorDashboard.tsx`
- `src/lib/hooks/useModeratorData.ts`
- `src/app/api/moderator/events/route.ts`
- `test-moderator-system.js`

### Modified Files
- `src/components/GlobalHeader.tsx` - Added moderator navigation
- `src/components/CreateEventForm.tsx` - Changed status to 'pending_approval'

The moderator system is now fully functional and ready for use!
