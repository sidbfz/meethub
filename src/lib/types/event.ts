// src/lib/types/event.ts

// Define EventStatus directly within this file as a union type.
// Add all possible event statuses that your application uses.
export type EventStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'concluded'; // Example: You might have a 'draft' status for events being created.

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string; // Keep for backward compatibility during transition
  address?: string;
  city?: string;
  date_time: string;
  max_participants: number;
  image_url?: string;
  host_id: string;
  status: EventStatus; // This now refers to the 'EventStatus' type defined above.
  created_at: string;
  updated_at: string;
  // Relations
  host?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  participants?: EventParticipant[];
  // Computed
  participants_count?: number;
}

export interface EventParticipant {
  id: string;
  status: 'joined' | 'left'; // Participant's status in relation to the event
  joined_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface EventMessage {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface EventFilters {
  category?: string;
  search?: string;
  date?: string;
}

export interface EventsResponse {
  events: Event[];
  nextCursor: number | null;
  hasMore: boolean;
}