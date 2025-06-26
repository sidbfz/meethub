import { notFound } from 'next/navigation';
import EventDetailsClient from '@/components/EventDetailsClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface EventPageProps {
  params: { id: string };
}

// This will be a server component that fetches initial data
export default async function EventPage({ params }: EventPageProps) {
  const { id } = params;

  try {
    // Create server-side supabase client with auth context
    const supabase = await createServerSupabaseClient();

    // Try to fetch initial event data on the server with authentication context
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        host:users!events_host_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('id', id)
      .single();

    // If we get an error, let the client handle it
    if (error) {
      console.log('Server-side event fetch error:', error.code, error.message);
      // Always fall back to client-side rendering when there's any error
      return <EventDetailsClient eventId={id} initialEvent={null} />;
    }

    // If successful, pass the event data to client component
    return <EventDetailsClient eventId={id} initialEvent={event} />;
  } catch (error) {
    console.error('Unexpected error in server component:', error);
    // Fall back to client-side rendering for any unexpected errors
    return <EventDetailsClient eventId={id} initialEvent={null} />;
  }
}
