// Check for database/storage mismatch
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabaseStorageMismatch() {
  console.log('🔍 CHECKING DATABASE vs STORAGE MISMATCH\n');

  try {
    // 1. Check what's in storage
    console.log('1. Checking files in storage...');
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('events')
      .list('public', { limit: 20 });

    if (storageError) {
      console.log('   ❌ Error accessing storage:', storageError.message);
      return;
    }

    const imageFiles = storageFiles.filter(file => 
      file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && 
      file.name !== '.emptyFolderPlaceholder'
    );

    console.log(`   ✅ Found ${imageFiles.length} image files in storage:`);
    imageFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`);
    });

    // 2. Check what's in database
    console.log('\n2. Checking events in database...');
    const { data: allEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, title, image_url, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (eventsError) {
      console.log('   ❌ Error accessing events:', eventsError.message);
      return;
    }

    console.log(`   ✅ Found ${allEvents.length} events in database:`);
    
    const eventsWithImages = allEvents.filter(event => event.image_url);
    const eventsWithoutImages = allEvents.filter(event => !event.image_url);

    console.log(`   📸 Events WITH images: ${eventsWithImages.length}`);
    console.log(`   📝 Events WITHOUT images: ${eventsWithoutImages.length}`);

    if (eventsWithImages.length > 0) {
      console.log('\n   Events with images:');
      eventsWithImages.forEach((event, index) => {
        console.log(`   ${index + 1}. "${event.title}" - ${event.status}`);
        console.log(`      Image URL: ${event.image_url}`);
      });
    }

    // 3. Cross-reference: find orphaned files
    console.log('\n3. Finding orphaned files (in storage but not in database)...');
    
    const orphanedFiles = [];
    
    for (const file of imageFiles) {
      // Check if this filename appears in any event's image_url
      const fileInDatabase = eventsWithImages.some(event => 
        event.image_url && event.image_url.includes(file.name)
      );
      
      if (!fileInDatabase) {
        orphanedFiles.push(file.name);
      }
    }

    if (orphanedFiles.length > 0) {
      console.log(`   ❌ Found ${orphanedFiles.length} orphaned files (in storage but not referenced in database):`);
      orphanedFiles.forEach((filename, index) => {
        console.log(`   ${index + 1}. ${filename}`);
      });
    } else {
      console.log('   ✅ No orphaned files found');
    }

    // 4. Cross-reference: find broken references
    console.log('\n4. Finding broken references (in database but not in storage)...');
    
    const brokenReferences = [];
    
    for (const event of eventsWithImages) {
      // Extract filename from URL
      let expectedFilename = '';
      
      if (event.image_url.includes('/')) {
        expectedFilename = event.image_url.split('/').pop();
      } else {
        expectedFilename = event.image_url;
      }
      
      // Remove query parameters
      expectedFilename = expectedFilename.split('?')[0];
      
      // Check if file exists in storage
      const fileExists = imageFiles.some(file => file.name === expectedFilename);
      
      if (!fileExists) {
        brokenReferences.push({
          eventTitle: event.title,
          imageUrl: event.image_url,
          expectedFilename: expectedFilename
        });
      }
    }

    if (brokenReferences.length > 0) {
      console.log(`   ❌ Found ${brokenReferences.length} broken references (in database but file missing from storage):`);
      brokenReferences.forEach((ref, index) => {
        console.log(`   ${index + 1}. Event: "${ref.eventTitle}"`);
        console.log(`      Missing file: ${ref.expectedFilename}`);
      });
    } else {
      console.log('   ✅ No broken references found');
    }

    // 5. Summary and recommendations
    console.log('\n🩺 DIAGNOSIS:');
    
    if (imageFiles.length > 0 && eventsWithImages.length === 0) {
      console.log('❌ MAJOR ISSUE: Storage has images but NO events reference them!');
      console.log('🔧 LIKELY CAUSE: All events with images were deleted but images remained');
      console.log('📝 SOLUTION: Clean up orphaned images or create test events with images');
    } else if (orphanedFiles.length > 0) {
      console.log(`❌ STORAGE BLOAT: ${orphanedFiles.length} unused files taking up space`);
      console.log('🔧 SOLUTION: Delete orphaned files or update database references');
    } else if (brokenReferences.length > 0) {
      console.log(`❌ BROKEN LINKS: ${brokenReferences.length} events reference missing images`);
      console.log('🔧 SOLUTION: Fix image URLs or re-upload missing images');
    } else if (eventsWithImages.length > 0) {
      console.log('✅ DATABASE/STORAGE SYNC: Everything looks consistent!');
      console.log('🔧 IMAGE DELETION SHOULD WORK: Try deleting an event with an image');
    } else {
      console.log('ℹ️  NO TEST DATA: No events with images to test deletion');
      console.log('📝 NEXT STEP: Create a test event with an image to verify deletion works');
    }

    console.log('\n🧪 TO TEST IMAGE DELETION:');
    console.log('1. Go to your app and create a new event with an image');
    console.log('2. Verify the image appears in both database and storage');
    console.log('3. Delete the event using the delete button');
    console.log('4. Check that both database record AND storage file are removed');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDatabaseStorageMismatch().then(() => {
  console.log('\n✅ Database/Storage check complete!');
}).catch(error => {
  console.log('\n❌ Check failed:', error.message);
});
