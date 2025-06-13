// Clean up orphaned images that weren't deleted due to URL encoding issue
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupOrphanedImages() {
  console.log('🧹 CLEANING UP ORPHANED IMAGES\n');

  try {
    // 1. Get all images in storage
    console.log('1. Getting all images in storage...');
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('events')
      .list('public');

    if (storageError) {
      console.log('   ❌ Error listing storage files:', storageError.message);
      return;
    }

    console.log(`   ✅ Found ${storageFiles.length} files in storage`);

    // 2. Get all events with images from database
    console.log('\n2. Getting all events with images from database...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, image_url')
      .not('image_url', 'is', null);

    if (eventsError) {
      console.log('   ❌ Error getting events:', eventsError.message);
      return;
    }

    console.log(`   ✅ Found ${events.length} events with image URLs in database`);

    // 3. Extract filenames from database URLs
    const databaseFiles = new Set();
    events.forEach(event => {
      if (event.image_url) {
        let filePath = '';
        
        if (event.image_url.includes('/storage/v1/object/public/events/')) {
          const urlParts = event.image_url.split('/storage/v1/object/public/events/');
          filePath = urlParts[1];
        } else if (event.image_url.includes('events/public/')) {
          const urlParts = event.image_url.split('events/');
          filePath = urlParts[1];
        } else if (event.image_url.includes('public/')) {
          filePath = event.image_url;
        } else {
          const fileName = event.image_url.includes('/') 
            ? event.image_url.split('/').pop() 
            : event.image_url;
          filePath = `public/${fileName}`;
        }
        
        // Decode URL encoding and extract just filename
        filePath = decodeURIComponent(filePath);
        const filename = filePath.replace('public/', '');
        databaseFiles.add(filename);
      }
    });

    console.log(`   📝 Database references ${databaseFiles.size} unique image files`);

    // 4. Find orphaned files
    console.log('\n3. Finding orphaned files...');
    const orphanedFiles = [];
    
    storageFiles.forEach(file => {
      if (file.name !== '.emptyFolderPlaceholder' && !databaseFiles.has(file.name)) {
        orphanedFiles.push(file.name);
      }
    });

    console.log(`   🗑️  Found ${orphanedFiles.length} orphaned files:`);
    orphanedFiles.forEach(filename => {
      console.log(`      - ${filename}`);
    });

    // 5. Ask for confirmation and cleanup
    if (orphanedFiles.length > 0) {
      console.log('\n4. Cleanup orphaned files...');
      console.log('   ⚠️  This will permanently delete orphaned images!');
      
      // Uncomment the lines below if you want to actually delete the files
      // console.log('   🧹 Deleting orphaned files...');
      // const filesToDelete = orphanedFiles.map(name => `public/${name}`);
      // const { error: deleteError } = await supabase.storage
      //   .from('events')
      //   .remove(filesToDelete);
      // 
      // if (deleteError) {
      //   console.log('   ❌ Error deleting files:', deleteError.message);
      // } else {
      //   console.log(`   ✅ Successfully deleted ${orphanedFiles.length} orphaned files`);
      // }
      
      console.log('   📝 To actually delete these files, uncomment the deletion code in this script');
    } else {
      console.log('   ✅ No orphaned files found - storage is clean!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

cleanupOrphanedImages().then(() => {
  console.log('\n✅ Cleanup check complete!');
}).catch(error => {
  console.log('\n❌ Cleanup failed:', error.message);
});
