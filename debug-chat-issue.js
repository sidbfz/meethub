// Debug script to check chat and host participation issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugChatIssue() {
  try {
    console.log('🔍 Debugging chat message sending issue...\n');

    // 1. Check users table
    console.log('1. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log('✅ Users found:', users.length);
      users.forEach(user => {
        console.log(`   - ${user.full_name} (${user.id})`);
      });
    }

    // 2. Check events table
    console.log('\n2. Checking events table...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, host_id')
      .limit(3);
    
    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
    } else {
      console.log('✅ Events found:', events.length);
      for (const event of events) {
        console.log(`   - ${event.title} (${event.id}) hosted by ${event.host_id}`);
        
        // Check if host is in participants table
        const { data: hostParticipant, error: hostError } = await supabase
          .from('event_participants')
          .select('*')
          .eq('event_id', event.id)
          .eq('user_id', event.host_id)
          .eq('status', 'joined');
        
        if (hostError) {
          console.error(`   ❌ Error checking host participation:`, hostError);
        } else if (hostParticipant.length === 0) {
          console.log(`   ⚠️  HOST NOT IN PARTICIPANTS TABLE!`);
        } else {
          console.log(`   ✅ Host is properly added as participant`);
        }
      }
    }

    // 3. Check messages table structure
    console.log('\n3. Checking messages table structure...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ Error accessing messages table:', messagesError);
    } else {
      console.log('✅ Messages table accessible');
    }

    // 4. Check event_participants table
    console.log('\n4. Checking event_participants table...');
    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select('*')
      .limit(5);
    
    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError);
    } else {
      console.log('✅ Participants found:', participants.length);
      participants.forEach(p => {
        console.log(`   - User ${p.user_id} in event ${p.event_id} (${p.status})`);
      });
    }

    // 5. Test message insertion (with a fake user for testing)
    console.log('\n5. Testing RLS policies...');
    
    // Try to insert a test message (this will fail due to RLS, but we can see the error)
    const { data: testMessage, error: testError } = await supabase
      .from('messages')
      .insert({
        event_id: events?.[0]?.id || 'test-event-id',
        user_id: 'test-user-id',
        content: 'Test message'
      });
    
    if (testError) {
      console.log('ℹ️  Expected test insertion error (shows RLS is working):', testError.message);
    } else {
      console.log('⚠️  Test message inserted (RLS might be disabled):', testMessage);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugChatIssue();
