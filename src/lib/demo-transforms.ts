import { mockEvents, mockMessages, mockUsers } from '@/lib/mock-data';
import type { Event } from '@/lib/types/event';

export function isDemoUserId(userId: string) {
  return userId.startsWith('demo-') || mockUsers.some(user => user.id === userId);
}

export function isDemoEventId(eventId: string) {
  return eventId.startsWith('demo-') || mockEvents.some(event => event.id === eventId);
}

export function toAppEvent(mockEvent: (typeof mockEvents)[number], status: Event['status'] = 'approved'): Event {
  return {
    id: mockEvent.id,
    title: mockEvent.title,
    description: mockEvent.description,
    category: mockEvent.category,
    date_time: `${mockEvent.date}T${mockEvent.time}:00Z`,
    max_participants: mockEvent.maxParticipants,
    image_url: mockEvent.imageUrl,
    host_id: mockEvent.host.id,
    status,
    created_at: mockEvent.createdAt,
    updated_at: mockEvent.createdAt,
    address: mockEvent.location.address,
    city: mockEvent.location.address.split(',').pop()?.trim() || '',
    participants_count: mockEvent.currentParticipants,
    host: {
      id: mockEvent.host.id,
      full_name: mockEvent.host.name,
      email: mockEvent.host.email,
      avatar_url: mockEvent.host.avatarUrl,
    },
  };
}

export function getDemoProfile(userId: string) {
  const mockUser = mockUsers.find(user => user.id === userId) || mockUsers[0];

  return {
    id: mockUser.id,
    full_name: mockUser.name,
    email: mockUser.email,
    avatar_url: mockUser.avatarUrl,
    bio: mockUser.bio,
    location: mockUser.location,
    website: mockUser.website,
    interests: mockUser.interests,
    member_since: mockUser.memberSince,
    created_at: `${mockUser.memberSince}T00:00:00Z`,
    participated_events: mockEvents
      .filter(event => mockUser.eventsAttended.includes(event.id) && event.host.id !== mockUser.id)
      .map(event => ({
        status: 'joined',
        joined_at: event.createdAt,
        event: toAppEvent(event),
      })),
  };
}

export function getDemoHostedEvents(userId: string) {
  return mockEvents
    .filter(event => event.host.id === userId)
    .map(event => toAppEvent(event));
}

export function getDemoParticipants(eventId: string) {
  const event = mockEvents.find(item => item.id === eventId) || mockEvents[0];

  return event.attendees.map((user, index) => ({
    id: `${event.id}-participant-${index + 1}`,
    user_id: user.id,
    status: 'joined',
    joined_at: event.createdAt,
    user: {
      id: user.id,
      full_name: user.name,
      email: user.email,
      avatar_url: user.avatarUrl,
    },
  }));
}

export function getDemoEventMessages(eventId: string) {
  return mockMessages.map(message => {
    const sender = mockUsers.find(user => user.id === message.senderId) || mockUsers[0];

    return {
      id: `${eventId}-${message.id}`,
      event_id: eventId,
      user_id: sender.id,
      content: message.content,
      created_at: message.timestamp,
      user: {
        id: sender.id,
        full_name: sender.name,
        email: sender.email,
        avatar_url: sender.avatarUrl,
      },
    };
  });
}
