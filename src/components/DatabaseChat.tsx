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

interface DatabaseMessage {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    name?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface DatabaseChatProps {
  eventId: string;
  isParticipant: boolean;
  isHost: boolean;
  participantCount: number;
  isOpen: boolean;
  onToggle: () => void;
  hostId?: string;
}

export default function DatabaseChat({ 
  eventId, 
  isParticipant, 
  isHost,
  participantCount,
  isOpen,
  onToggle,
  hostId
}: DatabaseChatProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<DatabaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channel = useRef<RealtimeChannel | null>(null);

  const canChat = user && (isParticipant || isHost);
  console.log('[DatabaseChat] Initial props:', { eventId, isParticipant, isHost, user: user?.id, canChat });

  // Load initial messages from database
  const loadMessages = useCallback(async () => {
    if (!eventId) {
      console.log('[DatabaseChat] loadMessages: No eventId, skipping.');
      setLoading(false);
      return;
    }
    if (!user) {
      console.log('[DatabaseChat] loadMessages: No user, skipping.');
      setLoading(false);
      return;
    }
    console.log(`[DatabaseChat] loadMessages: Attempting to load messages for eventId: ${eventId}`);

    try {
      setLoading(true);
      const { data, error, status } = await supabase
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
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[DatabaseChat] Error loading messages from Supabase:', { error, status });
        toast.error('Failed to load messages (see console for details)');
        setMessages([]); // Clear messages on error
        return;
      }

      console.log('[DatabaseChat] Successfully fetched messages raw data:', data);

      // Transform the data to match our interface
      const transformedMessages = (data || []).map((item: any) => ({
        id: item.id,
        event_id: item.event_id,
        user_id: item.user_id,
        content: item.content,
        created_at: item.created_at,
        user: item.users ? { // Changed from item.profiles
          id: item.users.id, // Changed from item.profiles.id
          full_name: item.users.full_name, // Changed from item.profiles.full_name
          email: item.users.email, // Changed from item.profiles.email
          avatar_url: item.users.avatar_url // Changed from item.profiles.avatar_url
        } : undefined
      }));

      console.log('[DatabaseChat] Transformed messages:', transformedMessages);
      setMessages(transformedMessages);
    } catch (error) {
      console.error('[DatabaseChat] Exception in loadMessages:', error);
      toast.error('Exception while loading messages (see console)');
      setMessages([]); // Clear messages on exception
    } finally {
      setLoading(false);
      console.log('[DatabaseChat] loadMessages: Finished.');
    }
  }, [eventId, user]); // Added user to dependency array

  // Set up real-time subscription for postgres changes
  useEffect(() => {
    console.log('[DatabaseChat] useEffect triggered. eventId:', eventId, 'canChat:', canChat, 'user:', user?.id);
    if (!eventId || !canChat || !user) {
      console.log('[DatabaseChat] useEffect: Conditions not met for loading messages or subscribing. eventId:', eventId, 'canChat:', canChat, 'user:', user?.id);
      if (!user) toast.error("You must be logged in to chat.");
      else if (!canChat) toast.error("You do not have permission to chat for this event.");
      setLoading(false); // Ensure loading is false if we don't proceed
      setMessages([]); // Clear messages if user cannot chat
      return;
    }

    // Load initial messages
    console.log('[DatabaseChat] useEffect: Calling loadMessages.');
    loadMessages();

    if (!channel.current) {
      console.log('Setting up Postgres Changes subscription for event:', eventId);
      
      channel.current = supabase.channel(`messages-${eventId}`);

      // Listen to INSERT events on messages table
      channel.current
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `event_id=eq.${eventId}`
          },
          (payload) => {
            console.log('📨 New message via Postgres Changes:', payload);
            
            const newMessagePayload = payload.new as any; // Use 'any' for broader compatibility before transforming

            // Fetch user details for the new message
            supabase.from('users').select('id, full_name, email, avatar_url').eq('id', newMessagePayload.user_id).single()
              .then(({ data: userData, error: userError }) => {
                if (userError) {
                  console.error("Error fetching user details for new message:", userError);
                }
                
                const finalNewMessage: DatabaseMessage = {
                  id: newMessagePayload.id,
                  event_id: newMessagePayload.event_id,
                  user_id: newMessagePayload.user_id,
                  content: newMessagePayload.content,
                  created_at: newMessagePayload.created_at,
                  user: userData ? {
                    id: userData.id,
                    full_name: userData.full_name,
                    email: userData.email,
                    avatar_url: userData.avatar_url,
                  } : undefined,
                };

                setMessages((prev) => {
                  const exists = prev.find(msg => msg.id === finalNewMessage.id);
                  if (exists) {
                    console.log('[DatabaseChat] New message already exists, not adding:', finalNewMessage.id);
                    return prev;
                  }
                  console.log('[DatabaseChat] Adding new message to state:', finalNewMessage);
                  return [...prev, finalNewMessage];
                });
              });
          }
        )
        // Listen to DELETE events
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `event_id=eq.${eventId}`
          },
          (payload) => {
            console.log('🗑️ Message deleted via Postgres Changes:', payload);
            
            const deletedMessage = payload.old as DatabaseMessage; // Assuming old payload has enough info
            
            console.log('[DatabaseChat] Removing deleted message from state:', deletedMessage.id);
            setMessages((prev) => 
              prev.filter(msg => msg.id !== deletedMessage.id)
            );
          }
        )
        // Listen to UPDATE events
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `event_id=eq.${eventId}`
          },
          (payload) => {
            console.log('📝 Message updated via Postgres Changes:', payload);
            
            const updatedMessagePayload = payload.new as any; // Use 'any'

            // Fetch user details for the updated message
            supabase.from('users').select('id, full_name, email, avatar_url').eq('id', updatedMessagePayload.user_id).single()
              .then(({ data: userData, error: userError }) => {
                if (userError) {
                  console.error("Error fetching user details for updated message:", userError);
                }

                const finalUpdatedMessage: DatabaseMessage = {
                  id: updatedMessagePayload.id,
                  event_id: updatedMessagePayload.event_id,
                  user_id: updatedMessagePayload.user_id,
                  content: updatedMessagePayload.content,
                  created_at: updatedMessagePayload.created_at, // Or use updated_at if you add that field
                  user: userData ? {
                    id: userData.id,
                    full_name: userData.full_name,
                    email: userData.email,
                    avatar_url: userData.avatar_url,
                  } : undefined,
                };
                
                console.log('[DatabaseChat] Updating message in state:', finalUpdatedMessage);
                setMessages((prev) => 
                  prev.map(msg => 
                    msg.id === finalUpdatedMessage.id ? finalUpdatedMessage : msg
                  )
                );
              });
          }
        )
        .subscribe((status, error) => {
          console.log('[DatabaseChat] Postgres Changes subscription status:', status, 'Error:', error);
          if (error) {
            console.error('❌ [DatabaseChat] Postgres Changes subscription error. Error:', error);
            toast.error("Chat connection error.");
            setIsSubscribed(false);
          }
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to Postgres Changes');
            setIsSubscribed(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Postgres Changes subscription error');
            setIsSubscribed(false);
            toast.error('Chat connection failed. Please check Realtime setup.');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Postgres Changes subscription timed out');
            setIsSubscribed(false);
            toast.error('Chat connection timed out');
          } else if (status === 'CLOSED') {
            console.log('🔒 Postgres Changes subscription closed');
            setIsSubscribed(false);
          }
        });
    }

    return () => {
      if (channel.current) {
        console.log('[DatabaseChat] useEffect cleanup: Unsubscribing from channel', channel.current.topic);
        supabase.removeChannel(channel.current);
        channel.current = null;
        setIsSubscribed(false);
        console.log('[DatabaseChat] useEffect cleanup: Channel removed.');
      }
    };
  }, [eventId, canChat, loadMessages, user]); // Added user to dependency array

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !canChat || sending || !user) {
      return;
    }

    const messageToSend = newMessage.trim();
    setSending(true);
    
    // Clear the input immediately for optimistic UI
    setNewMessage('');
    
    try {
      console.log('Sending message to database:', messageToSend);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: messageToSend,
        })
        .select(`
          id,
          event_id,
          user_id,
          content,
          created_at,
          users!inner(id, full_name, email, avatar_url)
        `) // Select the newly inserted message with user details
        .single();

      setSending(false);

      if (error) {
        console.error('[DatabaseChat] Error sending message:', error);
        setNewMessage(messageToSend); // Restore message on error
        toast.error('Failed to send message');
        return;
      }

      if (data) {
        console.log('[DatabaseChat] Successfully sent message and received back:', data);
        
        let userProfile: { id: string; full_name?: string; email?: string; avatar_url?: string; } | undefined = undefined;
        
        // Check if data.users exists and how to access it
        if (data.users) {
          if (Array.isArray(data.users) && data.users.length > 0) {
            userProfile = data.users[0] as { id: string; full_name?: string; email?: string; avatar_url?: string; };
          } else if (!Array.isArray(data.users)) {
            userProfile = data.users as { id: string; full_name?: string; email?: string; avatar_url?: string; };
          }
        }

        const sentMessageWithUser: DatabaseMessage = {
          id: data.id,
          event_id: data.event_id,
          user_id: data.user_id,
          content: data.content,
          created_at: data.created_at,
          user: userProfile ? {
            id: userProfile.id,
            full_name: userProfile.full_name,
            email: userProfile.email,
            avatar_url: userProfile.avatar_url,
          } : undefined
        };
        
        // Add to messages list only if it's not already there (e.g. from a quick realtime update)
        setMessages(prevMessages => {
          if (!prevMessages.find(m => m.id === sentMessageWithUser.id)) {
            console.log('[DatabaseChat] Adding sent message to UI (if not already present via Realtime):', sentMessageWithUser);
            return [...prevMessages, sentMessageWithUser];
          }
          console.log('[DatabaseChat] Sent message already present in UI (likely via Realtime):', sentMessageWithUser.id);
          return prevMessages;
        });

      } else {
        console.log('[DatabaseChat] Message sent, but no data returned from insert. Relying on Realtime.');
      }
    } catch (error) {
      console.error('[DatabaseChat] Error sending message:', error);
      setNewMessage(messageToSend); // Restore message on error
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }, [newMessage, canChat, sending, user, eventId]);

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

  const getUserName = (message: DatabaseMessage) => {
    if (message.user?.full_name) return message.user.full_name;
    if (message.user?.email) return message.user.email.split('@')[0];
    return 'Unknown User';
  };

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
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-4 overflow-hidden">
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
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
              <p className="text-sm">Loading messages...</p>
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
                      <AvatarImage src={message.user?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getUserName(message).charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium text-sm truncate ${isOwnMessage ? 'text-blue-600' : ''}`}>
                          {getUserName(message)}
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
    </Card>
  ), [
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
    isSubscribed,
    loading,
    getUserName
  ]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      console.log('[DatabaseChat] Chat opened, focusing input.');
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      console.log('[DatabaseChat] Scrolling to bottom of messages.');
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-full max-w-md z-50">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary text-primary-foreground">
            <CardTitle className="text-lg">Event Chat</CardTitle>
            <Button variant="ghost" size="icon" onClick={onToggle} className="text-primary-foreground hover:bg-primary/80">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 h-96 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading messages...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-full max-w-md z-50">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary text-primary-foreground">
            <CardTitle className="text-lg">Event Chat</CardTitle>
            <Button variant="ghost" size="icon" onClick={onToggle} className="text-primary-foreground hover:bg-primary/80">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 h-96 flex flex-col items-center justify-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please log in to participate in the chat.</p>
            {/* You might want to add a login button here */}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canChat && !loading) { // Ensure not to show this if still loading
     console.log('[DatabaseChat] Rendering: User cannot chat.');
    return (
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-full max-w-md z-50">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary text-primary-foreground">
            <CardTitle className="text-lg">Event Chat</CardTitle>
            <Button variant="ghost" size="icon" onClick={onToggle} className="text-primary-foreground hover:bg-primary/80">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 h-96 flex flex-col items-center justify-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              You do not have permission to view or send messages for this event. <br />
              Only event participants and the host can access the chat.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main chat UI
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
