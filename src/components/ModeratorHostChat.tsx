"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RealtimeChannel } from '@supabase/supabase-js';

// Corrected Message interface to match Supabase's return structure for 'users'
interface Message {
  id: string;
  event_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
  // Supabase's `select` with foreign key often returns an array, even for one-to-one.
  // So, we type 'users' as an array of user objects.
  users?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  }[];
}

// BroadcastMessage interface (currently not directly used in this component's logic,
// but good to keep if it's a shared type or for future expansion)
interface BroadcastMessage {
  id: string;
  event_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
  sender_name: string;
  sender_avatar?: string;
}

interface ModeratorHostChatProps {
  eventId: string;
  hostId: string;
  moderatorId: string;
}

export default function ModeratorHostChat({ eventId, hostId, moderatorId }: ModeratorHostChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [justSentMessage, setJustSentMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input when component is ready
  useEffect(() => {
    if (!loading && user && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          console.log('Attempted initial focus');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  // Effect to get the current authenticated user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getCurrentUser();
  }, []);

  // Callback to load messages from the database
  const loadMessages = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        event_id,
        sender_id,
        receiver_id,
        message_text,
        created_at,
        users:sender_id ( id, full_name, email, avatar_url )
      `)
      .eq('event_id', eventId)
      .or(`(sender_id.eq.${moderatorId},receiver_id.eq.${hostId}),(sender_id.eq.${hostId},receiver_id.eq.${moderatorId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }
    setMessages(data as Message[]);
  }, [user, eventId, hostId, moderatorId]);

  // Effect to load initial messages when user is available
  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user, loadMessages]);

  // Connection retry mechanism
  const retryConnection = useCallback(() => {
    if (connectionRetries >= 3) {
      console.log('❌ Max retries reached, giving up on realtime connection');
      setConnectionStatus('CHANNEL_ERROR');
      return;
    }

    console.log(`🔄 Retrying connection (attempt ${connectionRetries + 1}/3)`);
    setConnectionRetries(prev => prev + 1);
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setConnectionStatus('connecting');
  }, [connectionRetries]);

  // Effect for Supabase Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`mod-host-chat-${eventId}`, {
      config: {
        broadcast: { self: true }
      }
    });

    channelRef.current = channel;

    channel
      .on(
        'broadcast',
        { event: 'new-message' },
        (payload) => {
          const newMsg = payload.payload as Message;
          setMessages(prev => {
            if (prev.some(msg => msg.id === newMsg.id)) {
                return prev;
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          setConnectionRetries(0);
          setTimeout(() => loadMessages(), 1000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel connection error');
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            retryConnection();
          }, 2000);
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Channel timed out, retrying...');
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            retryConnection();
          }, 1000);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [user, eventId, retryConnection]);

  // Auto-scroll to bottom and handle re-focus after sending a message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    if (justSentMessage && inputRef.current) {
      inputRef.current.focus();
      setJustSentMessage(false);
    }
  }, [messages, justSentMessage]);

  // Handler for sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    
    const receiverId = user.id === moderatorId ? hostId : moderatorId;

    const { data: insertedMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        event_id: eventId,
        sender_id: user.id,
        receiver_id: receiverId,
        message_text: messageContent,
      })
      .select(`
        id,
        event_id,
        sender_id,
        receiver_id,
        message_text,
        created_at,
        users:sender_id ( id, full_name, email, avatar_url )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      setSending(false);
      return;
    }

    if (channelRef.current && insertedMessage) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: insertedMessage,
      });
      setMessages(prev => [...prev, insertedMessage as Message]);
    }

    setNewMessage('');
    setSending(false);
    setJustSentMessage(true);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get display name (determine if moderator or host)
  const getDisplayName = (msg: Message): string => {
    const senderUser = msg.users?.[0];
    const isHost = msg.sender_id === hostId;
    const isModerator = msg.sender_id === moderatorId;
    
    let baseName = 'Anonymous';
    if (senderUser?.full_name) {
      baseName = senderUser.full_name;
    } else if (senderUser?.email) {
      baseName = senderUser.email.split('@')[0];
    }
    
    if (isHost) {
      return `👑 ${baseName} (Host)`;
    } else if (isModerator) {
      return `🛡️ ${baseName} (Moderator)`;
    }
    
    return baseName;
  };

  // Get base name without role indicator
  const getBaseName = (msg: Message): string => {
    const senderUser = msg.users?.[0];
    if (senderUser?.full_name) {
      return senderUser.full_name;
    } else if (senderUser?.email) {
      return senderUser.email.split('@')[0];
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
          <p className="text-muted-foreground">Please log in to access the chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[85vh] md:h-[95vh] w-full flex flex-col border rounded-xl shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="py-2 md:py-3 px-4 md:px-6 pr-12 md:pr-16 border-b bg-blue-50 dark:bg-blue-900/20 flex-shrink-0 rounded-t-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Private Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
              connectionStatus === 'SUBSCRIBED' ? 'text-green-600' :
              connectionStatus === 'CHANNEL_ERROR' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              <span className={`w-2 h-2 rounded-full inline-block ${
                connectionStatus === 'SUBSCRIBED' ? 'bg-green-500' :
                connectionStatus === 'CHANNEL_ERROR' ? 'bg-red-500' :
                'bg-yellow-500'
              }`} />
              {connectionStatus === 'SUBSCRIBED' ? 'Live' :
                connectionStatus === 'CHANNEL_ERROR' ? `Offline${connectionRetries > 0 ? ` (Retry ${connectionRetries}/3)` : ''}` :
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

      {/* Messages Area - Fixed height with scroll */}
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
              const isFromCurrentUser = user && message.sender_id === user.id;
              const isFromHost = message.sender_id === hostId;
              const isFromModerator = message.sender_id === moderatorId;
              
              return (
                <div key={message.id} className={`flex gap-3 ${isFromCurrentUser ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0">
                    <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-gray-700 shadow-sm">
                      <AvatarImage 
                        src={message.users?.[0]?.avatar_url} 
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
                          : isFromModerator
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {getBaseName(message)}
                        {isFromHost && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                            Host
                          </span>
                        )}
                        {isFromModerator && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700">
                            Moderator
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
                          : isFromModerator
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-bl-md'
                      }`}>
                        <p className={`text-sm leading-relaxed ${
                          isFromCurrentUser 
                            ? 'text-white'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {message.message_text}
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
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t bg-white dark:bg-gray-900 p-3 md:p-4 flex-shrink-0">
        <div className="flex gap-2 md:gap-3 items-end">
          <div className="flex-1">
            <Input
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