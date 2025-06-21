// src/components/events/event-grid.tsx
import React from 'react';
import { EventCard } from './event-card';
import { Event } from '@/lib/types';

interface EventGridProps {
  events: Event[];
  loading: boolean;
  emptyMessage?: string;
}

export function EventGrid({ events, loading, emptyMessage = "No events found matching your criteria." }: EventGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

// Placeholder for a skeleton loading card
function EventCardSkeleton() {
  return (
    <div className="relative rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-muted"></div>
      <div className="p-4">
        <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
          <div className="h-4 bg-muted rounded w-16"></div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="h-10 bg-muted rounded w-24"></div>
          <div className="h-5 w-5 bg-muted rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
