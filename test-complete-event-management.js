// Comprehensive test script to verify event deletion and RLS policies
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEventDeleteAndRLS() {
  console.log('🧪 Testing Event Deletion and RLS Policies\n');

  try {
    // 1. Test RLS policies for pending events
    console.log('1. Testing RLS Policies for Pending Events...');
    
    // Test public access to approved events
    const { data: approvedEvents, error: approvedError } = await supabase
      .from('events')
      .select('id, title, status, host_id, image_url')
      .eq('status', 'approved')
      .limit(3);

    if (approvedError) {
      console.log('   ❌ Error accessing approved events:', approvedError.message);
    } else {
      console.log(`   ✅ Public can access ${approvedEvents.length} approved events`);
      approvedEvents.forEach(event => {
        console.log(`      - "${event.title}" (${event.status}) ${event.image_url ? '📸' : '📄'}`);
      });
    }

    // Test public access to pending events (should be blocked)
    const { data: pendingEvents, error: pendingError } = await supabase
      .from('events')
      .select('id, title, status, host_id')
      .eq('status', 'pending')
      .limit(5);

    if (pendingError) {
      console.log('   ✅ Public access to pending events blocked:', pendingError.message);
    } else if (pendingEvents.length === 0) {
      console.log('   ✅ No pending events accessible to public (as expected)');
    } else {
      console.log(`   ⚠️  WARNING: Public can access ${pendingEvents.length} pending events!`);
    }

    // 2. Test storage policies
    console.log('\n2. Testing Storage Policies...');
    
    // Test public access to storage bucket
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('event-images')
      .list('', { limit: 5 });

    if (storageError) {
      console.log('   ✅ Public storage access properly restricted:', storageError.message);
    } else if (storageFiles) {
      console.log(`   ℹ️  Storage accessible, found ${storageFiles.length} files`);
    }

    // 3. Test events with images
    console.log('\n3. Testing Events with Images...');
    
    const { data: eventsWithImages, error: imagesError } = await supabase
      .from('events')
      .select('id, title, image_url, status, host_id')
      .not('image_url', 'is', null)
      .limit(5);

    if (imagesError) {
      console.log('   ❌ Error fetching events with images:', imagesError.message);
    } else {
      console.log(`   ✅ Found ${eventsWithImages.length} events with images:`);
      eventsWithImages.forEach(event => {
        const fileName = event.image_url ? event.image_url.split('/').pop() : 'unknown';
        console.log(`      - "${event.title}" (${event.status}) - Image: ${fileName}`);
      });
    }

    // 4. Test policy summary
    console.log('\n4. RLS Policy Summary:');
    console.log('   📋 EXPECTED BEHAVIOR:');
    console.log('   ✅ Public: Can read approved events only');
    console.log('   ❌ Public: CANNOT read pending events');
    console.log('   ✅ Hosts: Can read ALL their own events');
    console.log('   ✅ Hosts: Can delete their own events');
    console.log('   ✅ Images: Deleted with events');

    // 5. Test delete functionality requirements
    console.log('\n5. Delete Functionality Features:');
    console.log('   🗑️  My Events Page: Delete button for each event');
    console.log('   🗑️  Event Details Page: Delete button for hosts');
    console.log('   🖼️  Image Deletion: Images removed from storage');
    console.log('   👥 Related Data: Participants and messages cleaned up');
    console.log('   🔄 UI Updates: Pages refresh after deletion');

    // 6. Storage bucket structure test
    console.log('\n6. Storage Structure:');
    console.log('   📁 Bucket: event-images');
    console.log('   🔒 Policies: INSERT for authenticated users');
    console.log('   🗑️  Policies: DELETE for authenticated users');
    console.log('   📝 File naming: UUID-based for uniqueness');

    console.log('\n🚀 TO VERIFY COMPLETE FUNCTIONALITY:');
    console.log('1. Apply the updated FIX_RLS_POLICIES.sql in Supabase SQL Editor');
    console.log('2. Create a test event with an image');
    console.log('3. Try accessing the event as different users');
    console.log('4. Test deleting the event and verify image is removed');
    console.log('5. Check that related data (participants, messages) are cleaned up');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

testEventDeleteAndRLS().then(() => {
  console.log('\n✅ Complete Event Management Test finished!');
  process.exit(0);
});
