// Test script to check database connectivity and messages
// Run with: node scripts/test-messages.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testMessages() {
  console.log('Testing messages table...');
  
  // Test 1: Check if we can read messages (without auth)
  console.log('\n1. Testing public read access...');
  const { data: publicData, error: publicError } = await supabase
    .from('messages')
    .select('*')
    .limit(5);
  
  console.log('Public access result:', { 
    count: publicData?.length || 0, 
    error: publicError?.message 
  });
  
  // Test 2: Check table structure
  console.log('\n2. Testing table structure...');
  const { data: structureData, error: structureError } = await supabase
    .from('messages')
    .select('id, event_id, user_id, content, created_at')
    .limit(1);
    
  console.log('Structure test:', { 
    success: !structureError, 
    error: structureError?.message 
  });
  
  // Test 3: Check if table exists and has RLS enabled
  console.log('\n3. Checking RLS status...');
  const { data: rlsData, error: rlsError } = await supabase
    .rpc('check_table_rls', { table_name: 'messages' })
    .single();
    
  if (rlsError && rlsError.message.includes('function check_table_rls')) {
    console.log('RLS check function not available, but table exists');
  } else {
    console.log('RLS status:', { data: rlsData, error: rlsError?.message });
  }
  
  // Test 4: Check users table connection
  console.log('\n4. Testing users table connection...');
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, full_name')
    .limit(1);
    
  console.log('Users table:', { 
    accessible: !usersError, 
    error: usersError?.message 
  });
}

testMessages().catch(console.error);
