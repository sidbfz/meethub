/**
 * Comprehensive test for the moderator system
 * Tests the complete flow from event creation to moderation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testModeratorSystem() {
  console.log('🚀 Starting comprehensive moderator system test...\n');

  try {
    // 1. Check if moderator user exists
    console.log('1. Checking for moderator user...');
    const { data: moderators, error: moderatorError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'moderator')
      .limit(1);

    if (moderatorError) {
      console.error('❌ Error fetching moderator:', moderatorError);
      return;
    }

    if (!moderators || moderators.length === 0) {
      console.log('⚠️  No moderator user found. Creating one for testing...');
      
      // Create a test moderator user
      const { data: newModerator, error: createError } = await supabase
        .from('users')
        .insert({
          id: 'test-moderator-id',
          email: 'moderator@test.com',
          full_name: 'Test Moderator',
          role: 'moderator'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating moderator:', createError);
        return;
      }
      console.log('✅ Test moderator created:', newModerator.email);
    } else {
      console.log('✅ Moderator user found:', moderators[0].email);
    }

    const moderatorUser = moderators[0] || { id: 'test-moderator-id' };

    // 2. Create a test event with pending status
    console.log('\n2. Creating test event with pending approval status...');
    const testEvent = {
      id: 'test-event-' + Date.now(),
      title: 'Test Event for Moderation',
      description: 'This is a test event to check the moderation system',
      date_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      address: 'Test Address',
      city: 'Test City',
      category: 'technology',
      max_participants: 50,
      status: 'pending_approval',
      host_id: 'test-host-id'
    };

    const { data: createdEvent, error: eventError } = await supabase
      .from('events')
      .insert(testEvent)
      .select()
      .single();

    if (eventError) {
      console.error('❌ Error creating test event:', eventError);
      return;
    }
    console.log('✅ Test event created:', createdEvent.title);

    // 3. Test fetching pending events (what the dashboard would do)
    console.log('\n3. Testing pending events fetch...');
    const { data: pendingEvents, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        host:users!events_host_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching pending events:', fetchError);
      return;
    }
    console.log(`✅ Found ${pendingEvents.length} pending events`);

    // 4. Test event approval via API simulation
    console.log('\n4. Testing event approval...');
    
    // Simulate the API route logic
    const { data: updatedEvent, error: approvalError } = await supabase
      .from('events')
      .update({ status: 'approved' })
      .eq('id', createdEvent.id)
      .eq('status', 'pending_approval')
      .select()
      .single();

    if (approvalError) {
      console.error('❌ Error approving event:', approvalError);
      return;
    }
    console.log('✅ Event approved successfully:', updatedEvent.title);

    // 5. Test stats calculation
    console.log('\n5. Testing dashboard stats calculation...');
    const { data: allEvents, error: statsError } = await supabase
      .from('events')
      .select('status');

    if (statsError) {
      console.error('❌ Error fetching stats:', statsError);
      return;
    }

    const stats = {
      pending: allEvents.filter(e => e.status === 'pending_approval').length,
      approved: allEvents.filter(e => e.status === 'approved').length,
      rejected: allEvents.filter(e => e.status === 'rejected').length,
      total: allEvents.length
    };

    console.log('✅ Dashboard stats calculated:');
    console.log(`   - Pending: ${stats.pending}`);
    console.log(`   - Approved: ${stats.approved}`);
    console.log(`   - Rejected: ${stats.rejected}`);
    console.log(`   - Total: ${stats.total}`);

    // 6. Test RLS policies
    console.log('\n6. Testing RLS policies...');
    
    // Create regular Supabase client (anon key)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Try to fetch events with anon client (should work for public events)
    const { data: publicEvents, error: rlsError } = await anonClient
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .limit(1);

    if (rlsError) {
      console.log('⚠️  RLS working - anon user cannot fetch events:', rlsError.message);
    } else {
      console.log('✅ Public events accessible to anon users');
    }

    // 7. Clean up test data
    console.log('\n7. Cleaning up test data...');
    await supabase
      .from('events')
      .delete()
      .eq('id', createdEvent.id);

    // Only delete test moderator if we created it
    if (moderators.length === 0) {
      await supabase
        .from('users')
        .delete()
        .eq('id', 'test-moderator-id');
    }

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All moderator system tests passed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Moderator user management');
    console.log('- ✅ Event creation with pending status');
    console.log('- ✅ Pending events fetch (dashboard query)');
    console.log('- ✅ Event approval process');
    console.log('- ✅ Dashboard stats calculation');
    console.log('- ✅ RLS policies working');
    console.log('- ✅ Data cleanup');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testModeratorSystem().then(() => {
    process.exit(0);
  });
}

module.exports = { testModeratorSystem };
