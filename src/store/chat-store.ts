// src/store/chat-store.ts
import { create } from 'zustand';
import { Message, Conversation } from '@/lib/types';
import { mockMessages, mockConversations } from '@/lib/mock-data';

interface ChatState {
  conversations: Conversation[];
  messages: Message[];
  selectedConversationId: string | null;
  loading: boolean;
  error: string | null;
  fetchConversations: () => void;
  fetchMessages: (conversationId: string) => void;
  sendMessage: (conversationId: string, senderId: string, content: string) => void;
  selectConversation: (conversationId: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: mockConversations, // Initialize with mock data
  messages: mockMessages, // Initialize with mock data
  selectedConversationId: null,
  loading: false,
  error: null,
  fetchConversations: () => {
    set({ loading: true, error: null });
    try {
      // Simulate API call
      set({ conversations: mockConversations, loading: false });
    } catch (err) {
      set({ error: 'Failed to fetch conversations', loading: false });
    }
  },
  fetchMessages: (conversationId) => {
    set({ loading: true, error: null });
    try {
      // Simulate API call for messages in a specific conversation
      const conversationMessages = mockMessages.filter(msg => msg.conversationId === conversationId);
      set({ messages: conversationMessages, loading: false });
    } catch (err) {
      set({ error: 'Failed to fetch messages', loading: false });
    }
  },
  sendMessage: (conversationId, senderId, content) => {
    const newMessage: Message = {
      id: `msg${Date.now()}`, // Simple unique ID
      senderId,
      conversationId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    set(state => ({
      messages: [...state.messages, newMessage],
      conversations: state.conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, newMessage], lastMessageAt: newMessage.timestamp }
          : conv
      ),
    }));
  },
  selectConversation: (conversationId) => set({ selectedConversationId: conversationId }),
}));
