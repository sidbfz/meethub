// Test script to manually run auto-conclude events
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function autoConcludeEvents() {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  
  console.log('Auto-concluding events older than:', fourHoursAgo.toISOString());
  
  const { data, error } = await supabase
    .from('events')
    .update({ 
      status: 'concluded',
      updated_at: new Date().toISOString()
    })
    .eq('status', 'approved')
    .lt('date_time', fourHoursAgo.toISOString());

  if (error) {
    console.error('Error auto-concluding events:', error);
    throw error;
  }

  console.log('Auto-concluded events:', data);
  
  // Now fetch all events to see the current status
  const { data: allEvents } = await supabase
    .from('events')
    .select('id, title, date_time, status')
    .order('date_time', { ascending: false });
    
  console.log('\nAll Events:');
  allEvents?.forEach(event => {
    console.log(`- ${event.title}: ${event.status} (${event.date_time})`);
  });
}

autoConcludeEvents().catch(console.error);
