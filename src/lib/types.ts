// src/lib/types.ts

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  duration: number; // in minutes
  location: {
    address: string;
    venueName?: string;
    lat: number;
    lng: number;
  };
  maxParticipants: number;
  currentParticipants: number;
  host: User;
  attendees: User[];
  imageUrl?: string;
  tags: string[];
  approvalRequired: boolean;
  status: 'upcoming' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  interests: string[];
  eventsHosted: string[]; // Array of event IDs
  eventsAttended: string[]; // Array of event IDs
  memberSince: string; // ISO date string
}

export interface Message {
  id: string;
  senderId: string;
  conversationId: string;
  content: string;
  timestamp: string; // ISO date string
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[]; // Array of user IDs
  messages: Message[];
  lastMessageAt: string; // ISO date string
  unreadCount: number;
}

export interface ModerationItem {
  id: string;
  eventId: string;
  eventType: 'event' | 'user' | 'report';
  status: 'pending' | 'approved' | 'rejected' | 'more_info_requested';
  submittedBy: string; // User ID
  submittedAt: string; // ISO date string
  notes?: string;
}

// Explicit interface for EventFormValues to ensure correct type inference
export interface EventFormValues {
  title: string;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  location: {
    address: string;
    venueName?: string;
    lat: number;
    lng: number;
  };
  maxParticipants: number;
  approvalRequired: boolean;
  tags: string[];
  imageUrl: string;
}
