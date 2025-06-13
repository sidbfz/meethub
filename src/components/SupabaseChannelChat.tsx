"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Send, 
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import toast from 'react-hot-toast';

interface ChannelMessage {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface SupabaseChannelChatProps {
  eventId: string;
  isParticipant: boolean;
  isHost: boolean;
  participantCount: number;
  isOpen: boolean;
  onToggle: () => void;
  hostId?: string;
}

export default function SupabaseChannelChat({ 
  eventId, 
  isParticipant, 
  isHost,
  participantCount,
  isOpen,
  onToggle,
  hostId
}: SupabaseChannelChatProps) {
  const { user } = useAuthStore();  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channel = useRef<RealtimeChannel | null>(null);

  const canChat = user && (isParticipant || isHost);
  // Set up channel connection
  useEffect(() => {
    if (!eventId || !canChat) return;

    if (!channel.current) {      console.log('Setting up Supabase channel for event:', eventId);
      
      channel.current = supabase.channel(`event-chat-${eventId}`, {
        config: {
          broadcast: {
            self: true, // Receive our own messages
          },
        },
      });

      channel.current
        .on("broadcast", { event: "message" }, ({ payload }) => {
          console.log('📨 Message received via channel:', payload);
          
          const channelMessage: ChannelMessage = {
            id: payload.message.id,
            content: payload.message.content,
            created_at: payload.message.created_at,
            user: payload.message.user
          };
          
          setMessages((prev) => {
            // Avoid duplicates by checking if message already exists
            const exists = prev.find(msg => msg.id === channelMessage.id);
            if (exists) return prev;
            return [...prev, channelMessage];
          });
        })        .subscribe((status, error) => {
          console.log('Channel subscription status:', status);
          if (error) {
            console.error('Channel subscription error details:', error);
          }
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to channel');
            setIsSubscribed(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription error');
            setIsSubscribed(false);
            toast.error('Chat connection failed. Please check if Realtime is enabled in your Supabase project.');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Channel subscription timed out');
            setIsSubscribed(false);
            toast.error('Chat connection timed out');
          } else if (status === 'CLOSED') {
            console.log('🔒 Channel subscription closed');
            setIsSubscribed(false);
          }
        });
    }    return () => {
      console.log('Cleaning up channel subscription');
      setIsSubscribed(false);
      channel.current?.unsubscribe();
      channel.current = null;
    };
  }, [eventId, canChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && canChat && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, canChat]);
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !canChat || sending || !user || !channel.current || !isSubscribed) {
      if (!isSubscribed) {
        console.warn('Cannot send message: not subscribed to channel yet');
        toast.error('Chat is connecting, please wait...');
      }
      return;
    }

    const messageToSend = newMessage.trim();
    setSending(true);
    
    // Clear the input immediately
    setNewMessage('');
    
    try {
      const messageData = {
        id: `${Date.now()}-${Math.random()}`, // Unique ID
        content: messageToSend,
        created_at: new Date().toISOString(),
        user: {
          id: user.id,
          name: (user as any).full_name || (user as any).name || user.email?.split('@')[0] || 'You',
          email: user.email || '',
          avatar_url: (user as any).avatar_url
        }
      };

      console.log('Sending message via channel:', messageData);

      const result = await channel.current.send({
        type: "broadcast",
        event: "message",
        payload: { message: messageData },
      });

      console.log('Send result:', result);

      // Focus management
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 0);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend); // Restore message on error
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }, [newMessage, canChat, sending, user, isSubscribed]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Unknown';
    }
  };

  const renderChatContent = useCallback(() => (
    <Card className="flex flex-col h-full bg-white shadow-lg">
      <CardHeader className="pb-3 border-b">        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <span>Event Chat</span>
            {participantCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {/* Connection Status Indicator */}
            <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-yellow-500'}`} 
                 title={isSubscribed ? 'Connected' : 'Connecting...'}
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>      <CardContent className="flex flex-col flex-1 p-4 overflow-hidden">
        {!canChat && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              {!user ? 'Login to join the conversation' : 'Join this event to participate in chat'}
            </p>
          </div>
        )}

        {canChat && !isSubscribed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              🔄 Connecting to chat...
            </p>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No messages yet</p>
              {canChat && (
                <p className="text-xs mt-1">Start the conversation!</p>
              )}
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isMessageFromHost = hostId && message.user.id === hostId;
                const isOwnMessage = user && message.user.id === user.id;
                
                return (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={message.user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(message.user.name || message.user.email)?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium text-sm truncate ${isOwnMessage ? 'text-blue-600' : ''}`}>
                          {message.user.name || message.user.email?.split('@')[0] || 'Unknown User'}
                          {isOwnMessage && ' (You)'}
                        </span>
                        {isMessageFromHost && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5">
                            Host
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        {canChat && (          <div className="flex gap-2 border-t pt-4">
            <input
              ref={inputRef}
              type="text"
              placeholder={isSubscribed ? "Type your message..." : "Connecting..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || !isSubscribed}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button 
              onClick={sendMessage}
              disabled={!isSubscribed || !newMessage.trim() || sending}
              size="sm"
              title={!isSubscribed ? "Connecting to chat..." : "Send message"}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>  ), [
    participantCount, 
    onToggle, 
    canChat, 
    user, 
    messages, 
    hostId, 
    newMessage, 
    handleKeyDown, 
    sending, 
    sendMessage, 
    formatTime,
    isSubscribed
  ]);

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop Drawer */}
      <div className="hidden lg:block">
        <div 
          className={`fixed inset-y-0 right-0 w-96 z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col pt-16 pb-6 pr-6">
            {renderChatContent()}
          </div>
        </div>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onToggle}
        />
      </div>

      {/* Mobile Modal */}
      <div className="lg:hidden">
        <div 
          className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="h-full bg-white pt-16 pb-6 px-4">
            {renderChatContent()}
          </div>
        </div>
      </div>
    </>
  );
}
