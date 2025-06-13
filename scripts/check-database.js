const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database setup...\n');

  // Check events table
  try {
    const { data, error } = await supabase.from('events').select('*').limit(1);
    if (error) {
      console.log('❌ Events table:', error.message);
    } else {
      console.log('✅ Events table is accessible');
    }
  } catch (err) {
    console.log('❌ Events table: Failed to connect');
  }

  // Check users table
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      console.log('❌ Users table:', error.message);
    } else {
      console.log('✅ Users table is accessible');
    }
  } catch (err) {
    console.log('❌ Users table: Failed to connect');
  }

  // Check event_participants table
  try {
    const { data, error } = await supabase.from('event_participants').select('*').limit(1);
    if (error) {
      console.log('❌ Event participants table:', error.message);
    } else {
      console.log('✅ Event participants table is accessible');
    }
  } catch (err) {
    console.log('❌ Event participants table: Failed to connect');
  }

  // Check messages table
  try {
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    if (error) {
      console.log('❌ Messages table:', error.message);
    } else {
      console.log('✅ Messages table is accessible');
    }
  } catch (err) {
    console.log('❌ Messages table: Failed to connect');
  }

  // Check storage bucket
  try {
    const { data, error } = await supabase.storage.from('events').list();
    if (error) {
      console.log('❌ Events storage bucket:', error.message);
    } else {
      console.log('✅ Events storage bucket is accessible');
    }
  } catch (err) {
    console.log('❌ Events storage bucket: Failed to connect');
  }

  console.log('\n📋 Setup Status:');
  console.log('If you see any ❌ errors above, please:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Follow the instructions in SUPABASE_SETUP.md');
  console.log('3. Create the missing tables and policies');
  console.log('4. Run this script again to verify');
}

checkDatabase().catch(console.error);
