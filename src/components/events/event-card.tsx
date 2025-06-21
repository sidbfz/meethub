// src/components/events/event-card.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { format } from 'date-fns';
import { Users, MapPin, Calendar, Heart } from 'lucide-react'; // Assuming Lucide React is installed

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formattedDate = format(new Date(event.date), 'MMM dd, yyyy');
  const formattedTime = event.time; // Assuming HH:MM format from mock data

  return (
    <div className="relative rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <Link href={`/event/${event.id}`}>
        <div className="relative w-full h-48 bg-muted">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No Image
            </div>
          )}
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">
            {event.category}
          </span>
        </div>
        <div className="p-4">
          <h3 className="text-xl font-semibold mb-2 line-clamp-2">{event.title}</h3>
          <div className="text-sm text-muted-foreground mb-2">
            <p className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {formattedDate} at {formattedTime}
            </p>
            <p className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {event.location.venueName || event.location.address}
            </p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {event.host.avatarUrl && (
                <Image
                  src={event.host.avatarUrl}
                  alt={event.host.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-sm font-medium">{event.host.name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {event.currentParticipants}/{event.maxParticipants}
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            {/* Join/Leave Button Placeholder */}
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary/90">
              {event.status === 'upcoming' ? 'Join Event' : 'View Details'}
            </button>
            {/* Favorite Button Placeholder */}
            <button className="text-muted-foreground hover:text-primary">
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
