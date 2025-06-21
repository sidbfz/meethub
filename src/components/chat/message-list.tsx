// src/components/chat/message-list.tsx
import React, { useRef, useEffect } from 'react';
import { Message, User } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/profile/user-avatar';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  users: User[]; // All users to find sender details
}

export function MessageList({ messages, currentUser, users }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea className="h-full flex-1 p-4">
      <div className="flex flex-col gap-4">
        {messages.map((message) => {
          const isCurrentUser = message.senderId === currentUser.id;
          const sender = users.find(user => user.id === message.senderId);

          return (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2",
                isCurrentUser ? "justify-end" : "justify-start"
              )}
            >
              {!isCurrentUser && sender && (
                <UserAvatar user={sender} size="sm" />
              )}
              <div
                className={cn(
                  "flex flex-col max-w-[70%]",
                  isCurrentUser ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "px-4 py-2 rounded-lg",
                    isCurrentUser
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-muted-foreground rounded-bl-none"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {isCurrentUser && sender && (
                <UserAvatar user={sender} size="sm" />
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
