// Test script to verify secure RLS policies for pending events
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSecureRLSPolicies() {
  console.log('🔐 Testing Secure RLS Policies for Pending Events\n');

  try {
    // 1. Test public access to approved events
    console.log('1. Testing public access to approved events...');
    const { data: approvedEvents, error: approvedError } = await supabase
      .from('events')
      .select('id, title, status, host_id')
      .eq('status', 'approved')
      .limit(3);

    if (approvedError) {
      console.log('   ❌ Error accessing approved events:', approvedError.message);
    } else {
      console.log(`   ✅ Public can access ${approvedEvents.length} approved events`);
      approvedEvents.forEach(event => {
        console.log(`      - "${event.title}" (${event.status})`);
      });
    }

    // 2. Test public access to pending events (should be restricted)
    console.log('\n2. Testing public access to pending events (should be restricted)...');
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
      pendingEvents.forEach(event => {
        console.log(`      - "${event.title}" (${event.status}) - HOST: ${event.host_id}`);
      });
    }

    console.log('\n📋 EXPECTED BEHAVIOR:');
    console.log('✅ Public: Can read approved events only');
    console.log('❌ Public: CANNOT read pending events');
    console.log('❌ Public: CANNOT access pending event details via direct URL');
    console.log('✅ Hosts: Can read ALL their own events (approved, pending, cancelled)');

    console.log('\n🚀 TO APPLY SECURE POLICIES:');
    console.log('1. Run the updated FIX_RLS_POLICIES.sql in your Supabase SQL Editor');
    console.log('2. Restart your Next.js application');
    console.log('3. Test by accessing pending event URLs as non-host users');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

testSecureRLSPolicies().then(() => {
  console.log('\n✅ RLS Policy Security Test completed!');
  process.exit(0);
});