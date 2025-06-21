'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import UserProfile from '@/components/UserProfile';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default function ProfilePage({ params }: Props) {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading, initialize } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize auth store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Resolve params (Next.js 15 requirement)
  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params;
      setUserId(resolvedParams.id);
    }
    resolveParams();
  }, [params]);

  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;
      
      try {
        console.log('Fetching profile for user ID:', userId);
        console.log('Current user:', currentUser?.id);
        console.log('Auth loading:', authLoading);
        
        // First, try to get just the basic user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          console.error('Error details:', JSON.stringify(profileError, null, 2));
          setError('Profile not found');
          setLoading(false);
          return;
        }

        if (!profileData) {
          console.log('No profile found for user ID:', userId);
          setError('Profile not found');
          setLoading(false);
          return;
        }

        console.log('Profile found:', profileData.full_name);        // Get participated events separately
        const { data: participatedEvents, error: participatedError } = await supabase
          .from('event_participants')
          .select(`
            *,
            events(*)
          `)
          .eq('user_id', userId)
          .eq('status', 'joined');

        console.log('Participated events query result:', participatedEvents);
        console.log('Participated events error:', participatedError);        // Filter for only events with approved/concluded/cancelled status and exclude hosted events
        const joinedEvents = participatedEvents
          ?.filter(pe => 
            pe.events && 
            ['approved', 'concluded', 'cancelled'].includes(pe.events.status) &&
            pe.events.host_id !== userId  // Exclude events hosted by the user
          )
          ?.map(pe => ({
            status: pe.status,
            joined_at: pe.joined_at,
            event: pe.events
          })) || [];        console.log('Filtered joined events (excluding hosted):', joinedEvents);

        // Get participant counts for joined events
        if (joinedEvents && joinedEvents.length > 0) {
          const joinedEventIds = joinedEvents.map(je => je.event.id);
          
          // Get participant counts for each joined event
          const joinedParticipantCounts = await Promise.all(
            joinedEventIds.map(async (eventId) => {
              const { count } = await supabase
                .from('event_participants')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', eventId)
                .eq('status', 'joined');
              
              return { eventId, count: count || 0 };
            })
          );

          // Add participant counts to joined events
          const joinedEventsWithCounts = joinedEvents.map(je => ({
            ...je,
            event: {
              ...je.event,
              participants_count: joinedParticipantCounts.find(pc => pc.eventId === je.event.id)?.count || 0
            }
          }));

          // Update profile with joined events that have participant counts
          const profileWithEvents = {
            ...profileData,
            participated_events: joinedEventsWithCounts
          };
          setProfile(profileWithEvents);
        } else {
          // Add participated events to profile
          const profileWithEvents = {
            ...profileData,
            participated_events: joinedEvents
          };
          setProfile(profileWithEvents);
        }// Also get events hosted by this user (approved, concluded, and cancelled events)
        const { data: hostedEventsData, error: hostedError } = await supabase
          .from('events')
          .select('*')
          .eq('host_id', userId)
          .in('status', ['approved', 'concluded', 'cancelled'])
          .order('created_at', { ascending: false });

        console.log('Hosted events query result:', hostedEventsData);
        console.log('Hosted events error:', hostedError);

        // Get participant counts for hosted events
        if (hostedEventsData && hostedEventsData.length > 0) {
          const eventIds = hostedEventsData.map(event => event.id);
          
          // Get participant counts for each event
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
          const hostedEventsWithCounts = hostedEventsData.map(event => ({
            ...event,
            participants_count: participantCounts.find(pc => pc.eventId === event.id)?.count || 0
          }));

          setHostedEvents(hostedEventsWithCounts);
        } else {
          setHostedEvents([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    }

    // Only fetch when we have userId and auth is not loading
    if (userId && !authLoading) {
      fetchProfile();
    }
  }, [userId, authLoading, currentUser]);

  if (authLoading || loading || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">The profile you're looking for doesn't exist.</p>
          <button 
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <UserProfile 
          profile={profile} 
          hostedEvents={hostedEvents}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
