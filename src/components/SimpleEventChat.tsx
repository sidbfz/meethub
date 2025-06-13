"use client";

import { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/stores/authStore';

interface SimpleEventChatProps {
  eventId: string;
  isParticipant: boolean;
  isHost: boolean;
  participantCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SimpleEventChat({ 
  eventId, 
  isParticipant, 
  isHost,
  participantCount,
  isOpen,
  onToggle
}: SimpleEventChatProps) {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canChat = user && (isParticipant || isHost);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !canChat) return;

    const newMessage = {
      id: Date.now().toString(),
      content: message,
      user: {
        name: user?.user_metadata?.full_name || user?.email || 'Anonymous'
      },
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const ChatContent = () => (
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
        {!canChat ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              {!user ? 'Login to join the conversation' : 'Join this event to participate in chat'}
            </p>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {msg.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">{msg.user.name}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t pt-4">
              <Input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!message.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );

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
            <ChatContent />
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
            <ChatContent />
          </div>
        </div>
      </div>
    </>
  );
}
