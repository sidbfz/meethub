# Complete Event Management with Image Deletion - Implementation Guide

## 🎯 **Problem Statement**
1. **RLS Security**: Pending events were accessible to anyone with direct links
2. **Image Deletion**: Event images weren't being deleted from Supabase storage when events were deleted
3. **Missing Delete Functionality**: No way for hosts to permanently delete events
4. **Storage Policies**: Incorrect storage RLS policies preventing image deletion

## ✅ **Complete Solution Overview**

### **1. Secure RLS Policies for Events Table**
- ✅ Public can only read **approved events**
- ✅ Hosts can read **all their own events** (approved, pending, cancelled)
- ✅ Hosts can create, update, and delete **their own events only**
- ❌ Non-hosts **cannot access pending events** via direct links

### **2. Storage RLS Policies for Event Images**
- ✅ Authenticated users can **upload images**
- ✅ Public can **view images** (for display purposes)
- ✅ Authenticated users can **delete images** from storage
- ✅ Proper bucket-level security for event-images

### **3. Complete Delete Functionality**
- ✅ **Delete button** in My Events page for each event
- ✅ **Delete button** in Event Details page for hosts
- ✅ **Cascading deletion**: Participants → Messages → Image → Event
- ✅ **Confirmation dialogs** with detailed warnings
- ✅ **Automatic redirection** after successful deletion

## 📂 **Files Modified**

### **Database Policies**
1. **`FIX_RLS_POLICIES.sql`** - Secure event table policies
2. **`STORAGE_RLS_POLICIES.sql`** - Storage bucket policies for images

### **Backend Services**
3. **`src/lib/services/eventsService.ts`** - Added `deleteEvent()` function with image deletion
4. **`src/lib/hooks/useEvents.ts`** - Added `useDeleteEvent()` hook

### **Frontend Components**
5. **`src/app/my-events/page.tsx`** - Delete button for each event card
6. **`src/components/EventDetailsClient.tsx`** - Delete button for event hosts
7. **`src/app/event/[id]/page.tsx`** - Server-side authentication for RLS

## 🛡️ **Security Implementation**

### **Event Table RLS Policies**
```sql
-- Public: Only approved events
CREATE POLICY "Allow public to read approved events" ON events
FOR SELECT TO public USING (status = 'approved');

-- Hosts: All own events
CREATE POLICY "Allow hosts to read own events" ON events
FOR SELECT TO authenticated USING (auth.uid() = host_id);

-- CRUD operations: Host-only
CREATE POLICY "Allow hosts to update own events" ON events
FOR UPDATE TO authenticated 
USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Allow hosts to delete own events" ON events
FOR DELETE TO authenticated USING (auth.uid() = host_id);
```

### **Storage RLS Policies**
```sql
-- Upload: Authenticated users
CREATE POLICY "Allow uploads for authenticated users" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-images');

-- View: Public (needed for image display)
CREATE POLICY "Allow public to view event images" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'event-images');

-- Delete: Authenticated users (try owner-based first, then simple)
-- Option 1 (secure): Owner-based deletion
CREATE POLICY "Allow users to delete their own images" ON storage.objects
FOR DELETE TO authenticated 
USING (bucket_id = 'event-images' AND auth.uid() = owner::uuid);

-- Option 2 (fallback): Simple deletion if owner-based fails
-- CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
-- FOR DELETE TO authenticated USING (bucket_id = 'event-images');
```

## 🔧 **Delete Event Implementation**

### **Service Function (`eventsService.ts`)**
```typescript
async deleteEvent(eventId: string): Promise<void> {
  // 1. Authenticate user session
  // 2. Verify host ownership
  // 3. Delete image from storage
  // 4. Delete participants
  // 5. Delete messages
  // 6. Delete event record
}
```

### **Image Deletion Logic**
```typescript
// Extract filename from URL
let fileName = eventData.image_url.includes('/') 
  ? eventData.image_url.split('/').pop() 
  : eventData.image_url;

// Remove from storage
await supabase.storage.from('event-images').remove([fileName]);
```

### **Cascading Deletion Order**
1. **Image** (from storage bucket)
2. **Participants** (from event_participants table)
3. **Messages** (from messages table)
4. **Event** (from events table)

## 🎨 **User Interface**

### **My Events Page**
- ✅ **Event Cards** with images displayed
- ✅ **Delete Button** (red trash icon) for each event
- ✅ **Confirmation Dialog** with detailed warning
- ✅ **Loading State** during deletion

### **Event Details Page**
- ✅ **Host Actions Section** with Edit, Cancel, Delete buttons
- ✅ **Delete Button** only visible to event hosts
- ✅ **Automatic Redirect** to My Events after deletion
- ✅ **Error Handling** with user-friendly messages

### **Button Design**
```tsx
<Button 
  variant="destructive" 
  size="sm"
  onClick={() => handleDeleteEvent(event.id, event.title)}
  disabled={deleteEventMutation.isPending}
  title="Delete event permanently"
>
  {deleteEventMutation.isPending ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    <Trash2 className="w-4 h-4" />
  )}
</Button>
```

## 🧪 **Testing Procedures**

### **1. RLS Policy Testing**
```bash
node test-secure-rls-policies.js
```
- ✅ Public can access approved events
- ❌ Public cannot access pending events
- ✅ Hosts can access their own pending events

### **2. Image Deletion Testing**
```bash
node test-image-deletion.js
```
- ✅ Storage bucket accessibility
- ✅ Events with images listing
- ✅ Storage policy verification

### **3. Manual Testing Steps**
1. **Create Event**: Upload an event with an image
2. **Verify Image**: Check Supabase Storage dashboard
3. **Delete Event**: Use delete button in My Events or Event Details
4. **Confirm Deletion**: Verify image is removed from storage
5. **Check Database**: Confirm event and related data are deleted

## 🚀 **Deployment Instructions**

### **Step 1: Apply Database Policies**
```sql
-- In Supabase SQL Editor
\i FIX_RLS_POLICIES.sql
\i STORAGE_RLS_POLICIES.sql
```

### **Step 2: Verify Storage Bucket**
- Ensure `event-images` bucket exists
- Check bucket is public for SELECT operations
- Verify RLS is enabled on storage.objects

### **Step 3: Test Functionality**
```bash
# Test RLS policies
node test-secure-rls-policies.js

# Test image deletion
node test-image-deletion.js

# Start development server
npm run dev
```

### **Step 4: Verify in Browser**
1. Login as event host
2. Go to My Events page
3. Try deleting an event with an image
4. Check Supabase Storage dashboard
5. Confirm image is removed

## ✅ **Expected Results**

### **Security**
- ✅ Pending events only accessible to hosts
- ✅ 404 errors for unauthorized access attempts
- ✅ Proper authentication on all CRUD operations

### **Functionality**
- ✅ Complete event deletion with cascading cleanup
- ✅ Image files removed from storage
- ✅ No orphaned data in database
- ✅ Smooth user experience with proper feedback

### **User Experience**
- ✅ Clear confirmation dialogs
- ✅ Loading states during operations
- ✅ Automatic redirects after actions
- ✅ Error handling with helpful messages

## 🔍 **Troubleshooting**

### **Image Not Deleting**
1. Check storage RLS policies are applied
2. Verify bucket name is correct (`event-images`)
3. Ensure user is authenticated
4. Check filename extraction logic

### **404 on Pending Events**
1. Verify RLS policies are applied to events table
2. Check server-side Supabase client is configured
3. Ensure user session is properly passed

### **Delete Button Not Showing**
1. Verify user is the event host
2. Check imports of delete hook and icon
3. Ensure component is using latest code

---

**🎉 Result**: Complete event management system with secure RLS policies, proper image deletion, and comprehensive delete functionality!
