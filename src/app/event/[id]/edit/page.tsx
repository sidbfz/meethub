"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEventDetails } from '@/lib/hooks/useEvents';
import { useAuthStore } from '@/lib/stores/authStore';
import CreateEventForm from '@/components/CreateEventForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertCircle, Home, Calendar, User, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const eventId = params.id as string;

  // Fetch event details
  const { data: event, isLoading, error } = useEventDetails(eventId);

  // Check if user is authenticated and is the host
  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth state to be determined

    if (!user) {
      toast.error('Please log in to edit events');
      router.push('/login');
      return;
    }

    if (event && user.id !== event.host_id) {
      toast.error('You can only edit events you created');
      router.push(`/event/${eventId}`);
      return;
    }
  }, [user, event, eventId, router, isAuthLoading]);  // Loading state
  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading event details...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
                  <p className="text-gray-600 mb-4">
                    The event you're trying to edit could not be found or you don't have permission to edit it.
                  </p>
                  <Link href="/">
                    <Button>Return to Events</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if user is the host (additional security check)
  if (user && user.id !== event.host_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-gray-600 mb-4">
                    You can only edit events you created.
                  </p>
                  <Link href={`/event/${eventId}`}>
                    <Button>View Event</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <CreateEventForm 
            eventId={eventId}
            initialData={event}
          />
        </div>
      </div>
    </div>
  );
}