// Simple test script to verify Supabase Channels are working
// Run with: node debug-channels.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Channels...');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function testChannels() {
  try {
    console.log('\n📡 Creating Supabase client...');
    const client = createClient(supabaseUrl, supabaseKey);
    
    console.log('📺 Creating test channel...');
    const channel = client.channel('test-channel', {
      config: {
        broadcast: {
          self: true,
        },
      },
    });

    console.log('👂 Setting up message listener...');
    channel.on('broadcast', { event: 'test' }, ({ payload }) => {
      console.log('✅ Message received:', payload);
    });    console.log('🔌 Subscribing to channel...');
    const subscription = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timed out after 10 seconds'));
      }, 10000);

      channel.subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve(status);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Subscription failed: ${status}`));
        }
      });
    });

    console.log('✅ Successfully subscribed!');
    
    console.log('📤 Sending test message...');
    const result = await channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Hello from debug script!' },
    });
    
    console.log('📤 Send result:', result);
    
    // Wait a bit for the message to be received
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🧹 Cleaning up...');
    channel.unsubscribe();
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChannels();
