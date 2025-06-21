'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import UserProfile from '@/components/UserProfile';

interface Props {
  params: {
    id: string;
  };
}

export default function ProfilePage({ params }: Props) {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        console.log('Fetching profile for user ID:', params.id);
        console.log('Current user:', currentUser?.id);
        
        // First, try to get just the basic user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', params.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          console.error('Error details:', JSON.stringify(profileError, null, 2));
          setError('Profile not found');
          setLoading(false);
          return;
        }

        if (!profileData) {
          console.log('No profile found for user ID:', params.id);
          setError('Profile not found');
          setLoading(false);
          return;
        }

        console.log('Profile found:', profileData.full_name);

        // Get participated events separately
        const { data: participatedEvents } = await supabase
          .from('event_participants')
          .select(`
            status,
            created_at,
            event:events(
              id,
              title,
              description,
              date_time,
              location,
              image_url,
              status,
              host:users!events_host_id_fkey(
                id,
                full_name
              )
            )
          `)
          .eq('user_id', params.id)
          .eq('status', 'joined');

        // Add participated events to profile
        const profileWithEvents = {
          ...profileData,
          participated_events: participatedEvents || []
        };

        setProfile(profileWithEvents);

        // Also get events hosted by this user
        const { data: hostedEventsData } = await supabase
          .from('events')
          .select('*')
          .eq('host_id', params.id)
          .order('created_at', { ascending: false });

        setHostedEvents(hostedEventsData || []);
        setLoading(false);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchProfile();
    }
  }, [params.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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
    <div className="min-h-screen bg-gray-50">
      <UserProfile 
        profile={profile} 
        hostedEvents={hostedEvents}
        currentUser={currentUser}
      />
    </div>
  );
}
