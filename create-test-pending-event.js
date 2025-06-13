// Script to create a test pending event and update existing event to pending status
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service key to bypass RLS

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure you have SUPABASE_SERVICE_ROLE_KEY in your .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestPendingEvent() {
  console.log('🧪 Creating test pending event for RLS testing\n');

  try {
    // 1. Update one existing approved event to pending status
    console.log('1. Finding existing approved event to update...');
    const { data: existingEvents, error: fetchError } = await supabase
      .from('events')
      .select('id, title, status, host_id')
      .eq('status', 'approved')
      .limit(1);

    if (fetchError) {
      console.log('   ❌ Error fetching events:', fetchError.message);
    } else if (existingEvents.length > 0) {
      const eventToUpdate = existingEvents[0];
      console.log(`   Found event: "${eventToUpdate.title}"`);
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: 'pending' })
        .eq('id', eventToUpdate.id);

      if (updateError) {
        console.log('   ❌ Error updating event:', updateError.message);
      } else {
        console.log(`   ✅ Updated "${eventToUpdate.title}" to pending status`);
        console.log(`   Event ID: ${eventToUpdate.id}`);
        console.log(`   Host ID: ${eventToUpdate.host_id}`);
        console.log(`   Test URL: http://localhost:3000/event/${eventToUpdate.id}`);
      }
    } else {
      console.log('   ℹ️  No approved events found to update');
    }

    // 2. Show current event status distribution
    console.log('\n2. Current event status distribution:');
    const { data: allEvents, error: allError } = await supabase
      .from('events')
      .select('status');

    if (allError) {
      console.log('   ❌ Error fetching all events:', allError.message);
    } else {
      const statusCounts = allEvents.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} events`);
      });
    }

    console.log('\n🧪 TESTING INSTRUCTIONS:');
    console.log('1. First, apply the secure RLS policies:');
    console.log('   Run FIX_RLS_POLICIES.sql in your Supabase SQL Editor');
    console.log('');
    console.log('2. Test the security:');
    console.log('   node test-secure-rls-policies.js');
    console.log('');
    console.log('3. Manual testing:');
    console.log('   - Visit the test URL above while NOT logged in');
    console.log('   - Should see 404 or access denied');
    console.log('   - Login as the host and visit the same URL');
    console.log('   - Should work normally');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestPendingEvent().then(() => {
  console.log('\n✅ Test setup completed!');
  process.exit(0);
});