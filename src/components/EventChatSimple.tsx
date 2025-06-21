"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RealtimeChannel } from '@supabase/supabase-js';

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

interface EventChatSimpleProps {
  eventId: string;
}

export default function EventChatSimple({ eventId }: EventChatSimpleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');  const [connectionRetries, setConnectionRetries] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [justSentMessage, setJustSentMessage] = useState(false); // <-- Add this state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // Ensure this ref is present
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-focus input when component is ready and chat is accessible
  useEffect(() => {
    if (!loading && user && isParticipant && inputRef.current) {
      // Try focusing with a minimal delay to ensure modal/elements are settled
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          console.log('Attempted initial focus');
        }
      }, 0); // Minimal delay, effectively next tick
      return () => clearTimeout(timer);
    }
  }, [loading, user, isParticipant]); // Re-run when these crucial states change

  // Get current user and check participation
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
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
          
        const isCurrentUserHost = event?.host_id === user.id;
        const isEventParticipant = !!participation;
        
        setIsHost(isCurrentUserHost);
        setHostId(event?.host_id || null);
        setIsParticipant(isCurrentUserHost || isEventParticipant);
        console.log('User auth status:', { isHost: isCurrentUserHost, isEventParticipant, canChat: isCurrentUserHost || isEventParticipant });
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, [eventId]);  // Load messages from database (used on initial load and periodic refresh)
  const loadMessages = async () => {
    if (!user || !isParticipant) {
      console.log('📥 Skipping message load - user not authenticated or not participant');
      return;
    }

    try {
      console.log('📥 Loading messages from database for event:', eventId);
      console.log('📥 User ID:', user.id);
      console.log('📥 Is participant:', isParticipant);
      console.log('📥 Is host:', isHost);
        const { data, error } = await supabase
        .from('messages')        .select(`
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
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return;
      }

      // Get unique user IDs from messages
      const userIds = [...new Set((data || []).map(msg => msg.user_id))];
      console.log('👥 Unique user IDs in messages:', userIds);
      
      // Try to fetch user data (this might be limited by RLS)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      
      console.log('👥 Users data fetched:', usersData);
      console.log('👥 Users fetch error:', usersError);
      
      // Create a map of user data
      const usersMap = new Map();
      if (usersData) {
        usersData.forEach(user => {
          usersMap.set(user.id, user);
        });
      }

      // Transform the data to include user info
      const transformedMessages: Message[] = (data || []).map(item => {
        console.log('🔍 Processing message item:', item);
        
        const userInfo = usersMap.get(item.user_id);
        console.log('🔍 User info for message:', userInfo);

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

      console.log('📥 Loaded messages from database:', transformedMessages.length);
      console.log('📥 Sample message with user data:', transformedMessages[0]);
      setMessages(transformedMessages);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // Periodic refresh to ensure we don't miss any messages
  useEffect(() => {
    if (!user || !isParticipant || !eventId) return;

    // Refresh messages every 30 seconds as a safety net
    const refreshInterval = setInterval(() => {
      console.log('🔄 Periodic message refresh (safety net)');
      loadMessages();
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user, isParticipant, eventId]);// HYBRID APPROACH: Always load from database + use broadcast for real-time updates
  useEffect(() => {
    if (!user || !isParticipant || !eventId) return;

    console.log('🚀 Setting up hybrid chat for event:', eventId);
    
    // STEP 1: Always load all messages from database first
    loadMessages();

    // STEP 2: Set up broadcast channel for real-time updates
    const channel = supabase.channel(`event-chat-${eventId}`, {
      config: {
        broadcast: { self: true }
      }
    });
    
    channelRef.current = channel;

    // Listen for broadcast messages (primary real-time method)
    channel
      .on(
        'broadcast',
        { event: 'new-message' },
        (payload) => {
          console.log('📨 Received broadcast message:', payload);
          const broadcastMsg = payload.payload as BroadcastMessage;
          
          // Convert broadcast message to our Message format
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
            // Avoid duplicates - check if message already exists
            if (prev.find(msg => msg.id === newMsg.id)) {
              console.log('📨 Message already exists, skipping duplicate');
              return prev;
            }
            console.log('📨 Adding new broadcast message to chat');
            return [...prev, newMsg];
          });
        }
      )
      // Listen for message updates (soft deletes, edits)
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
      // FALLBACK: Postgres Changes as backup (in case broadcast fails)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          console.log('🔄 New message via postgres_changes (fallback):', payload);
          
          // Check if we already have this message (from broadcast)
          setMessages(prev => {
            if (prev.find(msg => msg.id === payload.new.id)) {
              console.log('🔄 Message already exists from broadcast, skipping postgres fallback');
              return prev;
            }
            
            // If not, we need to add it (broadcast might have failed)
            console.log('🔄 Adding message from postgres fallback');
            return [...prev, payload.new as Message];
          });
          
          // Reload all messages to ensure we have complete user data
          setTimeout(() => loadMessages(), 100);
        }
      )
      // Listen for message updates via postgres (soft deletes, etc.)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('🔄 Message updated via postgres_changes:', payload);
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } as Message : msg
            )
          );
        }
      )      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
        setConnectionStatus(status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully connected to hybrid chat system');
          setConnectionRetries(0); // Reset retry count on success
          
          // STEP 3: Reload messages after subscription to catch any sent during connection
          setTimeout(() => {
            console.log('🔄 Final message reload after subscription established');
            loadMessages();
          }, 1000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel connection error');
          // Auto-retry after a delay
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            retryConnection();
          }, 2000);
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Channel timed out, retrying...');
          // Auto-retry after a shorter delay for timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            retryConnection();
          }, 1000);
        }
      });    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up hybrid chat channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [user, isParticipant, eventId]);

  // Connection retry mechanism
  const retryConnection = useCallback(() => {
    if (connectionRetries >= 3) {
      console.log('❌ Max retries reached, giving up on realtime connection');
      setConnectionStatus('CHANNEL_ERROR');
      return;
    }

    console.log(`🔄 Retrying connection (attempt ${connectionRetries + 1}/3)`);
    setConnectionRetries(prev => prev + 1);
    
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Trigger a re-setup by updating a dependency
    setConnectionStatus('connecting');
  }, [connectionRetries]);

  // Monitor messages to detect if realtime is working
  useEffect(() => {
    if (messages.length !== lastMessageCount) {
      setLastMessageCount(messages.length);
      // Reset retry count on successful message reception
      if (connectionRetries > 0) {
        console.log('✅ Messages received, connection appears healthy');
        setConnectionRetries(0);
      }
    }
  }, [messages.length, lastMessageCount, connectionRetries]);

  // Auto-scroll to bottom and handle re-focus after sending a message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Refocus input if we just sent a message
    if (justSentMessage && inputRef.current) {
      inputRef.current.focus();
      setJustSentMessage(false);
    }
  }, [messages, justSentMessage]);
  // Send message using hybrid approach
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic UI: Add message immediately with temporary ID
    const optimisticMessage: Message = {
      id: tempId,
      event_id: eventId,
      user_id: user.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      users: {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
        avatar_url: user.user_metadata?.avatar_url,
      }
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage(''); // Clear input immediately

    try {
      // Insert into database first
      const { data, error } = await supabase
        .from('messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: messageContent,
        })
        .select('id, created_at')
        .single();

      if (error) {
        console.error('❌ Error sending message to database:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        alert('Failed to send message. Please try again.');
        setNewMessage(messageContent); // Restore message content
        setSending(false); // Ensure sending is false on error before return
        return;
      }

      console.log('✅ Message saved to database:', data);

      // Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: data.id, created_at: data.created_at }
            : msg
        )
      );

      // Broadcast to all connected clients for real-time updates
      if (channelRef.current && data) {
        // Get fresh user details for broadcast
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        const broadcastPayload: BroadcastMessage = {
          id: data.id,
          content: messageContent,
          user_id: user.id,
          user_name: userData?.full_name || user.email?.split('@')[0] || 'Anonymous',
          user_avatar: userData?.avatar_url,
          created_at: data.created_at,
        };

        console.log('📡 Broadcasting message to other clients:', broadcastPayload);
        channelRef.current.send({
          type: 'broadcast',
          event: 'new-message',
          payload: broadcastPayload,
        });
      }

      console.log('✅ Message sent successfully');
      setJustSentMessage(true); // Set flag to trigger focus in useEffect

    } catch (error) {
      console.error('❌ Unexpected error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert('Failed to send message. Please try again.');
      setNewMessage(messageContent); // Restore message content
    } finally {
      setSending(false);
      // The useEffect hook dependent on [messages, justSentMessage] will now handle the focus.
      // No need for requestAnimationFrame here.
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };  // Format display name with host indicator
  const getDisplayName = (msg: Message): string => {
    const isMessageFromHost = hostId && msg.user_id === hostId;
    
    // Try to get name from user data, fallback to user object, then Anonymous
    let baseName = 'Anonymous';
    if (msg.users?.full_name) {
      baseName = msg.users.full_name;
    } else if (msg.users?.email) {
      baseName = msg.users.email.split('@')[0];
    }
    
    // Add host indicator
    if (isMessageFromHost) {
      return `👑 ${baseName} (Host)`;
    }
    
    return baseName;
  };

  // Get display name without host indicator (for avatars and initials)
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
      <div className="h-full min-h-[500px] border rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading chat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full min-h-[500px] border rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-full">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please log in to join the chat</p>
        </div>
      </div>
    );
  }

  if (!isParticipant) {
    return (
      <div className="h-full min-h-[500px] border rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-full">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Only event participants can access the chat
          </p>
        </div>
      </div>
    );
  }  return (
    <div className="h-[85vh] md:h-[95vh] w-full flex flex-col border rounded-xl shadow-lg bg-white dark:bg-gray-900 overflow-hidden">      {/* Header */}
      <div className="py-2 md:py-3 px-4 md:px-6 pr-12 md:pr-16 border-b bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Event Chat
          </div>
          <div className="flex items-center gap-2 mr-2">
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
      </div>{/* Messages Area - Fixed height with scroll */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 min-h-0">
        <div className="px-3 md:px-4 py-3 md:py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-md mb-4">
                <MessageCircle className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No messages yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isFromCurrentUser = user && message.user_id === user.id;
              const isFromHost = hostId && message.user_id === hostId;
              
              return (
                <div key={message.id} className={`flex gap-3 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0">
                    <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-gray-700 shadow-sm">
                      <AvatarImage 
                        src={message.users?.avatar_url} 
                        alt={getDisplayName(message)}
                      />
                      <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                        {getInitials(message)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className={`flex-1 min-w-0 ${isFromCurrentUser ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-semibold text-sm flex items-center gap-1.5 ${
                        isFromHost 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {getBaseName(message)}
                        {isFromHost && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                            Host
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className={`inline-block max-w-[80%] ${isFromCurrentUser ? 'ml-auto' : ''}`}>
                      <div className={`rounded-2xl px-4 py-2.5 shadow-sm border ${
                        isFromCurrentUser 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 rounded-br-md' 
                          : isFromHost
                          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-amber-200 dark:border-amber-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-bl-md'
                      }`}>
                        <p className={`text-sm leading-relaxed ${
                          message.is_deleted 
                            ? 'text-gray-500 dark:text-gray-400 italic line-through' 
                            : isFromCurrentUser 
                            ? 'text-white'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {message.is_deleted ? 'This message was deleted' : message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>        {/* Input Area - Fixed at bottom */}
      <div className="border-t bg-white dark:bg-gray-900 p-3 md:p-4 flex-shrink-0">
        <div className="flex gap-2 md:gap-3 items-end">
          <div className="flex-1">            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl px-3 md:px-4 py-2 md:py-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none text-sm md:text-base"
              maxLength={1000}
              disabled={sending}
            />
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white h-10 w-10 md:h-12 md:w-12 flex-shrink-0 shadow-md transition-all duration-200"
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
  );
}