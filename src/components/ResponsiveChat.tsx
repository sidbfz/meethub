"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RealtimeChannel } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
  users?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface BroadcastMessage {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

interface ResponsiveChatProps {
  eventId: string;
  messages: Message[];
  messagesLoading: boolean;
  isParticipant: boolean;
  isHost: boolean;
  participantCount: number;
}

export default function ResponsiveChat({ 
  eventId, 
  messages: initialMessages, 
  messagesLoading, 
  isParticipant, 
  isHost,
  participantCount 
}: ResponsiveChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(messagesLoading);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [connectionRetries, setConnectionRetries] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external messages prop
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Sync loading state
  useEffect(() => {
    setLoading(messagesLoading);
  }, [messagesLoading]);

  // Get current user and host info
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Get host info
          const { data: event } = await supabase
            .from('events')
            .select('host_id')
            .eq('id', eventId)
            .single();
          
          setHostId(event?.host_id || null);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };

    getCurrentUser();
  }, [eventId]);

  // Load messages from database
  const loadMessages = async () => {
    if (!user || !isParticipant) {
      console.log('📥 Skipping message load - user not authenticated or not participant');
      return;
    }

    try {
      console.log('📥 Loading messages from database for event:', eventId);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          event_id,
          user_id,
          content,
          created_at,
          is_deleted,
          deleted_at
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading messages:', error);
        return;
      }

      // Get unique user IDs from messages
      const userIds = [...new Set((data || []).map(msg => msg.user_id))];
      
      // Try to fetch user data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      
      // Create a map of user data
      const usersMap = new Map();
      if (usersData) {
        usersData.forEach(user => {
          usersMap.set(user.id, user);
        });
      }

      // Transform the data to include user info
      const transformedMessages: Message[] = (data || []).map(item => {
        const userInfo = usersMap.get(item.user_id);

        return {
          id: item.id,
          event_id: item.event_id,
          user_id: item.user_id,
          content: item.content,
          created_at: item.created_at,
          is_deleted: item.is_deleted,
          deleted_at: item.deleted_at,
          users: userInfo
        };
      });

      setMessages(transformedMessages);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !isParticipant || !eventId) return;

    console.log('🚀 Setting up hybrid chat for event:', eventId);
    
    // Load all messages from database first
    loadMessages();

    // Set up broadcast channel for real-time updates
    const channel = supabase.channel(`event-chat-${eventId}`, {
      config: {
        broadcast: { self: true }
      }
    });
    
    channelRef.current = channel;

    // Listen for broadcast messages
    channel
      .on(
        'broadcast',
        { event: 'new-message' },
        (payload) => {
          console.log('📨 Received broadcast message:', payload);
          const broadcastMsg = payload.payload as BroadcastMessage;
          
          const newMsg: Message = {
            id: broadcastMsg.id,
            event_id: eventId,
            user_id: broadcastMsg.user_id,
            content: broadcastMsg.content,
            created_at: broadcastMsg.created_at,
            users: {
              id: broadcastMsg.user_id,
              full_name: broadcastMsg.user_name,
              avatar_url: broadcastMsg.user_avatar,
            }
          };

          setMessages(prev => {
            if (prev.find(msg => msg.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'broadcast',
        { event: 'message-updated' },
        (payload) => {
          console.log('📝 Received message update:', payload);
          const updatedMsg = payload.payload as Message;
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('🔌 Channel subscription status:', status);
        setConnectionStatus(status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionRetries(0);
        } else if (status === 'CHANNEL_ERROR') {
          // Implement retry logic
          if (connectionRetries < 3) {
            const timeout = setTimeout(() => {
              console.log(`🔄 Retrying connection... (${connectionRetries + 1}/3)`);
              setConnectionRetries(prev => prev + 1);
              channel.subscribe();
            }, 2000 * (connectionRetries + 1));
            
            retryTimeoutRef.current = timeout;
          }
        }
      });

    return () => {
      console.log('🧹 Cleaning up chat subscription');
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [user, isParticipant, eventId, connectionRetries]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: messageContent,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        toast.error('Failed to send message');
        setNewMessage(messageContent);
        return;
      }

      // Broadcast the new message to all connected clients
      const broadcastMessage: BroadcastMessage = {
        id: data.id,
        content: data.content,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        user_avatar: user.user_metadata?.avatar_url,
        created_at: data.created_at,
      };

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'new-message',
          payload: broadcastMessage,
        });
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setNewMessage(messageContent);
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

  // Retry connection
  const retryConnection = () => {
    if (channelRef.current) {
      setConnectionRetries(0);
      channelRef.current.subscribe();
    }
  };

  // Get display name with host indicator
  const getDisplayName = (msg: Message): string => {
    const isMessageFromHost = hostId && msg.user_id === hostId;
    
    let baseName = 'Anonymous';
    if (msg.users?.full_name) {
      baseName = msg.users.full_name;
    } else if (msg.users?.email) {
      baseName = msg.users.email.split('@')[0];
    }
    
    if (isMessageFromHost) {
      return `👑 ${baseName} (Host)`;
    }
    
    return baseName;
  };

  // Get display name without host indicator
  const getBaseName = (msg: Message): string => {
    if (msg.users?.full_name) {
      return msg.users.full_name;
    } else if (msg.users?.email) {
      return msg.users.email.split('@')[0];
    }
    return 'Anonymous';
  };

  // Get initials for avatar fallback
  const getInitials = (msg: Message): string => {
    const name = getBaseName(msg);
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="h-96 border rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading chat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-96 border rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-full">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please log in to join the chat</p>
        </div>
      </div>
    );
  }

  if (!isParticipant) {
    return (
      <div className="h-96 border rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-full">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Only event participants can access the chat
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 flex flex-col border rounded-lg shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="py-3 px-6 border-b bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Event Chat
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'SUBSCRIBED' ? 'bg-green-500' : 
              connectionStatus === 'CHANNEL_ERROR' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`} />
            <span className="text-xs text-muted-foreground font-medium">
              {connectionStatus === 'SUBSCRIBED' ? 'Live' : 
               connectionStatus === 'CHANNEL_ERROR' ? `Offline ${connectionRetries > 0 ? `(Retry ${connectionRetries}/3)` : ''}` : 
               'Connecting...'}
            </span>
            {connectionStatus === 'CHANNEL_ERROR' && connectionRetries < 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={retryConnection}
                className="h-6 px-2 text-xs hover:bg-blue-100 dark:hover:bg-blue-800"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isFromCurrentUser = user && message.user_id === user.id;
                const isFromHost = hostId && message.user_id === hostId;
                
                return (
                  <div key={message.id} className={`flex gap-3 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage 
                        src={message.users?.avatar_url} 
                        alt={getDisplayName(message)}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(message)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 min-w-0 ${isFromCurrentUser ? 'text-right' : ''}`}>
                      <div className={`flex items-baseline gap-2 mb-1 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}>
                        <span className={`font-medium text-sm flex items-center gap-1 ${
                          isFromHost 
                            ? 'text-amber-600 dark:text-amber-400 font-bold' 
                            : 'text-foreground'
                        }`}>
                          {getBaseName(message)}
                          {isFromHost && <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full">Host</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className={`inline-block max-w-[85%] shadow-sm ${
                        isFromCurrentUser 
                          ? 'bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl rounded-br-md px-4 py-2 ml-auto' 
                          : isFromHost
                          ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-r-2xl rounded-tl-2xl rounded-bl-md px-4 py-2'
                          : 'bg-gray-100 dark:bg-gray-800 rounded-r-2xl rounded-tl-2xl rounded-bl-md px-4 py-2'
                      }`}>
                        <p className={`text-sm break-words leading-relaxed ${
                          message.is_deleted 
                            ? 'text-muted-foreground italic line-through' 
                            : isFromCurrentUser 
                            ? 'text-white'
                            : 'text-foreground'
                        }`}>
                          {message.is_deleted ? 'This message was deleted' : message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4">
          <div className="flex gap-3 items-end">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              maxLength={1000}
              disabled={sending}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white h-12 w-12 flex-shrink-0 shadow-md"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
