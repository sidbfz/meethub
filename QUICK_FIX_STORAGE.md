# 🚀 QUICK FIX: Storage Policies for Image Deletion

## The Issue
❌ **Error**: "must be owner of table objects" when trying to apply storage policies via SQL  
❌ **Problem**: Images not being deleted from storage when events are deleted

## The Solution
✅ **Apply 3 storage policies through Supabase Dashboard UI** (NOT SQL Editor)

---

## 🎯 EXACT STEPS TO FIX:

### 1. Open Supabase Dashboard
- Go to your project: https://supabase.com/dashboard/project/[your-project-id]
- Click **Storage** in left sidebar
- Click **Policies** tab

### 2. Create Policy #1
- Click **"New Policy"**
- **Name**: `Allow public to view event images`
- **Operation**: `SELECT`
- **Target**: `public`
- **Definition**: `bucket_id = 'events'`
- Click **Save**

### 3. Create Policy #2
- Click **"New Policy"**
- **Name**: `Allow authenticated users to upload images`
- **Operation**: `INSERT`
- **Target**: `authenticated`
- **Definition**: `bucket_id = 'events'`
- Click **Save**

### 4. Create Policy #3
- Click **"New Policy"**
- **Name**: `Allow authenticated users to delete images`
- **Operation**: `DELETE`
- **Target**: `authenticated`
- **Definition**: `bucket_id = 'events'`
- Click **Save**

---

## ✅ Verification
After setup, you should see **3 active policies** in Storage > Policies.

## 🧪 Test
1. Create event with image ✅ 
2. Delete event → image should be removed from storage ✅
3. Check console for "Event image deleted successfully" message ✅

---

**🎉 That's it! Your image deletion will work once these 3 policies are applied through the Dashboard UI.**
