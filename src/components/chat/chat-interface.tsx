// src/components/chat/chat-interface.tsx
"use client";

import React, { useEffect } from 'react';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { useChatStore } from '@/store/chat-store';
import { useUserStore } from '@/store/user-store';

interface ChatInterfaceProps {
  conversationId: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { messages, fetchMessages, sendMessage } = useChatStore();
  const { currentUser, users, fetchUsers } = useUserStore();

  useEffect(() => {
    fetchMessages(conversationId);
    fetchUsers(); // Ensure users are loaded to display sender info
  }, [conversationId, fetchMessages, fetchUsers]);

  const handleSendMessage = (content: string) => {
    if (currentUser) {
      sendMessage(conversationId, currentUser.id, content);
    } else {
      console.warn("No current user to send message.");
    }
  };

  if (!currentUser || users.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading chat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages.filter(msg => msg.conversationId === conversationId)} currentUser={currentUser} users={users} />
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}
