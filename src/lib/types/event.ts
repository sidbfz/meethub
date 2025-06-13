export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date_time: string;
  max_participants: number;
  image_url?: string;
  host_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
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
  status: 'joined' | 'left';
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
