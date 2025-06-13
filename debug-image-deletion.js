// Debug script to test image deletion and storage policies
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugImageDeletion() {
  console.log('🔍 DEBUG: Image Deletion Issue\n');

  try {
    // 1. Check storage buckets
    console.log('1. Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('   ❌ Error accessing buckets:', bucketsError.message);
      return;
    }
    
    console.log('   ✅ Available buckets:');
    buckets.forEach(bucket => {
      console.log(`      - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    const eventsBucket = buckets.find(b => b.name === 'events');
    if (!eventsBucket) {
      console.log('   ❌ PROBLEM: "events" bucket not found!');
      console.log('   📝 ACTION: Create "events" bucket in Supabase Dashboard');
      return;
    }

    // 2. Test basic storage operations
    console.log('\n2. Testing storage operations on "events" bucket...');
    
    // Test listing files
    const { data: files, error: listError } = await supabase.storage
      .from('events')
      .list('public', { limit: 10 });
    
    if (listError) {
      console.log('   ❌ Cannot list files in events/public:', listError.message);
      console.log('   🚨 ISSUE: Missing storage policies!');
    } else {
      console.log(`   ✅ Can list files in events/public: ${files.length} files found`);
      if (files.length > 0) {
        console.log('   📁 Files:');
        files.slice(0, 5).forEach(file => {
          console.log(`      - ${file.name}`);
        });
      }
    }

    // 3. Check events with images
    console.log('\n3. Finding events with images...');
    const { data: eventsWithImages, error: eventsError } = await supabase
      .from('events')
      .select('id, title, image_url, host_id')
      .not('image_url', 'is', null)
      .limit(3);

    if (eventsError) {
      console.log('   ❌ Error fetching events:', eventsError.message);
    } else if (eventsWithImages.length === 0) {
      console.log('   ⚠️  No events with images found');
    } else {
      console.log(`   ✅ Found ${eventsWithImages.length} events with images:`);
      
      eventsWithImages.forEach((event, index) => {
        console.log(`\n   Event ${index + 1}: "${event.title}"`);
        console.log(`   - Image URL: ${event.image_url}`);
        console.log(`   - Host ID: ${event.host_id}`);
        
        // Extract expected file path
        let expectedPath = '';
        if (event.image_url.includes('/storage/v1/object/public/events/')) {
          const urlParts = event.image_url.split('/storage/v1/object/public/events/');
          expectedPath = urlParts[1];
        } else if (event.image_url.includes('events/public/')) {
          const urlParts = event.image_url.split('events/');
          expectedPath = urlParts[1];
        } else if (event.image_url.includes('public/')) {
          expectedPath = event.image_url;
        } else {
          const fileName = event.image_url.includes('/') 
            ? event.image_url.split('/').pop() 
            : event.image_url;
          expectedPath = `public/${fileName}`;
        }
        
        console.log(`   - Expected storage path: ${expectedPath}`);
      });
    }

    // 4. Test delete operation (simulate)
    console.log('\n4. Testing delete operation permissions...');
    
    if (eventsWithImages.length > 0) {
      const testEvent = eventsWithImages[0];
      let testFilePath = '';
      
      if (testEvent.image_url.includes('/storage/v1/object/public/events/')) {
        const urlParts = testEvent.image_url.split('/storage/v1/object/public/events/');
        testFilePath = urlParts[1];
      } else if (testEvent.image_url.includes('public/')) {
        testFilePath = testEvent.image_url;
      } else {
        const fileName = testEvent.image_url.includes('/') 
          ? testEvent.image_url.split('/').pop() 
          : testEvent.image_url;
        testFilePath = `public/${fileName}`;
      }
      
      console.log(`   Testing delete permissions for: ${testFilePath}`);
      
      // Try to get file info (this tests SELECT permission)
      const { data: fileData, error: fileError } = await supabase.storage
        .from('events')
        .list('public', { 
          search: testFilePath.replace('public/', '')
        });
      
      if (fileError) {
        console.log('   ❌ Cannot access file:', fileError.message);
      } else {
        console.log('   ✅ File accessible for reading');
      }
    }

    // 5. Check current authentication state
    console.log('\n5. Checking authentication...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('   ❌ Session error:', sessionError.message);
    } else if (!session) {
      console.log('   ⚠️  No active session (using anonymous access)');
      console.log('   📝 NOTE: Delete operations require authentication');
    } else {
      console.log('   ✅ Active session found');
      console.log(`   - User ID: ${session.user.id}`);
      console.log(`   - Email: ${session.user.email}`);
    }

    // 6. Diagnosis
    console.log('\n🩺 DIAGNOSIS:');
    
    if (!eventsBucket) {
      console.log('❌ Missing "events" storage bucket');
    } else if (listError && listError.message.includes('new row violates row-level security')) {
      console.log('❌ Storage RLS policies not configured');
      console.log('📝 SOLUTION: Apply storage policies via Supabase Dashboard UI');
    } else if (!session) {
      console.log('⚠️  No authentication - delete operations will fail');
      console.log('📝 NOTE: This is expected when running as script');
    } else if (eventsWithImages.length === 0) {
      console.log('⚠️  No test data - create an event with image to test');
    } else {
      console.log('✅ Basic setup looks correct');
      console.log('📝 Storage policies may need to be applied via Dashboard UI');
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Apply storage policies via Supabase Dashboard (see QUICK_FIX_STORAGE.md)');
    console.log('2. Create a test event with an image (while logged in)');
    console.log('3. Try deleting the event and check browser console logs');
    console.log('4. Verify in Supabase Storage dashboard if image is removed');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugImageDeletion().then(() => {
  console.log('\n✅ Debug complete!');
  process.exit(0);
});
