const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://ykuwkkeoyajjzfmhdnxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrdXdra2VveWFqanpmbWhkbnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTk0NTcsImV4cCI6MjA2NTE5NTQ1N30.qAoHl_3yeM3qo0xBFPTkqX-VfkR-4b14Th9Xo5ZDMxs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugParticipantCount() {
  const eventId = '5d77405e-8f83-4bcb-992b-d9bd34c2db3b';
  
  console.log('=== DEBUGGING PARTICIPANT COUNT ===');
  console.log('Event ID:', eventId);
  console.log('');

  try {
    // 1. Get event details
    console.log('1. Fetching event details...');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        max_participants,
        host_id,
        host:users!events_host_id_fkey(id, full_name, email)
      `)
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Event error:', eventError);
      return;
    }

    console.log('Event:', {
      id: event.id,
      title: event.title,
      max_participants: event.max_participants,
      host_id: event.host_id,
      host_name: event.host?.full_name
    });
    console.log('');

    // 2. Get all participants (including different statuses)
    console.log('2. Fetching all participants (all statuses)...');
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('event_participants')
      .select(`
        id,
        user_id,
        status,
        joined_at,
        user:users(id, full_name, email)
      `)
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true });

    if (allParticipantsError) {
      console.error('All participants error:', allParticipantsError);
      return;
    }

    console.log('All participants:', allParticipants.length);
    allParticipants.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.user?.full_name} (${p.user?.id}) - Status: ${p.status} - Joined: ${p.joined_at}`);
    });
    console.log('');

    // 3. Get only 'joined' participants (what the app uses)
    console.log('3. Fetching only "joined" participants...');
    const { data: joinedParticipants, error: joinedError } = await supabase
      .from('event_participants')
      .select(`
        id,
        user_id,
        status,
        joined_at,
        user:users(id, full_name, email)
      `)
      .eq('event_id', eventId)
      .eq('status', 'joined')
      .order('joined_at', { ascending: true });

    if (joinedError) {
      console.error('Joined participants error:', joinedError);
      return;
    }

    console.log('Joined participants:', joinedParticipants.length);
    joinedParticipants.forEach((p, i) => {
      const isHost = p.user_id === event.host_id;
      console.log(`  ${i + 1}. ${p.user?.full_name} (${p.user?.id}) ${isHost ? '- HOST' : ''} - Joined: ${p.joined_at}`);
    });
    console.log('');

    // 4. Calculate counts like the app does
    console.log('4. Calculating counts like the app...');
    const actualParticipants = joinedParticipants.filter(p => p.user?.id !== event.host_id);
    const actualParticipantCount = actualParticipants.length;
    const hostIsParticipant = joinedParticipants.some(p => p.user?.id === event.host_id);
    const totalAttendees = hostIsParticipant ? joinedParticipants.length : joinedParticipants.length + 1;

    console.log('Analysis:');
    console.log(`  - Host ID: ${event.host_id}`);
    console.log(`  - Host is in participants list: ${hostIsParticipant}`);
    console.log(`  - Non-host participants: ${actualParticipantCount}`);
    console.log(`  - Total joined participants: ${joinedParticipants.length}`);
    console.log(`  - Total attendees (app calculation): ${totalAttendees}`);
    console.log(`  - Max participants: ${event.max_participants}`);
    console.log('');

    // 5. Show what the UI displays
    console.log('5. What the UI should display:');
    console.log(`  - Main participant count: ${totalAttendees} / ${event.max_participants}`);
    console.log(`  - Sidebar participant count: ${actualParticipantCount} / ${event.max_participants - 1}`);
    console.log('');

    console.log('6. Participant breakdown:');
    console.log(`  - Host (${event.host?.full_name}): Always counted`);
    console.log(`  - Other participants: ${actualParticipantCount}`);
    
    if (actualParticipantCount > 0) {
      actualParticipants.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.user?.full_name}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugParticipantCount();
