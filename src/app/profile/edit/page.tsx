'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import EditProfileForm from '@/components/EditProfileForm';

export default function EditProfilePage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      // Redirect if not authenticated
      if (!authLoading && !currentUser) {
        console.log('No authenticated user, redirecting to login');
        router.push('/login');
        return;
      }

      if (!currentUser || authLoading) {
        return; // Still loading auth or no user yet
      }

      try {
        console.log('Fetching profile for edit - User ID:', currentUser.id);

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile for edit:', profileError);
          setError('Could not load profile');
          setLoading(false);
          return;
        }

        if (!profileData) {
          console.log('No profile found for user:', currentUser.id);
          setError('Profile not found');
          setLoading(false);
          return;
        }

        console.log('Profile loaded for edit:', profileData.full_name);
        setProfile(profileData);
        setLoading(false);
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    }

    fetchProfile();
  }, [currentUser, authLoading, router]);

  // Show loading while checking auth or loading profile
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error if profile couldn't be loaded
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Profile</h1>
          <p className="text-gray-600">Update your profile information</p>
        </div>
        
        {profile && (
          <EditProfileForm profile={profile} />
        )}
      </div>
    </div>
  );
}
