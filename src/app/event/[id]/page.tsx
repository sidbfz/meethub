import { notFound } from 'next/navigation';
import EventDetailsClient from '@/components/EventDetailsClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Portfolio Demo: Using mock data instead of Supabase
const DEMO_MODE = true;

// Updated interface for Next.js 15+ where params is a Promise
interface EventPageProps {
  params: Promise<{ id: string }>;
}

// This will be a server component that fetches initial data
export default async function EventPage({ params }: EventPageProps) {
  // Await the params Promise
  const { id } = await params;

  // In demo mode, always pass null as initialEvent to let client handle it
  if (DEMO_MODE) {
    console.log('Demo Mode: Delegating event fetch to client for event:', id);
    return <EventDetailsClient eventId={id} initialEvent={null} />;
  }

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