/**
 * Test script for moderator functionality
 * Run this after setting up the moderator system
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need this for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testModeratorSystem() {
  console.log('🧪 Testing Moderator System...\n');

  try {
    // Test 1: Check if moderator role constraint exists
    console.log('1. Testing role constraint...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      console.log(`   Found ${users.length} users`);
      const moderators = users.filter(u => u.role === 'moderator');
      console.log(`   Found ${moderators.length} moderators`);
      if (moderators.length > 0) {
        console.log('   Moderators:', moderators.map(m => m.email));
      }
    }

    // Test 2: Check pending events
    console.log('\n2. Testing pending events...');
    const { data: pendingEvents, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        status,
        created_at,
        host:users!events_host_id_fkey (
          full_name,
          email
        )
      `)
      .eq('status', 'pending_approval');

    if (eventsError) {
      console.error('❌ Error fetching pending events:', eventsError.message);
    } else {
      console.log('✅ Pending events query successful');
      console.log(`   Found ${pendingEvents.length} events pending approval`);
      if (pendingEvents.length > 0) {
        console.log('   Sample pending events:');
        pendingEvents.slice(0, 3).forEach(event => {
          console.log(`   - "${event.title}" by ${event.host?.full_name || 'Unknown'}`);
        });
      }
    }

    // Test 3: Check chat messages table
    console.log('\n3. Testing chat messages table...');
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('id, message_text, created_at')
      .limit(5);

    if (chatError) {
      console.error('❌ Error accessing chat_messages:', chatError.message);
    } else {
      console.log('✅ Chat messages table accessible');
      console.log(`   Found ${chatMessages.length} messages`);
    }

    // Test 4: Event status distribution
    console.log('\n4. Testing event status distribution...');
    const { data: allEvents, error: statusError } = await supabase
      .from('events')
      .select('status');

    if (statusError) {
      console.error('❌ Error fetching event statuses:', statusError.message);
    } else {
      const statusCounts = allEvents.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('✅ Event status distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
    }

    console.log('\n🎉 Moderator system test completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Create a user with moderator role');
    console.log('   2. Create some test events (they will be pending_approval)');
    console.log('   3. Login as moderator and visit /moderator');
    console.log('   4. Test approving/rejecting events');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to create a test moderator (for development only)
async function createTestModerator(email, fullName) {
  console.log(`\n🔧 Creating test moderator: ${email}`);
  
  try {
    // First, check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Update existing user to moderator
      const { error } = await supabase
        .from('users')
        .update({ role: 'moderator' })
        .eq('email', email);

      if (error) {
        console.error('❌ Failed to update user role:', error.message);
      } else {
        console.log('✅ Updated existing user to moderator role');
      }
    } else {
      console.log('ℹ️  User not found. Please sign up first, then run this function.');
    }
  } catch (error) {
    console.error('❌ Error creating test moderator:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testModeratorSystem();
}

module.exports = {
  testModeratorSystem,
  createTestModerator
};
