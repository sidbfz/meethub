"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface EventChatProps {
  eventId: string;
}

export default function EventChat({ eventId }: EventChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Get current user and check participation
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Check if user is a participant in this event
        const { data: participation } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();
        
        // Also check if user is the host
        const { data: event } = await supabase
          .from('events')
          .select('host_id')
          .eq('id', eventId)
          .single();
          
        const isHost = event?.host_id === user.id;
        const isEventParticipant = !!participation;
        
        setIsParticipant(isHost || isEventParticipant);
      }
      
      setLoading(false);
    };

    getCurrentUser();
  }, [eventId]);

  // Load messages
  const loadMessages = async () => {
    if (!user || !isParticipant) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          event_id,
          user_id,
          content,
          created_at,
          users!inner(id, full_name, email, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });      if (error) {
        console.error('Error loading messages:', error);
        return;
      }      // Transform the data to handle the users join properly
      const transformedMessages: Message[] = (data || []).map(item => {
        let userInfo: { id: string; full_name?: string; email?: string; avatar_url?: string; } | undefined;
        
        if (item.users) {
          if (Array.isArray(item.users) && item.users.length > 0) {
            userInfo = item.users[0];
          } else if (!Array.isArray(item.users)) {
            userInfo = item.users as any;
          }
        }
        
        return {
          id: item.id,
          event_id: item.event_id,
          user_id: item.user_id,
          content: item.content,
          created_at: item.created_at,
          users: userInfo
        };
      });

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!user || !isParticipant || !eventId) return;

    loadMessages();

    // Create realtime channel
    const channel = supabase.channel(`event-chat-${eventId}`);
    channelRef.current = channel;

    // Subscribe to INSERT events
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Fetch user details for the new message
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, email, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMsg: Message = {
            ...payload.new as Message,
            users: userData || undefined,
          };

          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(msg => msg.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Message deleted:', payload);
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, isParticipant, eventId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: newMessage.trim(),
        });

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format display name
  const getDisplayName = (msg: Message): string => {
    if (msg.users?.full_name) return msg.users.full_name;
    if (msg.users?.email) return msg.users.email.split('@')[0];
    return 'Anonymous';
  };

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading chat...</span>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="h-96">
        <CardContent className="flex flex-col items-center justify-center h-full">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please log in to join the chat</p>
        </CardContent>
      </Card>
    );
  }

  if (!isParticipant) {
    return (
      <Card className="h-96">
        <CardContent className="flex flex-col items-center justify-center h-full">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Only event participants can access the chat
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="py-3">
        <CardTitle className="text-lg">Event Chat</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">        {/* Messages Area */}
        <div className="flex-1 px-4 overflow-y-auto">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={message.users?.avatar_url} 
                      alt={getDisplayName(message)}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(getDisplayName(message))}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {getDisplayName(message)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
              maxLength={1000}
              disabled={sending}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
