// Enhanced debug script to check storage connection and bucket details
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 ENHANCED DEBUG: Storage Connection & Bucket Analysis\n')

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ ERROR: Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugStorage() {
  try {
    console.log('1. Testing Supabase connection...')
    
    // Test basic connection
    const { data: session } = await supabase.auth.getSession()
    console.log('   ✅ Supabase client created successfully')
    console.log('   📝 Auth status:', session.session ? 'Authenticated' : 'Anonymous')
    
    console.log('\n2. Listing ALL storage buckets...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.log('   ❌ ERROR listing buckets:', bucketError.message)
      console.log('   🔧 This might be a permissions issue')
      return
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('   ❌ No buckets found at all!')
      console.log('   📝 This suggests the storage API isn\'t accessible')
      return
    }
    
    console.log(`   ✅ Found ${buckets.length} bucket(s):`)
    buckets.forEach(bucket => {
      console.log(`   - Name: "${bucket.name}"`)
      console.log(`     ID: ${bucket.id}`)
      console.log(`     Public: ${bucket.public}`)
      console.log(`     Created: ${bucket.created_at}`)
      console.log('')
    })
    
    // Check specifically for events bucket
    const eventsBucket = buckets.find(b => b.name === 'events')
    if (eventsBucket) {
      console.log('3. ✅ "events" bucket found!')
      console.log(`   - Public: ${eventsBucket.public}`)
      console.log(`   - ID: ${eventsBucket.id}`)
      
      // List files in events bucket
      console.log('\n4. Checking files in "events" bucket...')
      const { data: files, error: filesError } = await supabase.storage
        .from('events')
        .list('', { limit: 10 })
      
      if (filesError) {
        console.log('   ❌ ERROR listing files:', filesError.message)
        console.log('   🔧 This is likely a storage policy issue')
      } else {
        console.log(`   ✅ Found ${files?.length || 0} items in root`)
        if (files && files.length > 0) {
          files.forEach(file => {
            console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`)
          })
        }
        
        // Check public folder specifically
        console.log('\n5. Checking "public" folder in events bucket...')
        const { data: publicFiles, error: publicError } = await supabase.storage
          .from('events')
          .list('public', { limit: 10 })
        
        if (publicError) {
          console.log('   ❌ ERROR accessing public folder:', publicError.message)
        } else {
          console.log(`   ✅ Found ${publicFiles?.length || 0} files in public folder`)
          if (publicFiles && publicFiles.length > 0) {
            publicFiles.forEach(file => {
              console.log(`   - public/${file.name}`)
            })
          }
        }
      }
    } else {
      console.log('3. ❌ "events" bucket NOT found!')
      console.log('   📝 Available bucket names:')
      buckets.forEach(b => console.log(`   - "${b.name}"`))
    }
    
    // Test storage policies by attempting operations
    console.log('\n6. Testing storage permissions...')
    
    // Test SELECT (read) permission
    const { data: testList, error: listError } = await supabase.storage
      .from('events')
      .list('public', { limit: 1 })
    
    if (listError) {
      console.log('   ❌ SELECT permission: FAILED -', listError.message)
    } else {
      console.log('   ✅ SELECT permission: WORKING')
    }
    
    // Test DELETE permission with a non-existent file
    const { error: deleteError } = await supabase.storage
      .from('events')
      .remove(['public/test-nonexistent-file.jpg'])
    
    if (deleteError) {
      if (deleteError.message.includes('not found')) {
        console.log('   ✅ DELETE permission: WORKING (file not found is expected)')
      } else {
        console.log('   ❌ DELETE permission: FAILED -', deleteError.message)
      }
    } else {
      console.log('   ✅ DELETE permission: WORKING')
    }
    
  } catch (error) {
    console.log('❌ UNEXPECTED ERROR:', error.message)
  }
}

// Run the debug
debugStorage().then(() => {
  console.log('\n✅ Enhanced debug complete!')
}).catch(error => {
  console.log('\n❌ Debug failed:', error.message)
})
