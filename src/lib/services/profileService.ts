import { supabase } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  participated_events?: Array<{
    status: string;
    joined_at: string;
    event: any;
  }>;
}

export interface HostedEvent {
  id: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  category: string;
  status: string;
  image_url?: string;
  max_participants: number;
  created_at: string;
  host_id: string;
  participants_count: number;
}

export const profileService = {
  // Get user profile by ID
  async getUserProfile(userId: string): Promise<UserProfile> {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Profile not found');
    }

    if (!profileData) {
      throw new Error('Profile not found');
    }

    // Get participated events
    const { data: participatedEvents, error: participatedError } = await supabase
      .from('event_participants')
      .select(`
        *,
        events(*)
      `)
      .eq('user_id', userId);

    if (participatedError) {
      console.error('Error fetching participated events:', participatedError);
    }

    // Filter for only 'joined' status and events with approved/concluded/cancelled status
    const joinedEvents = participatedEvents
      ?.filter(pe => 
        pe.status === 'joined' && 
        pe.events && 
        ['approved', 'concluded', 'cancelled'].includes(pe.events.status)
      )
      ?.map(pe => ({
        status: pe.status,
        joined_at: pe.joined_at,
        event: pe.events
      })) || [];

    return {
      ...profileData,
      participated_events: joinedEvents
    };
  },

  // Get events hosted by a user
  async getHostedEvents(userId: string): Promise<HostedEvent[]> {
    // Get events hosted by this user (approved, concluded, or cancelled events)
    const { data: hostedEventsData, error: hostedError } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', userId)
      .in('status', ['approved', 'concluded', 'cancelled'])
      .order('created_at', { ascending: false });

    if (hostedError) {
      console.error('Error fetching hosted events:', hostedError);
      throw new Error('Failed to fetch hosted events');
    }

    if (!hostedEventsData || hostedEventsData.length === 0) {
      return [];
    }    // Get participant counts for each event
    const eventIds = hostedEventsData.map(event => event.id);
    
    const participantCounts = await Promise.all(
      eventIds.map(async (eventId) => {
        try {
          const { count, error } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'joined');
          
          if (error) {
            console.warn(`Could not fetch participant count for event ${eventId}:`, error);
            return { eventId, count: 0 };
          }
          
          return { eventId, count: count || 0 };
        } catch (error) {
          console.warn(`Error fetching participant count for event ${eventId}:`, error);
          return { eventId, count: 0 };
        }
      })
    );

    // Add participant counts to hosted events
    const hostedEventsWithCounts = hostedEventsData.map(event => ({
      ...event,
      participants_count: participantCounts.find(pc => pc.eventId === event.id)?.count || 0
    }));

    return hostedEventsWithCounts;
  }
};
