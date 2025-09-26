import { supabase } from '@/lib/supabase/client';
import { Event, EventFilters, EventsResponse } from '@/lib/types/event';
import { mockEvents, mockUsers, mockMessages } from '@/lib/mock-data';

export const EVENTS_PER_PAGE = 12;

// Portfolio Demo: Using mock data instead of Supabase
const DEMO_MODE = true;

export const eventsService = {
  // Test Supabase connection (Demo mode always returns true)
  async testConnection(): Promise<boolean> {
    if (DEMO_MODE) {
      console.log('Demo Mode: Mock connection successful');
      return true;
    }
    
    try {
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase.from('events').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Connection test failed:', error);
        return false;
      }
      
      console.log('Connection test successful. Events count:', data);
      return true;
    } catch (err) {
      console.error('Connection test error:', err);
      return false;
    }
  },

  // Fetch approved events with infinite scroll (Demo mode uses mock data)
  async getApprovedEvents(
    pageParam: number = 0,
    filters: EventFilters = {}
  ): Promise<EventsResponse> {
    if (DEMO_MODE) {
      console.log('Demo Mode: Fetching mock events with filters:', filters);
      
      // Simulate network delay for realistic experience
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Filter mock events based on provided filters
      let filteredEvents = [...mockEvents];
      
      if (filters.category && filters.category !== 'all') {
        filteredEvents = filteredEvents.filter(event => event.category === filters.category);
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredEvents = filteredEvents.filter(event => 
          event.title.toLowerCase().includes(searchTerm) ||
          event.description.toLowerCase().includes(searchTerm) ||
          event.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      if (filters.date) {
        filteredEvents = filteredEvents.filter(event => event.date === filters.date);
      }
      
      // Transform mock events to match the expected Event interface from types/event.ts
      const transformedEvents = filteredEvents.map(mockEvent => ({
        id: mockEvent.id,
        title: mockEvent.title,
        description: mockEvent.description,
        category: mockEvent.category,
        date_time: `${mockEvent.date}T${mockEvent.time}:00Z`,
        max_participants: mockEvent.maxParticipants,
        image_url: mockEvent.imageUrl,
        host_id: mockEvent.host.id,
        status: 'approved' as const,
        created_at: mockEvent.createdAt,
        updated_at: mockEvent.createdAt,
        address: mockEvent.location.address,
        city: mockEvent.location.address.split(',').pop()?.trim() || '',
        host: {
          id: mockEvent.host.id,
          full_name: mockEvent.host.name,
          email: mockEvent.host.email,
          avatar_url: mockEvent.host.avatarUrl
        }
      }));
      
      // Paginate results
      const startIndex = pageParam * EVENTS_PER_PAGE;
      const endIndex = startIndex + EVENTS_PER_PAGE;
      const paginatedEvents = transformedEvents.slice(startIndex, endIndex);
      
      return {
        events: paginatedEvents,
        nextCursor: endIndex < transformedEvents.length ? pageParam + 1 : null,
        hasMore: endIndex < transformedEvents.length
      };
    }
    
    console.log('Fetching approved events with filters:', filters);
      // Build the query for approved events
    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        date_time,
        address,
        city,
        max_participants,
        image_url,
        category,
        status,
        host_id,
        created_at,
        updated_at
      `)
      .eq('status', 'approved')
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })
      .range(pageParam * EVENTS_PER_PAGE, (pageParam + 1) * EVENTS_PER_PAGE - 1);

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
    }

    if (filters.date) {
      const startDate = new Date(filters.date);
      const endDate = new Date(filters.date);
      endDate.setDate(endDate.getDate() + 1);
      
      query = query
        .gte('date_time', startDate.toISOString())
        .lt('date_time', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    const rawEvents = data || [];

    // Fetch host information separately to avoid RLS issues
    const hostIds = rawEvents.map(event => event.host_id).filter(Boolean);
    const { data: hosts, error: hostError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', hostIds);

    if (hostError) {
      console.error('Error fetching hosts:', hostError);
      // Continue without host data rather than failing
    }    // Merge host data with events
    const events = rawEvents.map(event => ({
      ...event,
      host: hosts?.find(host => host.id === event.host_id) || undefined
    }));

    // Fetch participant counts for each event
    const eventIds = events.map(event => event.id);
    if (eventIds.length > 0) {
      try {
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

        // Add participant counts to events
        const eventsWithCounts = events.map(event => ({
          ...event,
          participants_count: participantCounts.find(pc => pc.eventId === event.id)?.count || 0
        }));

        const hasMore = eventsWithCounts.length === EVENTS_PER_PAGE;
        const nextCursor = hasMore ? pageParam + 1 : null;

        return {
          events: eventsWithCounts,
          nextCursor,
          hasMore
        };
      } catch (error) {
        console.error('Error fetching participant counts:', error);
        // Fallback: return events without participant counts
        const eventsWithZeroCounts = events.map(event => ({
          ...event,
          participants_count: 0
        }));

        const hasMore = eventsWithZeroCounts.length === EVENTS_PER_PAGE;
        const nextCursor = hasMore ? pageParam + 1 : null;

        return {
          events: eventsWithZeroCounts,
          nextCursor,
          hasMore
        };      }
    }

    // Fallback for when there are no events
    const eventsWithZeroCounts = events.map(event => ({
      ...event,
      participants_count: 0
    }));

    const hasMore = eventsWithZeroCounts.length === EVENTS_PER_PAGE;
    const nextCursor = hasMore ? pageParam + 1 : null;

    return {
      events: eventsWithZeroCounts,
      nextCursor,
      hasMore,
    };
  },  // Join an event - Uses public INSERT policy "Users can insert themselves as participants"
  async joinEvent(eventId: string, userId: string): Promise<void> {
    console.log('Joining event:', { eventId, userId });

    // First check if user has previously joined/left this event
    const { data: existingParticipant, error: checkError } = await supabase
      .from('event_participants')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing participation:', checkError);
      throw checkError;
    }

    if (existingParticipant) {
      // User exists, update status to 'joined' - Uses UPDATE policy "Users can leave their events"
      const { error } = await supabase
        .from('event_participants')
        .update({ 
          status: 'joined',
          joined_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error rejoining event:', error);
        throw error;
      }
    } else {
      // New participant, insert new record - Uses INSERT policy
      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: userId,
          status: 'joined'
        });

      if (error) {
        console.error('Error joining event:', error);
        throw error;
      }
    }

    console.log('Successfully joined event');
  },
  
  // Leave an event - Uses public DELETE policy "Users can leave events"
  async leaveEvent(eventId: string, userId: string): Promise<void> {
    console.log('Leaving event:', { eventId, userId });

    // Option 1: Delete the participation record completely
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving event:', error);
      throw error;
    }

    console.log('Successfully left event');
  },
  
  // Check if user is participant - Uses public SELECT policy
  async isParticipant(eventId: string, userId: string): Promise<boolean> {
    console.log('isParticipant called - DEMO_MODE:', DEMO_MODE, 'eventId:', eventId, 'userId:', userId);
    
    // Always try demo mode first if eventId starts with 'demo-' or is a demo event  
    const isDemoEvent = eventId.startsWith('demo-') || ['demo-event-1', 'demo-event-2', 'event1', 'event2', 'event3', 'event4'].includes(eventId);
    
    if (DEMO_MODE || isDemoEvent) {
      console.log('Demo Mode: Checking participation for user:', userId, 'in event:', eventId);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        // Demo user is always a participant in demo events
        if (userId === 'demo-user-1') {
          return true;
        }
        
        // Other users are not participants in demo mode
        return false;
      } catch (error) {
        console.error('Demo Mode: Error in isParticipant:', error);
        return false;
      }
    }
    
    // First check if user is the host (hosts are always participants)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('host_id')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw eventError;
    }

    // If user is the host, they are always considered a participant
    if (eventData.host_id === userId) {
      return true;
    }

    // Otherwise, check the participants table using public SELECT policy
    const { data, error } = await supabase
      .from('event_participants')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'joined')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking participation:', error);
      throw error;
    }

    return !!data;
  },

  // Get single event with basic details (no participants to avoid RLS issues)
  async getEventDetails(eventId: string): Promise<Event | null> {
    console.log('getEventDetails called - DEMO_MODE:', DEMO_MODE, 'eventId:', eventId);
    console.log('mockEvents available:', mockEvents ? mockEvents.length : 'undefined');
    
    // Always try demo mode first if eventId starts with 'demo-' or is a demo event
    const isDemoEvent = eventId.startsWith('demo-') || ['demo-event-1', 'demo-event-2', 'event1', 'event2', 'event3', 'event4'].includes(eventId);
    
    if (DEMO_MODE || isDemoEvent) {
      console.log('Demo Mode: Fetching mock event details for event:', eventId);
      
      // Simulate network delay for realistic experience
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // Find the event in mock data
        console.log('Available mock event IDs:', mockEvents.map(e => e.id));
        const mockEvent = mockEvents.find(event => event.id === eventId);
        
        if (!mockEvent) {
          console.log('Demo Mode: Event not found in mock data, eventId:', eventId);
          return null;
        }
        
        console.log('Found mockEvent:', mockEvent.id, mockEvent.title);
        console.log('mockEvent.host:', mockEvent.host);
        
        // Transform mock event to match the expected Event interface
        const transformedEvent: Event = {
          id: mockEvent.id,
          title: mockEvent.title,
          description: mockEvent.description,
          category: mockEvent.category,
          date_time: `${mockEvent.date}T${mockEvent.time}:00Z`,
          max_participants: mockEvent.maxParticipants,
          image_url: mockEvent.imageUrl,
          host_id: mockEvent.host.id,
          status: 'approved' as const,
          created_at: mockEvent.createdAt,
          updated_at: mockEvent.createdAt,
          address: mockEvent.location.address,
          city: mockEvent.location.address.split(',').pop()?.trim() || '',
          host: {
            id: mockEvent.host.id,
            full_name: mockEvent.host.name,
            email: mockEvent.host.email,
            avatar_url: mockEvent.host.avatarUrl
          }
        };
        
        console.log('Demo Mode: Event details fetched successfully:', transformedEvent.id, transformedEvent.title);
        return transformedEvent;
      } catch (error) {
        console.error('Demo Mode: Error in getEventDetails:', error);
        // Fallback: create a basic demo event if it's a demo event ID
        if (eventId === 'demo-event-1') {
          return {
            id: 'demo-event-1',
            title: 'Demo Event 1 - Tech Meetup',
            description: 'This is a demonstration event to showcase the MeetHub platform functionality.',
            category: 'Technology',
            date_time: '2025-08-15T18:00:00Z',
            max_participants: 30,
            image_url: 'https://picsum.photos/seed/demotech/800/400',
            host_id: 'demo-user-1',
            status: 'approved' as const,
            created_at: '2025-07-01T10:00:00Z',
            updated_at: '2025-07-01T10:00:00Z',
            address: '123 Demo Street, Demo City, DC',
            city: 'Demo City',
            host: {
              id: 'demo-user-1',
              full_name: 'Demo User',
              email: 'demo@meethub.com',
              avatar_url: 'https://i.pravatar.cc/150?img=0'
            }
          };
        }
        return null;
      }
    }
    
    try {
      console.log('Fetching event details for event:', eventId);
      
      // Fetch the event data with host information
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          host:users!events_host_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event:', eventError);
        throw eventError;
      }

      if (!event) {
        console.log('Event not found');
        return null;
      }

      console.log('Event fetched successfully:', event.id, event.title);
      return event;

    } catch (error) {
      console.error('Error in getEventDetails:', error);
      throw error;
    }
  },
  // Get events hosted by user (all statuses for host management)
  async getHostEvents(userId: string): Promise<Event[]> {
    if (DEMO_MODE && userId === 'demo-user-1') {
      // Demo Mode: Return demo events hosted by the demo user from mock data
      console.log('Demo Mode: Fetching demo host events for user:', userId);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Filter mock events hosted by the demo user
      const demoHostEvents = mockEvents.filter(event => event.host.id === userId);
      
      // Transform to match Event interface from types/event.ts
      const transformedEvents = demoHostEvents.map(mockEvent => ({
        id: mockEvent.id,
        title: mockEvent.title,
        description: mockEvent.description,
        category: mockEvent.category,
        date_time: `${mockEvent.date}T${mockEvent.time}:00Z`,
        max_participants: mockEvent.maxParticipants,
        image_url: mockEvent.imageUrl,
        host_id: mockEvent.host.id,
        status: 'approved' as const,
        created_at: mockEvent.createdAt,
        updated_at: mockEvent.createdAt,
        address: mockEvent.location.address,
        city: mockEvent.location.address.split(',').pop()?.trim() || '',
        participants_count: mockEvent.currentParticipants,
        host: {
          id: mockEvent.host.id,
          full_name: mockEvent.host.name,
          email: mockEvent.host.email,
          avatar_url: mockEvent.host.avatarUrl
        }
      }));
      
      console.log('Demo Mode: Returning', transformedEvents.length, 'demo host events');
      return transformedEvents;
    }

    try {
      console.log('Fetching host events for user:', userId);
      
      // Fetch events without participants join to avoid RLS issues
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host:users!events_host_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('host_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching host events:', error);
        throw error;
      }

      const events = data || [];
      console.log('Host events fetched:', events.length);

      // Fetch participant counts for each event
      if (events.length > 0) {
        try {
          const eventIds = events.map(event => event.id);
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

          // Add participant counts to events
          const eventsWithCounts = events.map(event => ({
            ...event,
            participants_count: participantCounts.find(pc => pc.eventId === event.id)?.count || 0
          }));

          return eventsWithCounts;
        } catch (error) {
          console.error('Error fetching participant counts for host events:', error);
          // Fallback: return events with zero counts
          return events.map(event => ({
            ...event,
            participants_count: 0
          }));
        }
      }

      return events.map(event => ({
        ...event,
        participants_count: 0
      }));
      
    } catch (error) {
      console.error('Error in getHostEvents:', error);
      throw error;
    }
  },
  // Get event participants - Uses public SELECT policy "participants_for_approved_events"
  async getEventParticipants(eventId: string) {
    // Always try demo mode first if eventId starts with 'demo-' or is a demo event  
    const isDemoEvent = eventId.startsWith('demo-') || ['demo-event-1', 'demo-event-2', 'event1', 'event2', 'event3', 'event4'].includes(eventId);
    
    if (DEMO_MODE || isDemoEvent) {
      // Demo Mode: Return mock participants
      console.log('Demo Mode: Fetching mock participants for event:', eventId);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock participants based on event
      const mockParticipants = [
        {
          id: 'participant-1',
          user_id: 'user2',
          status: 'joined',
          joined_at: '2025-07-15T10:00:00Z',
          user: {
            id: 'user2',
            full_name: 'Bob Johnson',
            avatar_url: 'https://i.pravatar.cc/150?img=2'
          }
        },
        {
          id: 'participant-2',
          user_id: 'user3',
          status: 'joined',
          joined_at: '2025-07-16T14:30:00Z',
          user: {
            id: 'user3',
            full_name: 'Charlie Brown',
            avatar_url: 'https://i.pravatar.cc/150?img=3'
          }
        },
        {
          id: 'participant-3',
          user_id: 'demo-user-1',
          status: 'joined',
          joined_at: '2025-07-17T09:15:00Z',
          user: {
            id: 'demo-user-1',
            full_name: 'Demo User',
            avatar_url: 'https://i.pravatar.cc/150?img=0'
          }
        }
      ];
      
      console.log('Demo Mode: Returning', mockParticipants.length, 'mock participants');
      return mockParticipants;
    }

    try {
      console.log('Fetching participants for event:', eventId);

      // Get participants with user data using a join
      // The RLS policy "participants_for_approved_events" should handle the approved event check
      const { data: participants, error: participantError } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          status,
          joined_at,
          user:users(id, full_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .eq('status', 'joined')
        .order('joined_at', { ascending: true });

      if (participantError) {
        console.error('Error fetching participants (raw):', participantError);
        console.error('Error fetching participants (stringified):', JSON.stringify(participantError, null, 2));
        // Return empty array instead of throwing to prevent UI breakage
        return [];
      }

      console.log('Participants fetched successfully:', participants?.length || 0);

      if (!participants || participants.length === 0) {
        return [];
      }

      // Transform the data to ensure proper structure
      const formattedParticipants = participants.map((participant) => {
        // Handle the case where user might be an array (Supabase sometimes returns joins as arrays)
        const userData = Array.isArray(participant.user) ? participant.user[0] : participant.user;
        
        return {
          id: participant.id,
          user_id: participant.user_id,
          status: participant.status,
          joined_at: participant.joined_at,
          user: userData || {
            id: participant.user_id,
            full_name: 'Unknown User',
            avatar_url: null
          }
        };
      });

      console.log('Participants formatted successfully:', formattedParticipants.length);
      return formattedParticipants;

    } catch (error) {
      console.error('Error in getEventParticipants:', error);
      // Return empty array instead of throwing to prevent UI breakage
      return [];
    }
  },

  // Get event messages
  async getEventMessages(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:users(id, full_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getEventMessages:', error);
      throw error;
    }
  },
  
  // Add host as participant when creating event
  async addHostAsParticipant(eventId: string, hostId: string): Promise<void> {
    console.log('Adding host as participant:', { eventId, hostId });

    // First check if host is already a participant
    const { data: existingParticipant, error: checkError } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', hostId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing host participation:', checkError);
      throw checkError;
    }

    // If host already exists as participant, don't add again
    if (existingParticipant) {
      console.log('Host already exists as participant, skipping duplicate addition');
      return;
    }

    // Add host as participant using INSERT policy
    const { error } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: hostId,
        status: 'joined'
      });

    if (error) {
      console.error('Error adding host as participant:', error);
      throw error;
    }

    console.log('Successfully added host as participant');
  },

  // Update event
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    console.log('Attempting to update event:', eventId);
    
    // First, ensure we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error during update:', sessionError);
      throw new Error('Authentication session expired. Please log in again.');
    }

    // Prepare the update data with timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data: updatedEvent, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    if (!updatedEvent) {
      throw new Error('Event not found or could not be updated');
    }

    console.log('Event updated successfully:', updatedEvent.id);
    return updatedEvent;
  },

  // Cancel event
  async cancelEvent(eventId: string): Promise<void> {
    console.log('Cancelling event:', eventId);
    
    const { error } = await supabase
      .from('events')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error cancelling event:', error);
      throw error;
    }

    console.log('Event cancelled successfully');
  },

  // Delete event permanently
  async deleteEvent(eventId: string): Promise<void> {
    console.log('Deleting event:', eventId);
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }

    console.log('Event deleted successfully');
  },

  // Get participant count for an event - Uses public SELECT policy
  async getParticipantCount(eventId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'joined');

      if (error) {
        console.error('Error fetching participant count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getParticipantCount:', error);
      return 0;
    }
  }
};
