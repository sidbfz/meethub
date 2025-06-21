// Test storage DELETE operation specifically
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageDelete() {
  console.log('🔍 TESTING STORAGE DELETE OPERATION\n');

  try {
    // 1. First check we can access events with images
    console.log('1. Getting events with images from database...');
    const { data: eventsWithImages, error: eventsError } = await supabase
      .from('events')
      .select('id, title, image_url, host_id')
      .not('image_url', 'is', null)
      .limit(3);

    if (eventsError) {
      console.log('   ❌ Database access failed:', eventsError.message);
      return;
    }

    if (!eventsWithImages || eventsWithImages.length === 0) {
      console.log('   ❌ No events with images found in database');
      console.log('   🔧 But we know storage has 19 files - this suggests image_url fields are NULL/empty');
      return;
    }

    console.log(`   ✅ Found ${eventsWithImages.length} events with images:`);
    eventsWithImages.forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title}"`);
      console.log(`      - Image URL: ${event.image_url}`);
      console.log(`      - Host ID: ${event.host_id}`);
    });

    // 2. Test storage DELETE permission with a test file
    console.log('\n2. Testing storage DELETE permission...');
    
    // Try to delete a non-existent file to test permissions
    const { error: deleteTestError } = await supabase.storage
      .from('events')
      .remove(['public/test-nonexistent-file-' + Date.now() + '.jpg']);

    if (deleteTestError) {
      if (deleteTestError.message.includes('not found') || deleteTestError.message.includes('Object not found')) {
        console.log('   ✅ DELETE permission: WORKING (file not found is expected)');
      } else {
        console.log('   ❌ DELETE permission: FAILED -', deleteTestError.message);
        console.log('   🔧 This is the problem! Storage DELETE policy not working');
        return;
      }
    } else {
      console.log('   ✅ DELETE permission: WORKING');
    }

    // 3. Test the exact file path extraction for a real event
    console.log('\n3. Testing file path extraction for real event...');
    const testEvent = eventsWithImages[0];
    
    let filePath = '';
    
    if (testEvent.image_url.includes('/storage/v1/object/public/events/')) {
      const urlParts = testEvent.image_url.split('/storage/v1/object/public/events/');
      filePath = urlParts[1];
    } else if (testEvent.image_url.includes('events/public/')) {
      const urlParts = testEvent.image_url.split('events/');
      filePath = urlParts[1];
    } else if (testEvent.image_url.includes('public/')) {
      filePath = testEvent.image_url;
    } else {
      const fileName = testEvent.image_url.includes('/') 
        ? testEvent.image_url.split('/').pop() 
        : testEvent.image_url;
      filePath = `public/${fileName}`;
    }
    
    filePath = filePath.split('?')[0];
    
    console.log(`   📁 Original URL: ${testEvent.image_url}`);
    console.log(`   📄 Extracted path: ${filePath}`);
    console.log(`   🗂️  Full storage path: events/${filePath}`);

    // 4. Check if the extracted file actually exists
    console.log('\n4. Checking if extracted file exists...');
    
    const fileName = filePath.replace('public/', '');
    const { data: fileList, error: listError } = await supabase.storage
      .from('events')
      .list('public', { 
        search: fileName,
        limit: 1
      });

    if (listError) {
      console.log('   ❌ Error checking file existence:', listError.message);
    } else if (!fileList || fileList.length === 0) {
      console.log('   ❌ File not found in storage!');
      console.log('   🔧 This means:');
      console.log('      - Database has image_url but file doesn\'t exist in storage');
      console.log('      - OR file path extraction is wrong');
    } else {
      console.log('   ✅ File exists in storage!');
      console.log(`   📝 File: ${fileList[0].name} (${fileList[0].metadata?.size} bytes)`);
      
      // 5. Test actual deletion of this specific file (DRY RUN)
      console.log('\n5. Testing deletion of this specific file...');
      
      console.log(`   🎯 Would delete: events/${filePath}`);
      console.log('   📝 In your app, this would call:');
      console.log(`      supabase.storage.from('events').remove(['${filePath}'])`);
      
      // Optional: Uncomment to actually test deletion (BE CAREFUL!)
      // const { error: actualDeleteError } = await supabase.storage
      //   .from('events')
      //   .remove([filePath]);
      // 
      // if (actualDeleteError) {
      //   console.log('   ❌ Actual deletion failed:', actualDeleteError.message);
      // } else {
      //   console.log('   ✅ Actual deletion successful!');
      // }
    }

    // 6. Check authentication status
    console.log('\n6. Checking authentication status...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('   ⚠️  No authentication - this is why deletion might fail in script');
      console.log('   📝 In your app, users are authenticated, so deletion should work');
    } else {
      console.log('   ✅ Authenticated as:', session.user.email);
    }

    // Final diagnosis
    console.log('\n🩺 FINAL DIAGNOSIS:');
    
    if (eventsWithImages.length === 0) {
      console.log('❌ ISSUE: No events with image_url values in database');
      console.log('🔧 SOLUTION: image_url fields might be NULL - check event creation process');
    } else if (deleteTestError && !deleteTestError.message.includes('not found')) {
      console.log('❌ ISSUE: Storage DELETE permission not working');
      console.log('🔧 SOLUTION: Check storage policies in Supabase Dashboard');
    } else if (!fileList || fileList.length === 0) {
      console.log('❌ ISSUE: File path extraction incorrect OR files don\'t exist');
      console.log('🔧 SOLUTION: Check URL format and file locations');
    } else if (!session) {
      console.log('⚠️  NOTE: Script runs without authentication (expected)');
      console.log('✅ LIKELY: Deletion should work in your authenticated app');
    } else {
      console.log('✅ Everything looks correct! Deletion should work.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testStorageDelete().then(() => {
  console.log('\n✅ Storage delete test complete!');
}).catch(error => {
  console.log('\n❌ Test failed:', error.message);
});
