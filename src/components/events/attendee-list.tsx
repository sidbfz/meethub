// src/components/events/attendee-list.tsx
import React from 'react';
import { User } from '@/lib/types';
import { UserAvatar } from '@/components/profile/user-avatar';

interface AttendeeListProps {
  attendees: User[];
  maxDisplay?: number;
}

export function AttendeeList({ attendees, maxDisplay = 5 }: AttendeeListProps) {
  const displayedAttendees = attendees.slice(0, maxDisplay);
  const remainingAttendeesCount = attendees.length - displayedAttendees.length;

  return (
    <div className="flex items-center -space-x-2">
      {displayedAttendees.map(attendee => (
        <UserAvatar key={attendee.id} user={attendee} size="md" />
      ))}
      {remainingAttendeesCount > 0 && (
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-xs font-medium border-2 border-background">
          +{remainingAttendeesCount}
        </div>
      )}
    </div>
  );
}
