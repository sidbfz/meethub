"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, Clock, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/types/event';
import { useAuthStore } from '@/lib/stores/authStore';
import { useJoinEvent, useLeaveEvent, useIsParticipant } from '@/lib/hooks/useEvents';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const { user } = useAuthStore();
  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();
  const { data: isParticipant = false, isLoading: participationLoading } = useIsParticipant(event.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);  const eventDate = new Date(event.date_time);
  const isPastEvent = eventDate < new Date();
  const status = event.status || 'pending';
  const isCancelled = status === 'cancelled';
  const isConcluded = status === 'concluded';
  const isHost = user?.id === event.host_id;
  
  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | null | undefined, formatStr: string, fallback: string = 'TBD') => {
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
  
  const formattedDate = safeFormatDate(event.date_time, 'MMM dd, yyyy');
  const formattedTime = safeFormatDate(event.date_time, 'h:mm a');

  const handleJoinEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      // Could redirect to login or show auth modal
      return;
    }
    joinEventMutation.mutate({ eventId: event.id });
  };

  const handleLeaveEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    leaveEventMutation.mutate({ eventId: event.id });
  };

  const isLoading = joinEventMutation.isPending || leaveEventMutation.isPending || participationLoading;
  return (
    <Link href={`/event/${event.id}`}>      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer p-0">
        <div className="relative h-48 overflow-hidden">
          {event.image_url && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                </div>
              )}
              <Image
                src={event.image_url}
                alt={event.title}
                fill
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <Calendar className="w-16 h-16 text-gray-400" />
            </div>
          )}          {/* Status Overlay */}
          {(isCancelled || isConcluded) && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center text-white">
                <p className="text-lg font-bold">
                  {isCancelled ? 'Cancelled' : 'Concluded'}
                </p>
              </div>
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
              {event.category}
            </span>
          </div>          {/* Date Badge */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-center shadow-sm">
            <div className="text-xs font-semibold text-gray-600">
              {safeFormatDate(event.date_time, 'MMM', 'TBD')}
            </div>
            <div className="text-lg font-bold text-gray-900 leading-none">
              {safeFormatDate(event.date_time, 'dd', '--')}
            </div>
          </div>        </div>

      <CardContent className="px-3 pb-1 -mt-5"><h3 className="font-semibold text-lg mb-0.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>        <div className="space-y-1">          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formattedDate} at {formattedTime}</span>
            </div><div className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{event.participants_count || event.participants?.filter(p => p.status === 'joined').length || 0}/{event.max_participants}</span>
            </div>
          </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{event.city || event.location || 'City TBD'}</span>
          </div>

          {event.host && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Hosted by {event.host.full_name}</span>
            </div>
          )}        </div>
      </CardContent>

        <CardFooter className="px-3 pb-3 -mt-3">
          {user && !isCancelled && !isPastEvent ? (
            isParticipant && !isHost ? (
              <Button
                onClick={handleLeaveEvent}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    Leaving...
                  </div>
                ) : (
                  'Leave Event'
                )}
              </Button>
            ) : isParticipant && isHost ? (
              <Button
                disabled
                className="w-full"
                variant="outline"
              >
                Hosting Event
              </Button>
            ) : (
              <Button
                onClick={handleJoinEvent}
                disabled={isLoading}
                className="w-full"
                variant="default"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Joining...
                  </div>
                ) : (
                  'Join Event'
                )}
              </Button>
            )
          ) : (
            <Button
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) {
                  window.location.href = '/login';
                }
              }}
              className="w-full"
              variant="default"
              disabled={isCancelled || isPastEvent}
            >
              {isCancelled ? 'Cancelled' : isPastEvent ? 'Past Event' : 'Login to Join'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
