import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Get basic user profile
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
      const { data: participatedEvents } = await supabase
        .from('event_participants')
        .select(`
          *,
          events(*)
        `)
        .eq('user_id', userId);

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
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if it's a "Profile not found" error
      if (error?.message === 'Profile not found') {
        return false;
      }
      return failureCount < 3;
    }
  });
}

export function useHostedEvents(userId: string | null) {
  return useQuery({
    queryKey: ['hosted-events', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Get events hosted by this user
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
      }

      // Get participant counts for each event
      const eventIds = hostedEventsData.map(event => event.id);
      
      const participantCounts = await Promise.all(
        eventIds.map(async (eventId) => {
          const { count } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'joined');
          
          return { eventId, count: count || 0 };
        })
      );

      // Add participant counts to hosted events
      return hostedEventsData.map(event => ({
        ...event,
        participants_count: participantCounts.find(pc => pc.eventId === event.id)?.count || 0
      }));
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3
  });
}
