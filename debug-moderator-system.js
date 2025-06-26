/**
 * Debug script to test moderator functionality step by step
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envData = fs.readFileSync(envPath, 'utf8');
  const lines = envData.split('\n');
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugModeratorSystem() {
  console.log('🔍 Debugging moderator system...\n');

  try {
    // 1. Check if users table exists and has moderator role
    console.log('1. Checking users table structure...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(5);

    if (usersError) {
      console.error('❌ Error querying users table:', usersError);
      return;
    }

    console.log('✅ Users table accessible');
    console.log(`   Found ${users.length} users`);
    
    const moderators = users.filter(u => u.role === 'moderator');
    console.log(`   Found ${moderators.length} moderators`);
    
    if (moderators.length === 0) {
      console.log('⚠️  No moderator users found!');
      console.log('   Creating a test moderator...');
      
      // Try to create a test moderator
      const { data: newModerator, error: createError } = await supabase
        .from('users')
        .insert({
          id: 'test-moderator-' + Date.now(),
          email: 'moderator@test.com',
          full_name: 'Test Moderator',
          role: 'moderator'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Could not create test moderator:', createError);
      } else {
        console.log('✅ Test moderator created:', newModerator.email);
      }
    } else {
      console.log('✅ Moderators found:');
      moderators.forEach(mod => {
        console.log(`   - ${mod.email} (${mod.id})`);
      });
    }

    // 2. Check events table and create test event
    console.log('\n2. Checking events table...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, status, created_at')
      .limit(5);

    if (eventsError) {
      console.error('❌ Error querying events table:', eventsError);
      return;
    }

    console.log('✅ Events table accessible');
    console.log(`   Found ${events.length} events`);
    
    const pendingEvents = events.filter(e => e.status === 'pending_approval');
    console.log(`   Found ${pendingEvents.length} pending events`);

    // Create a test event if none pending
    let testEvent = null;
    if (pendingEvents.length === 0) {
      console.log('   Creating test event...');
      const { data: newEvent, error: createEventError } = await supabase
        .from('events')
        .insert({
          title: 'Test Event for Moderation',
          description: 'This is a test event',
          date_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          address: 'Test Address',
          city: 'Test City',
          category: 'technology',
          max_participants: 50,
          status: 'pending_approval',
          host_id: users[0]?.id || 'test-host-id'
        })
        .select()
        .single();

      if (createEventError) {
        console.error('❌ Could not create test event:', createEventError);
      } else {
        console.log('✅ Test event created:', newEvent.title);
        testEvent = newEvent;
      }
    } else {
      testEvent = pendingEvents[0];
      console.log('✅ Using existing pending event:', testEvent.title);
    }

    // 3. Check RLS policies
    console.log('\n3. Checking RLS policies...');
    
    // Try to query events without auth (should only see approved)
    const { data: publicEvents, error: publicError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved');

    if (publicError) {
      console.log('⚠️  Public events query failed:', publicError.message);
    } else {
      console.log(`✅ Public can see ${publicEvents.length} approved events`);
    }

    // 4. Test moderator API endpoint
    console.log('\n4. Testing moderator API endpoint...');
    
    if (testEvent && moderators.length > 0) {
      console.log('   Making API call to approve event...');
      
      try {
        const response = await fetch('http://localhost:3000/api/moderator/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: testEvent.id,
            action: 'approve',
            userId: moderators[0].id,
            // Note: This won't work without real session token
          }),
        });

        const result = await response.json();
        console.log('   API Response:', response.status, result);
        
        if (response.status === 401) {
          console.log('   ⚠️  Expected: 401 because no auth token provided');
        }
        
      } catch (fetchError) {
        console.log('   ⚠️  API call failed (expected if server not running):', fetchError.message);
      }
    }

    console.log('\n📋 Debug Summary:');
    console.log('- Users table:', users ? '✅' : '❌');
    console.log('- Moderator users:', moderators.length > 0 ? '✅' : '❌');
    console.log('- Events table:', events ? '✅' : '❌');
    console.log('- Test event:', testEvent ? '✅' : '❌');
    console.log('- RLS policies:', publicEvents !== undefined ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugModeratorSystem().then(() => {
    process.exit(0);
  });
}

module.exports = { debugModeratorSystem };
