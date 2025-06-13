import { supabase } from '@/lib/supabase/client';
import { Event, EventFilters, EventsResponse } from '@/lib/types/event';

export const EVENTS_PER_PAGE = 12;

export const eventsService = {
  // Fetch approved events with infinite scroll
  async getApprovedEvents(
    pageParam: number = 0,
    filters: EventFilters = {}
  ): Promise<EventsResponse> {
    let query = supabase
      .from('events')
      .select(`
        *,
        host:users!events_host_id_fkey(id, full_name, email)
      `)
      .eq('status', 'approved')
      .gte('date_time', new Date().toISOString()) // Only future events
      .order('date_time', { ascending: true })
      .range(pageParam * EVENTS_PER_PAGE, (pageParam + 1) * EVENTS_PER_PAGE - 1);

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
    }

    if (filters.date) {
      const startDate = new Date(filters.date);
      const endDate = new Date(filters.date);
      endDate.setDate(endDate.getDate() + 1);
      
      query = query
        .gte('date_time', startDate.toISOString())
        .lt('date_time', endDate.toISOString());
    }    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      throw new Error(`Failed to fetch events: ${error.message || JSON.stringify(error) || 'Unknown database error'}`);
    }

    const events = data || [];
    const hasMore = events.length === EVENTS_PER_PAGE;
    const nextCursor = hasMore ? pageParam + 1 : null;

    return {
      events,
      nextCursor,
      hasMore,
    };
  },
  // Join an event
  async joinEvent(eventId: string, userId: string): Promise<void> {
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
      // User exists, update status to 'joined'
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
      // New participant, insert new record
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
  },  // Leave an event
  async leaveEvent(eventId: string, userId: string): Promise<void> {
    // First check if the user is the host
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('host_id')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw new Error('Event not found');
    }

    // Prevent host from leaving their own event
    if (eventData.host_id === userId) {
      throw new Error('Event hosts cannot leave their own events. You can cancel the event instead.');
    }

    const { error } = await supabase
      .from('event_participants')
      .update({ status: 'left' })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving event:', error);
      throw error;
    }
  },// Check if user is participant
  async isParticipant(eventId: string, userId: string): Promise<boolean> {
    // First check if user is the host
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

    // Otherwise, check the participants table
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

  // Get single event with participants
  async getEventDetails(eventId: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        host:users!events_host_id_fkey(id, full_name, email, avatar_url),
        participants:event_participants(
          id,
          status,
          joined_at,
          user:users(id, full_name, email, avatar_url)
        )
      `)
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event details:', error);
      throw error;
    }    return data;
  },

  // Get events hosted by user (all statuses for host management)
  async getHostEvents(userId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        host:users!events_host_id_fkey(id, full_name, email, avatar_url),
        participants:event_participants(
          id,
          status,
          joined_at,
          user:users(id, full_name, email, avatar_url)
        )
      `)
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching host events:', error);
      throw error;
    }

    return data || [];
  },

  // Get event participants
  async getEventParticipants(eventId: string) {
    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        id,
        status,
        joined_at,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('event_id', eventId)
      .eq('status', 'joined')
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      throw error;
    }

    return (data || []) as any[];
  },
  // Get event messages
  async getEventMessages(eventId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return (data || []) as any[];  },
  // Add host as participant when creating event
  async addHostAsParticipant(eventId: string, hostId: string): Promise<void> {
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

    // Add host as participant
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

    console.log('Session verified for update operation:', session.user.id);    // Add updated_at timestamp to updates and set status to pending for review
    const updatesWithTimestamp = {
      ...updates,
      status: 'pending', // Set to pending when event is updated
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('events')
      .update(updatesWithTimestamp)
      .eq('id', eventId)
      .eq('host_id', session.user.id) // Add this to satisfy RLS policy
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw new Error(error.message || 'Failed to update event');
    }

    console.log('Event updated successfully:', data.id);
    return data;
  },
  // Cancel event
  async cancelEvent(eventId: string): Promise<void> {
    console.log('Attempting to cancel event:', eventId);
    
    // First, ensure we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error during cancel:', sessionError);
      throw new Error('Authentication session expired. Please log in again.');
    }

    console.log('Session verified for cancel operation:', session.user.id);

    // Verify the user is the host of this event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('host_id, title, status')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event for cancellation:', eventError);
      throw new Error('Event not found.');
    }

    if (eventData.host_id !== session.user.id) {
      console.error('User is not the host of this event:', {
        eventHost: eventData.host_id,
        currentUser: session.user.id
      });
      throw new Error('Only the event host can cancel this event.');
    }

    if (eventData.status === 'cancelled') {
      throw new Error('Event is already cancelled.');
    }

    console.log('Authorization verified, cancelling event:', eventData.title);    // Cancel the event
    const { error } = await supabase
      .from('events')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('host_id', session.user.id); // Add this to satisfy RLS policy

    if (error) {
      console.error('Error cancelling event:', error);
      throw new Error(error.message || 'Failed to cancel event');
    }    console.log('Event cancelled successfully:', eventId);
  },

  // Delete event permanently
  async deleteEvent(eventId: string): Promise<void> {
    console.log('Attempting to delete event:', eventId);
    
    // First, ensure we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error during delete:', sessionError);
      throw new Error('Authentication session expired. Please log in again.');
    }

    console.log('Session verified for delete operation:', session.user.id);    // Verify the user is the host of this event and get the image URL
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('host_id, title, status, image_url')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event for deletion:', eventError);
      throw new Error('Event not found.');
    }

    if (eventData.host_id !== session.user.id) {
      console.error('User is not the host of this event:', {
        eventHost: eventData.host_id,
        currentUser: session.user.id
      });
      throw new Error('Only the event host can delete this event.');
    }

    console.log('Authorization verified, deleting event:', eventData.title);    // Delete event image from storage if it exists
    if (eventData.image_url) {
      try {        // Extract the file path from the URL
        // Handle different URL formats:
        // 1. https://xxxxx.supabase.co/storage/v1/object/public/events/public/filename
        // 2. events/public/filename (relative path)
        // 3. Just filename if stored as relative path
        let filePath = '';
        
        if (eventData.image_url.includes('/storage/v1/object/public/events/')) {
          // Full URL format
          const urlParts = eventData.image_url.split('/storage/v1/object/public/events/');
          filePath = urlParts[1]; // Should be "public/filename"
        } else if (eventData.image_url.includes('events/public/')) {
          // Relative path format with bucket
          const urlParts = eventData.image_url.split('events/');
          filePath = urlParts[1]; // Should be "public/filename"
        } else if (eventData.image_url.includes('public/')) {
          // Just the path within bucket
          filePath = eventData.image_url;
        } else {
          // Just filename - assume it's in public folder
          const fileName = eventData.image_url.includes('/') 
            ? eventData.image_url.split('/').pop() 
            : eventData.image_url;
          filePath = `public/${fileName}`;
        }
        
        // Remove any query parameters and decode URL encoding
        filePath = filePath.split('?')[0];
        filePath = decodeURIComponent(filePath);
        
        console.log('Attempting to delete event image:', filePath);
        console.log('Full image URL:', eventData.image_url);
        console.log('Bucket: events');
        
        const { data: removeData, error: imageError } = await supabase.storage
          .from('events')
          .remove([filePath]);
          if (imageError) {
          console.error('Error deleting event image:', {
            error: imageError,
            filePath: filePath,
            bucket: 'events',
            message: imageError.message
          });
          // Don't throw here - continue with event deletion even if image deletion fails
        } else {
          console.log('Event image deleted successfully:', filePath);
          console.log('Remove operation result:', removeData);
        }
      } catch (imageDeleteError) {
        console.error('Error during image deletion:', imageDeleteError);
        // Continue with event deletion even if image deletion fails
      }
    }

    // First delete all related participants
    const { error: participantsError } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId);

    if (participantsError) {
      console.error('Error deleting event participants:', participantsError);
      throw new Error('Failed to delete event participants');
    }

    // Then delete all related messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('event_id', eventId);

    if (messagesError) {
      console.error('Error deleting event messages:', messagesError);
      throw new Error('Failed to delete event messages');
    }

    // Finally delete the event itself
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('host_id', session.user.id); // Add this to satisfy RLS policy

    if (error) {
      console.error('Error deleting event:', error);
      throw new Error(error.message || 'Failed to delete event');
    }

    console.log('Event deleted successfully:', eventId);
  },
};
