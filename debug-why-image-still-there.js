// Debug why image deletion appears successful but file remains
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugImageStillThere() {
  console.log('🔍 DEBUG: Why Image Still Exists After "Successful" Deletion\n');

  try {
    // The file that was supposedly deleted
    const deletedFilePath = 'public/1749669084283-student%20id%20(1).jpg';
    const decodedPath = 'public/1749669084283-student id (1).jpg'; // URL decoded version
    
    console.log('1. Testing if the "deleted" file still exists...');
    console.log(`   Encoded path: ${deletedFilePath}`);
    console.log(`   Decoded path: ${decodedPath}`);
    
    // Check if file exists with encoded name
    const { data: files1, error: error1 } = await supabase.storage
      .from('events')
      .list('public', { 
        search: '1749669084283-student%20id%20(1).jpg' 
      });
    
    // Check if file exists with decoded name  
    const { data: files2, error: error2 } = await supabase.storage
      .from('events')
      .list('public', { 
        search: '1749669084283-student id (1).jpg'
      });
    
    // Check all files with similar timestamp
    const { data: allFiles, error: error3 } = await supabase.storage
      .from('events')
      .list('public', { 
        search: '1749669084283'
      });
    
    console.log('\n2. Search results:');
    
    if (error1) {
      console.log('   ❌ Error searching encoded name:', error1.message);
    } else {
      console.log(`   📁 Encoded name search: ${files1?.length || 0} files found`);
      if (files1 && files1.length > 0) {
        files1.forEach(file => console.log(`      - ${file.name}`));
      }
    }
    
    if (error2) {
      console.log('   ❌ Error searching decoded name:', error2.message);
    } else {
      console.log(`   📁 Decoded name search: ${files2?.length || 0} files found`);
      if (files2 && files2.length > 0) {
        files2.forEach(file => console.log(`      - ${file.name}`));
      }
    }
    
    if (error3) {
      console.log('   ❌ Error searching timestamp:', error3.message);
    } else {
      console.log(`   📁 Timestamp search: ${allFiles?.length || 0} files found`);
      if (allFiles && allFiles.length > 0) {
        allFiles.forEach(file => console.log(`      - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`));
      }
    }
    
    // 3. Test the exact deletion path that was used
    console.log('\n3. Testing deletion with the exact path that was "successful"...');
    
    // Try deleting with the encoded path (what your code used)
    const { error: deleteError1 } = await supabase.storage
      .from('events')
      .remove([deletedFilePath]);
    
    if (deleteError1) {
      console.log(`   ❌ Delete with encoded path failed: ${deleteError1.message}`);
    } else {
      console.log(`   ✅ Delete with encoded path succeeded (or file already gone)`);
    }
    
    // Try deleting with the decoded path
    const { error: deleteError2 } = await supabase.storage
      .from('events')
      .remove([decodedPath]);
    
    if (deleteError2) {
      console.log(`   ❌ Delete with decoded path failed: ${deleteError2.message}`);
    } else {
      console.log(`   ✅ Delete with decoded path succeeded`);
    }
    
    // 4. Check what files remain
    console.log('\n4. Final check - what files remain?');
    const { data: remainingFiles, error: listError } = await supabase.storage
      .from('events')
      .list('public', { 
        search: '1749669084283'
      });
    
    if (listError) {
      console.log('   ❌ Error listing remaining files:', listError.message);
    } else {
      console.log(`   📁 Files still there: ${remainingFiles?.length || 0}`);
      if (remainingFiles && remainingFiles.length > 0) {
        remainingFiles.forEach(file => {
          console.log(`      - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
        });
      } else {
        console.log('   ✅ No files found with that timestamp - deletion worked!');
      }
    }
    
    // 5. Diagnosis
    console.log('\n🩺 DIAGNOSIS:');
    
    if (remainingFiles && remainingFiles.length > 0) {
      console.log('❌ ISSUE: Image deletion appears successful but file remains');
      console.log('🔧 LIKELY CAUSE: URL encoding/decoding mismatch');
      console.log('');
      console.log('💡 SOLUTION: Fix the file path extraction in deleteEvent function');
      console.log('   The issue is likely with URL encoding in the filename');
      console.log('   Current: "student%20id%20(1).jpg" (URL encoded)');
      console.log('   Actual:  "student id (1).jpg" (decoded)');
    } else {
      console.log('✅ SUCCESS: File was actually deleted!');
      console.log('   The second deletion attempt worked');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugImageStillThere().then(() => {
  console.log('\n✅ Debug complete!');
}).catch(error => {
  console.log('\n❌ Debug failed:', error.message);
});
