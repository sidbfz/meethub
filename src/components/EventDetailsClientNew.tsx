"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  User, 
  ArrowLeft, 
  Edit, 
  X,
  MessageCircle,
  Loader2,
  AlertCircle,
  Map as MapIcon
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
  useEventMessages, 
  useIsParticipant,
  useJoinEvent, 
  useLeaveEvent, 
  useCancelEvent 
} from '@/lib/hooks/useEvents';
import ResponsiveChat from '@/components/ResponsiveChat';
import toast from 'react-hot-toast';

interface EventDetailsClientProps {
  eventId: string;
  initialEvent: Event;
}

export default function EventDetailsClient({ eventId, initialEvent }: EventDetailsClientProps) {
  const { user } = useAuthStore();

  // Queries
  const { data: event, isLoading: eventLoading } = useEventDetails(eventId, initialEvent);
  const { data: participants = [], isLoading: participantsLoading } = useEventParticipants(eventId);
  const { data: messages = [], isLoading: messagesLoading } = useEventMessages(eventId);
  const { data: isParticipant = false, isLoading: participationLoading } = useIsParticipant(eventId);

  // Mutations
  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();
  const cancelEventMutation = useCancelEvent();

  if (!event || eventLoading) {
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

  const eventDate = new Date(event.date_time);
  const isHost = user?.id === event.host_id;
  const isCancelled = event.status === 'cancelled';
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
  };

  const handleCancelEvent = () => {
    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
      return;
    }
    cancelEventMutation.mutate({ eventId });
  };

  const joinButtonLoading = joinEventMutation.isPending || leaveEventMutation.isPending;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Add padding for desktop chat */}
        <div className="container mx-auto px-4 py-8 lg:pr-96">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="hover:bg-white/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
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
                )}

                <CardContent className="p-6">
                  {/* Status Alert */}
                  {isCancelled && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        This event has been cancelled by the host.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Category Badge */}
                  <div className="mb-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {event.category}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {event.title}
                  </h1>

                  {/* Event Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{safeFormatDate(event.date_time, 'EEEE, MMMM dd, yyyy')}</p>
                        <p className="text-sm">{safeFormatDate(event.date_time, 'h:mm a')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm">{event.location}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-600">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Participants</p>
                        <p className="text-sm">{participants.length} / {event.max_participants}</p>
                      </div>
                    </div>

                    {event.host && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <User className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Hosted by</p>
                          <p className="text-sm">{event.host.full_name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">About this event</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                  </div>

                  {/* Action Buttons */}
                  {!isCancelled && !isPastEvent && (
                    <div className="flex flex-wrap gap-3">
                      {user ? (
                        <>
                          {isHost ? (
                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Event
                              </Button>
                              <Button 
                                variant="destructive" 
                                onClick={handleCancelEvent}
                                disabled={cancelEventMutation.isPending}
                              >
                                {cancelEventMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4 mr-2" />
                                )}
                                Cancel Event
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-3 flex-1">
                              {isParticipant ? (
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
                                </Button>
                              ) : (
                                <Button 
                                  onClick={handleJoinEvent}
                                  disabled={joinButtonLoading || participationLoading || participants.length >= event.max_participants}
                                  className="flex-1"
                                >
                                  {joinButtonLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Users className="w-4 h-4 mr-2" />
                                  )}
                                  {participants.length >= event.max_participants ? 'Event Full' : 'Join Event'}
                                </Button>
                              )}
                            </div>
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
                  )}
                </CardContent>
              </Card>

              {/* Participants Section */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participants ({participants.length}/{event.max_participants})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {participantsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </div>
                  ) : participants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No participants yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Host First */}
                      {event.host && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={event.host.avatar_url} />
                            <AvatarFallback>
                              {event.host.full_name?.charAt(0) || 'H'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.host.full_name}</p>
                            <p className="text-xs text-blue-600 font-medium">Host</p>
                          </div>
                        </div>
                      )}

                      {/* Participants */}
                      {participants.map((participant) => (
                        <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={participant.user?.avatar_url} />
                            <AvatarFallback>
                              {participant.user?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{participant.user?.full_name}</p>
                            <p className="text-xs text-gray-500">
                              Joined {safeFormatDate(participant.joined_at, 'MMM dd')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

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

              {/* Event Info */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <Badge 
                      variant={isCancelled ? "destructive" : "default"}
                      className="mt-1"
                    >
                      {isCancelled ? 'Cancelled' : event.status === 'approved' ? 'Active' : event.status}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created</p>
                    <p className="text-sm text-gray-800 mt-1">
                      {safeFormatDate(event.created_at, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  
                  {event.updated_at && event.updated_at !== event.created_at && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Last Updated</p>
                        <p className="text-sm text-gray-800 mt-1">
                          {safeFormatDate(event.updated_at, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Chat Component */}
      {(isParticipant || isHost) && (
        <ResponsiveChat
          eventId={eventId}
          messages={messages}
          messagesLoading={messagesLoading}
          isParticipant={isParticipant}
          isHost={isHost}
          participantCount={participants.length}
        />
      )}
    </>
  );
}
