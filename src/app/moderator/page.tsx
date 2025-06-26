'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import ModeratorDashboard from '@/components/ModeratorDashboard';

export default function ModeratorPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Redirect if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }    // Fetch user role from database
    const fetchUserRole = async () => {
      try {
        console.log('Fetching role for user ID:', user.id);
        
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        console.log('Role query result:', { data, error });

        if (error) {
          console.error('Error fetching user role:', error);
          // Don't redirect immediately, show the error
          setRoleLoading(false);
          return;
        }

        console.log('User role:', data.role);
        setUserRole(data.role);
        setRoleLoading(false);

        // Redirect if not a moderator
        if (data.role !== 'moderator') {
          console.log('User is not a moderator, redirecting...');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user, isLoading, router]);

  // Show loading while checking auth or role
  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  // Don't render anything if user is not authorized (will redirect)
  if (!user || userRole !== 'moderator') {
    // Show debug info if user exists but isn't moderator
    if (user && !roleLoading && userRole) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
            <p className="text-gray-700 mb-2">You need moderator access to view this page.</p>
            <p className="text-sm text-gray-500 mb-4">Current role: {userRole || 'none'}</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }
    return null;
  }  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <ModeratorDashboard />
    </div>
  );
}
