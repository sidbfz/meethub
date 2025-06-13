# Storage RLS Policies Setup Guide - Supabase Dashboard

## 🎯 **Problem**: You get "must be owner of table objects" error when trying to set storage policies via SQL

## ✅ **Solution**: Set up storage policies through Supabase Dashboard UI

## 📋 **Step-by-Step Instructions**

### **Step 1: Navigate to Storage Policies**
1. Open your Supabase project dashboard
2. Go to **Storage** in the left sidebar
3. Click on **Policies** tab
4. You should see your `events` bucket listed

### **Step 2: Create SELECT Policy (View Images)**
1. Click **New Policy** button
2. Fill in the details:
   - **Policy Name**: `Allow public to view event images`
   - **Allowed Operation**: `SELECT`
   - **Target Roles**: `public`
   - **Policy Definition**: `bucket_id = 'events'`
3. Click **Create Policy**

### **Step 3: Create INSERT Policy (Upload Images)**
1. Click **New Policy** button again
2. Fill in the details:
   - **Policy Name**: `Allow authenticated users to upload images`
   - **Allowed Operation**: `INSERT`
   - **Target Roles**: `authenticated`
   - **Policy Definition**: `bucket_id = 'events'`
3. Click **Create Policy**

### **Step 4: Create DELETE Policy (Delete Images)**
1. Click **New Policy** button again
2. Fill in the details:
   - **Policy Name**: `Allow authenticated users to delete images`
   - **Allowed Operation**: `DELETE`
   - **Target Roles**: `authenticated`
   - **Policy Definition**: `bucket_id = 'events'`
3. Click **Create Policy**

### **Step 5: Verify Bucket Configuration**
1. Go to **Storage** > **Settings**
2. Find your `events` bucket
3. Ensure it's set to **Public** for viewing
4. Check that the folder structure shows `public/` folder

## 🔧 **Alternative Method: SQL Editor (If You Have Permissions)**

If you have the necessary permissions, you can run this in the SQL Editor:

```sql
-- Only run if you have storage admin permissions
CREATE POLICY "Allow public to view event images" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'events');

CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'events');

CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'events');
```

## 🧪 **Testing the Setup**

### **Test 1: Check Policies are Active**
1. Go to Storage > Policies
2. Verify all 3 policies are listed and enabled
3. Check the policy definitions match exactly

### **Test 2: Test Image Deletion**
1. Create an event with an image
2. Check the image appears in Storage > events > public/
3. Delete the event using the delete button
4. Verify the image is removed from storage

### **Test 3: Verify Console Logs**
1. Open browser developer tools
2. Go to Console tab
3. Delete an event with an image
4. Look for these log messages:
   ```
   Attempting to delete event image: public/filename.jpg
   Full image URL: https://...
   Bucket: events
   Event image deleted successfully: public/filename.jpg
   ```

## 🐛 **Troubleshooting**

### **Policy Not Working**
- Double-check bucket name is exactly `events`
- Ensure target roles are correct (`public`, `authenticated`)
- Verify policy definitions don't have typos

### **Image Still Not Deleting**
- Check browser console for error messages
- Verify the image URL format in database
- Ensure user is authenticated when deleting

### **Permission Errors**
- Use Dashboard UI instead of SQL Editor
- Contact Supabase support if you need storage admin permissions
- Check if you're the project owner

## 📁 **Expected File Structure**

```
Storage > events bucket
└── public/
    ├── image1.jpg
    ├── image2.png
    └── image3.webp
```

## ✅ **Success Indicators**

1. ✅ All 3 storage policies are created and enabled
2. ✅ Images are visible on the website (SELECT policy working)
3. ✅ New images can be uploaded (INSERT policy working)
4. ✅ Images are deleted when events are deleted (DELETE policy working)
5. ✅ No console errors related to storage operations

---

**🎉 Once these policies are set up correctly, your event images will be automatically deleted from storage when you delete events!**
