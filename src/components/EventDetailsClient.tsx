"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ArrowLeft, 
  Edit, 
  X,
  MessageCircle,
  Loader2,
  AlertCircle,
  Map as MapIcon,
  Trash2,
  RefreshCw,
  Home,
  Plus,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Event } from '@/lib/types/event';
import { useAuthStore } from '@/lib/stores/authStore';
import { 
  useEventDetails, 
  useEventParticipants, 
  useIsParticipant,
  useJoinEvent, 
  useLeaveEvent, 
  useCancelEvent,
  useDeleteEvent
} from '@/lib/hooks/useEvents';
import { useQueryClient } from '@tanstack/react-query';
import EventChatSimple from '@/components/EventChatSimple';
import toast from 'react-hot-toast';

interface EventDetailsClientProps {
  eventId: string;
  initialEvent: Event | null;
}

export default function EventDetailsClient({ eventId, initialEvent }: EventDetailsClientProps) {  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [chatConnectionStatus, setChatConnectionStatus] = useState('connecting');
  
  // Queries
  const { data: event, isLoading: eventLoading, error: eventError } = useEventDetails(eventId, initialEvent || undefined);
  const { data: participants = [], isLoading: participantsLoading } = useEventParticipants(eventId);
  const { data: isParticipant = false, isLoading: participationLoading } = useIsParticipant(eventId);

  // --- BEGIN MODIFICATION: Robust host data retrieval ---
  // Find the host's participant record if event.host is not populated but event.host_id is.
  const hostParticipantRecord = !event?.host && event?.host_id 
    ? participants.find(p => p.user?.id === event.host_id) 
    : null;

  // Use event.host if available, otherwise fallback to the user object from the host's participant record.
  const displayHost = event?.host || (hostParticipantRecord ? hostParticipantRecord.user : null);
  const hostFullName = displayHost?.full_name;
  const hostAvatarUrl = displayHost?.avatar_url;
  // --- END MODIFICATION ---
  
  // Function to refresh participants data
  const refreshParticipants = () => {
    queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participants'] });
    queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participation'] });
    toast.success('Refreshing participants...');
  };
  
  // Mutations
  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();
  const cancelEventMutation = useCancelEvent();
  const deleteEventMutation = useDeleteEvent();  // Calculate participant counts correctly
  // Host is shown separately, participants are everyone else
  const actualParticipants = participants.filter((p: any) => p.user?.id !== event?.host_id);
  const actualParticipantCount = actualParticipants.length;
  
  // Check if host is in participants list
  const hostIsParticipant = participants.some((p: any) => p.user?.id === event?.host_id);
    // Use direct event status
  const isCancelled = event?.status === 'cancelled';  const statusText = event?.status === 'approved' ? 'Live' : 
                    event?.status === 'concluded' ? 'Concluded' : 
                    event?.status === 'cancelled' ? 'Cancelled' : 
                    event?.status === 'pending_approval' ? 'Pending Approval' :
                    event?.status === 'rejected' ? 'Rejected' :
                    event?.status || 'Unknown';const statusColor = event?.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                     event?.status === 'concluded' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                     event?.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-300' :
                     event?.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                     event?.status === 'rejected' ? 'bg-red-200 text-red-900 border-red-400' :
                     'bg-gray-100 text-gray-800 border-gray-300';
  
  // Total attendees = host + participants (if host not already counted in participants)
  // This logic remains sound: if host is in participants array, they are counted. 
  // If not, but event.host_id exists, we assume a host exists and add 1.
  // The crucial part is that event.host_id must be reliable for this count.
  const totalAttendees = hostIsParticipant ? participants.length : (event?.host_id ? participants.length + 1 : participants.length);
  
  // Handle loading state
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading event details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state (event not found or access denied)
  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
              <p className="text-gray-600 mb-4">
                This event doesn't exist or you don't have permission to view it.
              </p>
              <div className="space-x-4">
                <Link href="/">
                  <Button>Back to Events</Button>
                </Link>
                {user && (
                  <Link href="/my-events">
                    <Button variant="outline">My Events</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const eventDate = new Date(event.date_time);
  const isHost = user?.id === event.host_id;
  const isPastEvent = eventDate < new Date();
  
  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | null | undefined, formatStr: string, fallback: string = 'Unknown') => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return fallback;
      return format(date, formatStr);
    } catch (error) {
      console.warn('Date formatting error:', error);
      return fallback;
    }
  };
  
  const handleJoinEvent = () => {
    if (!user) {
      toast.error('Please log in to join events');
      return;
    }
    joinEventMutation.mutate({ eventId });
  };

  const handleLeaveEvent = () => {
    if (!user) return;
    leaveEventMutation.mutate({ eventId });
  };  const handleCancelEvent = () => {
    if (!user) {
      toast.error('Please log in to cancel events');
      return;
    }

    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
      return;
    }

    console.log('User confirmed event cancellation:', eventId);
    cancelEventMutation.mutate({ eventId });
  };
  const handleDeleteEvent = () => {
    if (!user) {
      toast.error('Please log in to delete events');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${event?.title}"? This action cannot be undone and will remove all event data including participants, messages, and the event image.`)) {
      return;
    }

    console.log('User confirmed event deletion:', eventId);
    deleteEventMutation.mutate({ eventId }, {
      onSuccess: () => {
        // Redirect to My Events page after successful deletion
        router.push('/my-events');
      }
    });
  };

  const joinButtonLoading = joinEventMutation.isPending || leaveEventMutation.isPending;  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Takes full width on mobile, 2/3 on desktop */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Header */}
              <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                {/* Event Image */}
                {event.image_url && (
                  <div className="relative h-64 md:h-80 overflow-hidden">
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    {isCancelled && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                        <div className="text-center text-white">
                          <X className="w-16 h-16 mx-auto mb-2" />
                          <p className="text-xl font-bold">Event Cancelled</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}                <CardContent className={`px-6 pb-0 md:pb-6 ${event.image_url ? 'pt-4' : 'pt-6'}`}>
                  {/* Status Alert */}
                  {isCancelled && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        This event has been cancelled by the host.
                      </AlertDescription>
                    </Alert>
                  )}                  {/* Category and Status Badges */}
                  <div className="mb-4 -mt-2 flex items-center gap-3">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {event.category}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={statusColor}
                    >
                      {statusText}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {event.title}
                  </h1>                  {/* Event Details */}                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-8">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{safeFormatDate(event.date_time, 'EEEE, MMMM dd, yyyy')}</p>
                        <p className="text-sm">{safeFormatDate(event.date_time, 'h:mm a')}</p>
                      </div>
                    </div>                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-sm">{event.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-600">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">City</p>
                        <p className="text-sm">{event.city}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6 -mt-4">
                    <h3 className="text-lg font-semibold mb-2">About this event</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                  </div>

                  {/* Action Buttons */}
                  {!isCancelled && !isPastEvent && (
                    <div className="-mb-2 flex flex-wrap gap-3">
                      {user ? (                        <>                          {isHost ? (
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => router.push(`/event/${eventId}/edit`)}
                              >
                                Edit Event
                              </Button>                              <Button 
                                variant="destructive" 
                                onClick={handleCancelEvent}
                                disabled={cancelEventMutation.isPending}
                                className="hover:bg-red-800"
                              >
                                {cancelEventMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Cancel Event"
                                )}
                              </Button>
                              <Button 
                                variant="destructive" 
                                onClick={handleDeleteEvent}
                                disabled={deleteEventMutation.isPending}
                                title="Delete event permanently"
                                className="hover:bg-red-900"
                              >
                                {deleteEventMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Delete"
                                )}
                              </Button>
                            </div>
                          ) : isParticipant ? (
                            <Button 
                              variant="outline" 
                              onClick={handleLeaveEvent}
                              disabled={joinButtonLoading || participationLoading}
                              className="flex-1"
                            >
                              {joinButtonLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <X className="w-4 h-4 mr-2" />
                              )}
                              Leave Event
                            </Button>                          ) : (
                            <Button 
                              onClick={handleJoinEvent}
                              disabled={joinButtonLoading || participationLoading || totalAttendees >= event.max_participants}
                              className="flex-1"
                            >
                              {joinButtonLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Users className="w-4 h-4 mr-2" />
                              )}
                              {totalAttendees >= event.max_participants ? 'Event Full' : 'Join Event'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Link href="/login" className="flex-1">
                          <Button className="w-full">
                            <Users className="w-4 h-4 mr-2" />
                            Login to Join
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}

                  {isPastEvent && (
                    <Alert className="mt-4">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        This event has already taken place.
                      </AlertDescription>
                    </Alert>
                  )}                </CardContent>
              </Card>              {/* Mobile Participants Section - Only visible on mobile */}
              <div className="lg:hidden">
                <Card className="-mt-4 -mb-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-xl">
                  <div
                    className="flex items-center gap-4 w-full cursor-pointer px-6"
                    onClick={() => setIsParticipantsModalOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setIsParticipantsModalOpen(true);
                      }
                    }}
                  >
                    {displayHost && (
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={hostAvatarUrl || undefined} />
                        <AvatarFallback>
                          {hostFullName?.charAt(0) || 'H'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-medium text-gray-800">{hostFullName}</p>
                        <Badge className="bg-blue-100 text-blue-800 text-sm px-2 py-1 font-medium shrink-0">
                          Host
                        </Badge>
                      </div>
                      <p className="text-base font-medium text-blue-600">
                        See who's coming{' '}
                        <span className="font-medium text-gray-500">
                          ({totalAttendees}/{event.max_participants})
                        </span>
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Map Placeholder */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapIcon className="w-5 h-5" />
                    Event Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <MapIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Interactive Map Coming Soon
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {event.location}
                    </p>
                    <p className="text-sm text-gray-500">
                      Map integration with event location will be available soon.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>            {/* Sidebar - Participants & Event Details (Hidden on mobile, fixed on desktop) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Participants Section */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Participants ({totalAttendees}/{event.max_participants})
                    </CardTitle>
                  </CardHeader>                  <CardContent>
                    {participantsLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {/* Host First */}
                        {/* --- BEGIN MODIFICATION: Use displayHost for sidebar host display --- */}
                        {displayHost && (
                          <Link href={`/profile/${displayHost.id}`} className="block">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={hostAvatarUrl || undefined} /> {/* Ensure src is string or undefined */
                                }
                                <AvatarFallback>
                                  {hostFullName?.charAt(0) || 'H'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0"> {/* Added flex-1 min-w-0 for truncation */}
                                <p className="font-medium text-sm truncate">{hostFullName}</p>
                                <p className="text-xs text-blue-600 font-medium">Host</p>
                              </div>
                            </div>
                          </Link>
                        )}
                        {/* --- END MODIFICATION --- */}

                        {/* Participants (excluding host) */}
                        {actualParticipantCount === 0 && displayHost ? (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">No other participants yet</p>
                          </div>
                        ) : actualParticipantCount === 0 && !displayHost ? (
                          <div className="text-center py-4 text-gray-500">
                              <p className="text-sm">No participants yet</p>
                          </div>
                        ) : (
                          actualParticipants.map((participant) => {
                            // Ensure participant.user exists before trying to access its properties
                            if (!participant.user) return null; 
                            return (
                              <Link key={participant.id} href={`/profile/${participant.user.id}`} className="block">
                                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-200 transition-colors cursor-pointer">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={participant.user.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {participant.user.full_name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{participant.user.full_name}</p>
                                    <p className="text-xs text-gray-500">
                                      Joined {safeFormatDate(participant.joined_at, 'MMM dd')}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}                  </CardContent>
                </Card>
              </div>            </div>
          </div>
        </div>
      </div>

      {/* Participants Modal - Mobile */}
      {isParticipantsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({totalAttendees}/{event.max_participants})
              </h2>
              <Button
                onClick={() => setIsParticipantsModalOpen(false)}
                variant="ghost"
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {participantsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-gray-500 mt-2">Loading participants...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Host First */}
                  {displayHost && (
                    <Link href={`/profile/${displayHost.id}`} className="block">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-gray-200 transition-colors">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={hostAvatarUrl || undefined} />
                          <AvatarFallback>
                            {hostFullName?.charAt(0) || 'H'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{hostFullName}</p>
                          <p className="text-xs text-blue-600 font-medium">Host</p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Participants (excluding host) */}
                  {actualParticipantCount === 0 && displayHost ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No other participants yet</p>
                    </div>
                  ) : actualParticipantCount === 0 && !displayHost ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No participants yet</p>
                    </div>
                  ) : (
                    actualParticipants.map((participant) => {
                      if (!participant.user) return null;
                      return (
                        <Link key={participant.id} href={`/profile/${participant.user.id}`} className="block">
                          <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={participant.user.avatar_url || undefined} />
                              <AvatarFallback>
                                {participant.user.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{participant.user.full_name}</p>
                              <p className="text-xs text-gray-500">
                                Joined {safeFormatDate(participant.joined_at, 'MMM dd')}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - visible for logged-in users */}
      {user && !isCancelled && (        <>          <Button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 rounded-full w-14 h-14 shadow-lg"
            size="lg"
          >
            <MessageCircle className="w-6 h-6" />          </Button>          {/* Chat Modal */}
          {isChatOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              {/* Mobile: Modal, Desktop: Right side */}
              <div className="bg-background w-full rounded-lg max-h-[90vh] md:w-[80vh] md:h-[95vh] md:max-h-none md:fixed md:right-4 md:top-1/2 md:-translate-y-1/2 relative flex flex-col">                <Button
                  onClick={() => setIsChatOpen(false)}
                  className="absolute top-1 md:top-2 right-2 z-10"
                  variant="ghost"
                  size="icon"
                >
                  <X className="h-5 w-5" />
                </Button>
                <div className="flex-1 pt-0">
                  <EventChatSimple eventId={eventId} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}