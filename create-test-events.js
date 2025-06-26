/**
 * Simple script to create test events for moderator testing
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestEvents() {
  console.log('🎯 Creating test events for moderator dashboard...\n');

  try {
    // Get a user to use as host
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(1);

    if (usersError || !users.length) {
      console.error('❌ No users found to use as host');
      return;
    }

    const hostId = users[0].id;
    console.log('📝 Using host:', users[0].full_name || 'Unknown');

    const testEvents = [
      {
        title: 'Tech Meetup - React & Next.js',
        description: 'Join us for an evening of React and Next.js discussions, demos, and networking with fellow developers.',
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        address: '123 Tech Street',
        city: 'San Francisco',
        category: 'technology',
        max_participants: 50,
        status: 'pending_approval',
        host_id: hostId
      },
      {
        title: 'Photography Workshop',
        description: 'Learn advanced photography techniques in this hands-on workshop. Perfect for beginners and intermediate photographers.',
        date_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        address: '456 Creative Avenue',
        city: 'Los Angeles',
        category: 'arts',
        max_participants: 20,
        status: 'pending_approval',
        host_id: hostId
      },
      {
        title: 'Startup Pitch Night',
        description: 'Come pitch your startup idea or listen to exciting new ventures. Great for entrepreneurs and investors.',
        date_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        address: '789 Business Blvd',
        city: 'New York',
        category: 'business',
        max_participants: 100,
        status: 'pending_approval',
        host_id: hostId
      }
    ];

    console.log('Creating test events...');

    for (const event of testEvents) {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to create "${event.title}":`, error.message);
      } else {
        console.log(`✅ Created: "${event.title}"`);
      }
    }

    console.log('\n🎉 Test events created successfully!');
    console.log('\nNow you can:');
    console.log('1. Go to /moderator page');
    console.log('2. See the events in the "Pending" tab');
    console.log('3. Approve or reject them');
    console.log('4. See them move to "Approved" or "Rejected" tabs');

  } catch (error) {
    console.error('❌ Error creating test events:', error);
  }
}

// Run the script
if (require.main === module) {
  createTestEvents().then(() => {
    process.exit(0);
  });
}

module.exports = { createTestEvents };
