"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Plus,
  ArrowLeft,
  Edit,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Home,
  User,
  LogOut,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/lib/stores/authStore';
import { useHostEvents, useDeleteEvent, useCancelEvent } from '@/lib/hooks/useEvents';
import { Event } from '@/lib/types/event';

export default function MyEventsPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();  const { data: events = [], isLoading, error } = useHostEvents();
  const deleteEventMutation = useDeleteEvent();
  const cancelEventMutation = useCancelEvent();

  const handleSignOut = async () => {
    try {
      await useAuthStore.getState().signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">
                {authLoading ? 'Checking authentication...' : 'Redirecting to login...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading your events...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }  const getStatusBadge = (event: Event) => {
    const status = event.status || 'pending';
    
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;      case 'concluded':
        return <Badge className="bg-purple-100 text-purple-800">Concluded</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      case 'needs_modification':
        return <Badge className="bg-orange-100 text-orange-800">Needs Modification</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'cancelled_by_host':
        return <Badge variant="destructive">Cancelled by Host</Badge>;
      case 'cancelled_by_moderator':
        return <Badge variant="destructive">Cancelled by Moderator</Badge>;      case 'rejected':
        return <Badge className="bg-red-200 text-red-900 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };  const getStatusIcon = (event: Event) => {
    const status = event.status || 'pending';
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'concluded':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'pending':
      case 'pending_approval':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'needs_modification':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'cancelled':
      case 'cancelled_by_host':
      case 'cancelled_by_moderator':
      case 'rejected':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };// Group events by status
  const groupedEvents = events.reduce((acc, event) => {
    const status = event.status || 'pending';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
  const handleDeleteEvent = (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${eventTitle}"? This action cannot be undone and will remove all event data including participants and messages.`)) {
      return;
    }
    deleteEventMutation.mutate({ eventId });
  };

  const handleCancelEvent = (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to cancel "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }
    cancelEventMutation.mutate({ eventId });
  };
  const EventCard = ({ event }: { event: Event }) => {
    const eventDate = new Date(event.date_time);
    const isPastEvent = eventDate < new Date();
    const participantCount = event.participants_count || event.participants?.filter(p => p.status === 'joined').length || 0;const [imageError, setImageError] = useState(false);

    const handleCardClick = () => {
      router.push(`/event/${event.id}`);
    };

    return (
      <Card 
        className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm border-0 overflow-hidden cursor-pointer p-0"
        onClick={handleCardClick}
      >
        {/* Event Image */}
        {event.image_url && !imageError ? (
          <div className="relative h-48 w-full">
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-gray-600 font-medium">{event.category}</p>
            </div>
          </div>        )}          <CardContent className="px-3 pb-1 -mt-5">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{event.title}</h3>              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(event)}
                {getStatusBadge(event)}
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {event.category}
                </Badge>
              </div>
            </div>
          </div>          <div className="space-y-1 mt-1">            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{format(eventDate, 'MMM dd, yyyy')}</span>
              </div>
              {event.city && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="truncate">{event.city}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{participantCount} / {event.max_participants}</span>
              </div>            </div>            <div className="text-sm text-gray-600 ml-6 -mt-1">{format(eventDate, 'h:mm a')}</div></div>

          <div className="flex gap-3 mt-1 mb-1" onClick={(e) => e.stopPropagation()}>
            {event.status !== 'cancelled' && (
              <Link href={`/event/${event.id}/edit`}>
                <Button variant="outline" size="sm" title="Edit event">
                  Edit Event
                </Button>
              </Link>
            )}
              {event.status !== 'cancelled' && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleCancelEvent(event.id, event.title)}
                disabled={cancelEventMutation.isPending}
                title="Cancel event"
                className="hover:bg-red-800"
              >
                {cancelEventMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Cancel Event"
                )}
              </Button>
            )}
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => handleDeleteEvent(event.id, event.title)}
              disabled={deleteEventMutation.isPending}
              title="Delete event permanently"
              className="hover:bg-red-900"
            >
              {deleteEventMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete Event"
              )}
            </Button>
          </div>

          {isPastEvent && event.status === 'approved' && (
            <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              This event has already taken place
            </div>
          )}        </CardContent>
      </Card>
    );  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pt-6 pb-8">

        {/* Error State */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load your events. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!error && events.length === 0 && (
          <Card className="text-center py-12 bg-white/80 backdrop-blur-sm border-0">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-6">You haven't created any events yet. Start by creating your first event!</p>
              <Link href="/create-event">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Events by Status */}
        {events.length > 0 && (
          <div className="space-y-8">
            {/* Active Events */}
            {groupedEvents.approved && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Active Events ({groupedEvents.approved.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedEvents.approved.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Concluded Events */}
            {groupedEvents.concluded && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                  Concluded Events ({groupedEvents.concluded.length})
                </h2>
                <Alert className="mb-4 border-purple-200 bg-purple-50">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800">
                    These events have been completed and are no longer active.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedEvents.concluded.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Events */}
            {(groupedEvents.pending || groupedEvents.pending_approval || groupedEvents.needs_modification) && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-yellow-600" />
                  Pending Approval ({
                    (groupedEvents.pending?.length || 0) + 
                    (groupedEvents.pending_approval?.length || 0) + 
                    (groupedEvents.needs_modification?.length || 0)
                  })
                </h2>
                <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    These events are waiting for moderator approval before they become visible to the public.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    ...(groupedEvents.pending || []),
                    ...(groupedEvents.pending_approval || []),
                    ...(groupedEvents.needs_modification || [])
                  ].map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}            {/* Cancelled Events */}
            {(groupedEvents.cancelled || groupedEvents.cancelled_by_host || groupedEvents.cancelled_by_moderator) && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-600" />
                  Cancelled Events ({
                    (groupedEvents.cancelled?.length || 0) + 
                    (groupedEvents.cancelled_by_host?.length || 0) + 
                    (groupedEvents.cancelled_by_moderator?.length || 0)
                  })
                </h2>
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <X className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    These events have been cancelled and are no longer active.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    ...(groupedEvents.cancelled || []),
                    ...(groupedEvents.cancelled_by_host || []),
                    ...(groupedEvents.cancelled_by_moderator || [])
                  ].map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Events */}
            {groupedEvents.rejected && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-700" />
                  Rejected Events ({groupedEvents.rejected.length})
                </h2>
                <Alert className="mb-4 border-red-300 bg-red-100">
                  <X className="h-4 w-4 text-red-700" />
                  <AlertDescription className="text-red-900">
                    These events were rejected by moderators and did not meet approval requirements.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedEvents.rejected.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {events.length > 0 && (
          <Card className="mt-8 bg-white/80 backdrop-blur-sm border-0">
            <CardHeader>
              <CardTitle>Your Event Statistics</CardTitle>
            </CardHeader>            <CardContent>              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{events.length}</p>
                  <p className="text-sm text-gray-600">Total Events</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{groupedEvents.concluded?.length || 0}</p>
                  <p className="text-sm text-gray-600">Concluded</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{groupedEvents.approved?.length || 0}</p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {(groupedEvents.pending?.length || 0) + 
                     (groupedEvents.pending_approval?.length || 0) + 
                     (groupedEvents.needs_modification?.length || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Pending Approval</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {(groupedEvents.cancelled?.length || 0) + 
                     (groupedEvents.cancelled_by_host?.length || 0) + 
                     (groupedEvents.cancelled_by_moderator?.length || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Cancelled</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {groupedEvents.rejected?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}