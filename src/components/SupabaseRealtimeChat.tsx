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
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  event_id: string;
  user_id: string;
  user?: UserData;
}

interface SupabaseRealtimeChatProps {
  eventId: string;
  isParticipant: boolean;
  isHost: boolean;
  participantCount: number;
  isOpen: boolean;
  onToggle: () => void;
  hostId?: string;
}

export default function SupabaseRealtimeChat({ 
  eventId, 
  isParticipant, 
  isHost,
  participantCount,
  isOpen,
  onToggle,
  hostId
}: SupabaseRealtimeChatProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canChat = user && (isParticipant || isHost);
  // Load initial messages
  useEffect(() => {
    if (!eventId) return;    const loadMessages = async () => {
      try {
        setLoading(true);
        console.log('Loading messages for event:', eventId);
        console.log('Current user:', user);
        console.log('Can chat:', canChat);
          const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            event_id,
            user_id,
            users(id, full_name, email, avatar_url)
          `)
          .eq('event_id', eventId)
          .order('created_at', { ascending: true });

        console.log('Messages query result:', { data, error, count: data?.length });

        if (error) throw error;        // Transform the data to match our Message interface
        const transformedData: Message[] = (data || []).map(msg => {
          console.log('Raw message:', msg);
          const transformed = {
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            event_id: msg.event_id,
            user_id: msg.user_id,
            user: Array.isArray(msg.users) ? msg.users[0] : msg.users
          };
          console.log('Transformed message:', transformed);
          return transformed;
        });        console.log('Transformed messages:', transformedData);
        setMessages(transformedData);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };    loadMessages();
  }, [eventId, user?.id, canChat]);  // Set up realtime subscription for new messages
  useEffect(() => {
    if (!eventId) return;

    console.log('Setting up realtime subscription for event:', eventId);

    const channel = supabase
      .channel(`messages:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${eventId}`,
        },        async (payload) => {
          console.log('🔔 New message received via realtime:', payload);
          
          // Skip if this message is from the current user (we already have it optimistically)
          if (user && payload.new.user_id === user.id) {
            console.log('Skipping own message from realtime');
            return;
          }
          
          // Create message directly from payload without database fetch
          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            event_id: payload.new.event_id,
            user_id: payload.new.user_id,
            // We'll need to fetch user data separately since it's not in the payload
            user: undefined // Will be filled by a separate query
          };

          // Fetch just the user data for this message
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, full_name, email, avatar_url')
              .eq('id', payload.new.user_id)
              .single();            if (!userError && userData) {
              newMessage.user = {
                ...userData,
                full_name: userData.full_name || userData.email?.split('@')[0] || 'User'
              };
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
            // Use fallback user data
            newMessage.user = {
              id: payload.new.user_id,
              full_name: 'Unknown User',
              email: '',
              avatar_url: undefined
            };
          }

          console.log('✅ Adding realtime message from other user:', newMessage);
          
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.find(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('Message already exists, skipping');
              return prev;
            }
            console.log('Adding new message to state');
            return [...prev, newMessage];
          });        }
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
          console.log('🗑️ Message deleted via realtime:', payload);
          
          // Remove the deleted message from state
          setMessages(prev => {
            const filteredMessages = prev.filter(msg => msg.id !== payload.old.id);
            console.log(`Removed message ${payload.old.id}, ${prev.length - filteredMessages.length} messages deleted`);
            return filteredMessages;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('✏️ Message updated via realtime:', payload);
          
          // Update the message in state
          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === payload.new.id) {
                // Keep existing user data, just update the message content
                return {
                  ...msg,
                  content: payload.new.content,
                  created_at: payload.new.created_at,
                };
              }
              return msg;
            });
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);    };
  }, [eventId]);  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Use a small delay to ensure the DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && canChat && inputRef.current) {
      // Delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, canChat]);  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !canChat || sending || !user) return;

    const messageToSend = newMessage.trim();
    setSending(true);
    
    // Clear the input immediately for better UX
    setNewMessage('');
    
    // Create optimistic message for immediate display
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID
      content: messageToSend,
      created_at: new Date().toISOString(),
      event_id: eventId,
      user_id: user.id,      user: {
        id: user.id,
        full_name: (user as any).full_name || (user as any).name || user.email?.split('@')[0] || 'You',
        email: user.email || '',
        avatar_url: (user as any).avatar_url
      }
    };    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll to bottom immediately after adding optimistic message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
    
    try {
      console.log('Sending message:', { eventId, userId: user.id, content: messageToSend });
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: messageToSend,
        })
        .select();

      console.log('Message send result:', { data, error });      if (error) throw error;

      // Don't remove optimistic message - let it stay as the real message
      // The realtime subscription will handle messages from other users
      
      // Focus management: use multiple approaches to ensure focus works
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Ensure cursor is at end
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 0);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      // Restore the message on error
      setNewMessage(messageToSend);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }, [newMessage, canChat, sending, eventId, user]);

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

  // Move ChatContent outside render to prevent re-creation
  const renderChatContent = useCallback(() => (
    <Card className="flex flex-col h-full bg-white shadow-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <span>Event Chat</span>
            {participantCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Badge>
            )}
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
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-4 overflow-hidden">
        {!canChat && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              {!user ? 'Login to join the conversation' : 'Join this event to participate in chat'}
            </p>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-0">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-500 mt-2">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
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
                const isMessageFromHost = hostId && message.user_id === hostId;
                const isOwnMessage = user && message.user_id === user.id;
                
                return (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={message.user?.avatar_url} />                      <AvatarFallback className="text-xs">
                        {(message.user?.full_name || message.user?.email)?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">                        <span className={`font-medium text-sm truncate ${isOwnMessage ? 'text-blue-600' : ''}`}>
                          {message.user?.full_name || message.user?.email?.split('@')[0] || 'Unknown User'}
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
        {canChat && (
          <div className="flex gap-2 border-t pt-4">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              size="sm"
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
    </Card>
  ), [
    participantCount, 
    onToggle, 
    canChat, 
    user, 
    loading, 
    messages, 
    hostId, 
    newMessage, 
    handleKeyDown, 
    sending, 
    sendMessage, 
    formatTime  ]);

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop Drawer */}
      <div className="hidden lg:block">
        <div 
          className={`fixed inset-y-0 right-0 w-96 z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}        >
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
          }`}        >
          <div className="h-full bg-white pt-16 pb-6 px-4">
            {renderChatContent()}
          </div>
        </div>
      </div>
    </>
  );
}
