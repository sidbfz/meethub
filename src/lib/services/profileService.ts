import { supabase } from '@/lib/supabase/client';
import { mockUsers, mockEvents } from '@/lib/mock-data';

// Portfolio Demo: Using mock data instead of Supabase
const DEMO_MODE = false;

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
    // Demo Mode: Use mock data
    const isDemoUser = userId.startsWith('demo-') || userId === 'demo-user-1' || ['user1', 'user2', 'user3', 'user4'].includes(userId);
    
    if (DEMO_MODE || isDemoUser) {
      console.log('Demo Mode: Fetching mock profile for user:', userId);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find user in mock data
      const mockUser = mockUsers.find(user => user.id === userId);
      
      if (!mockUser) {
        // Hardcoded fallback for demo user
        if (userId === 'demo-user-1') {
          return {
            id: 'demo-user-1',
            full_name: 'Demo User',
            email: 'demo@meethub.com',
            bio: 'This is a demo user account to showcase MeetHub functionality.',
            avatar_url: 'https://i.pravatar.cc/150?img=0',
            created_at: '2023-01-01T00:00:00Z',
            participated_events: []
          };
        }
        throw new Error('Profile not found');
      }
      
      // Transform to expected format
      return {
        id: mockUser.id,
        full_name: mockUser.name,
        email: mockUser.email,
        bio: mockUser.bio,
        avatar_url: mockUser.avatarUrl,
        created_at: mockUser.memberSince + 'T00:00:00Z',
        participated_events: []
      };
    }
    
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
    // Demo Mode: Use mock data
    const isDemoUser = userId.startsWith('demo-') || userId === 'demo-user-1' || ['user1', 'user2', 'user3', 'user4'].includes(userId);
    
    if (DEMO_MODE || isDemoUser) {
      console.log('Demo Mode: Fetching mock hosted events for user:', userId);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get hosted events from mock data
      const userHostedEvents = mockEvents.filter(event => event.host.id === userId);
      
      // Transform to expected format
      const transformedEvents = userHostedEvents.map(mockEvent => ({
        id: mockEvent.id,
        title: mockEvent.title,
        description: mockEvent.description,
        date_time: `${mockEvent.date}T${mockEvent.time}:00Z`,
        location: mockEvent.location.address,
        category: mockEvent.category,
        status: 'approved' as const,
        image_url: mockEvent.imageUrl,
        max_participants: mockEvent.maxParticipants,
        created_at: mockEvent.createdAt,
        host_id: mockEvent.host.id,
        participants_count: mockEvent.currentParticipants
      }));
      
      return transformedEvents;
    }
    
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
