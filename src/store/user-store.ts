// src/store/user-store.ts
import { create } from 'zustand';
import { User } from '@/lib/types';
import { mockUsers } from '@/lib/mock-data';

interface UserState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => void;
  getUserById: (id: string) => User | undefined;
  setCurrentUser: (user: User | null) => void;
  updateUserProfile: (userId: string, updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: mockUsers[0], // Set a mock current user for development
  users: mockUsers, // Initialize with mock data
  loading: false,
  error: null,
  fetchUsers: () => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      set({ users: mockUsers, loading: false });
    } catch (err) {
      set({ error: 'Failed to fetch users', loading: false });
    }
  },
  getUserById: (id: string) => get().users.find(user => user.id === id),
  setCurrentUser: (user) => set({ currentUser: user }),
  updateUserProfile: (userId, updates) => {
    set(state => ({
      users: state.users.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      ),
      currentUser: state.currentUser?.id === userId ? { ...state.currentUser, ...updates } : state.currentUser,
    }));
  },
}));
