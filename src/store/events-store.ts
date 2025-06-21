// src/store/events-store.ts
import { create } from 'zustand';
import { Event } from '@/lib/types';
import { mockEvents } from '@/lib/mock-data';

interface EventState {
  events: Event[];
  filters: {
    category: string;
    location: string;
    date: string;
    participants: [number, number];
    sortBy: 'date' | 'popularity' | 'distance';
  };
  loading: boolean;
  error: string | null;
  fetchEvents: () => void;
  setCategoryFilter: (category: string) => void;
  setLocationFilter: (location: string) => void;
  setDateFilter: (date: string) => void;
  setParticipantsFilter: (participants: [number, number]) => void;
  setSortBy: (sortBy: 'date' | 'popularity' | 'distance') => void;
  getEventById: (id: string) => Event | undefined;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: mockEvents, // Initialize with mock data
  filters: {
    category: '',
    location: '',
    date: '',
    participants: [0, 100],
    sortBy: 'date',
  },
  loading: false,
  error: null,
  fetchEvents: () => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      const filteredEvents = mockEvents.filter(event => {
        const { category, location, date, participants } = get().filters;
        let matches = true;
        if (category && event.category !== category) matches = false;
        if (location && !event.location.address.includes(location) && !event.location.venueName?.includes(location)) matches = false;
        if (date && event.date !== date) matches = false;
        if (event.currentParticipants < participants[0] || event.currentParticipants > participants[1]) matches = false;
        return matches;
      });

      // Simulate sorting
      const sortedEvents = [...filteredEvents].sort((a, b) => {
        const sortBy = get().filters.sortBy;
        if (sortBy === 'date') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'popularity') {
          return b.currentParticipants - a.currentParticipants;
        }
        // 'distance' would require actual geo-calculations, so we'll just return 0 for now
        return 0;
      });

      set({ events: sortedEvents, loading: false });
    } catch (err) {
      set({ error: 'Failed to fetch events', loading: false });
    }
  },
  setCategoryFilter: (category) => set(state => ({ filters: { ...state.filters, category } })),
  setLocationFilter: (location) => set(state => ({ filters: { ...state.filters, location } })),
  setDateFilter: (date) => set(state => ({ filters: { ...state.filters, date } })),
  setParticipantsFilter: (participants) => set(state => ({ filters: { ...state.filters, participants } })),
  setSortBy: (sortBy) => set(state => ({ filters: { ...state.filters, sortBy } })),
  getEventById: (id: string) => get().events.find(event => event.id === id),
}));
