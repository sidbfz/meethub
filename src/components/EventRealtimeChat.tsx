"use client";

import { RealtimeChat } from '@/components/realtime-chat';
import { 
  MessageCircle, 
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/authStore';

interface EventRealtimeChatProps {
  eventId: string;
  isParticipant: boolean;
  isHost: boolean;
  participantCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export default function EventRealtimeChat({ 
  eventId, 
  isParticipant, 
  isHost,
  participantCount,
  isOpen,
  onToggle
}: EventRealtimeChatProps) {
  const { user } = useAuthStore();

  const canChat = user && (isParticipant || isHost);

  if (!isOpen) return null;

  // Debug: Log user data
  console.log('EventRealtimeChat - User:', user);
  console.log('EventRealtimeChat - Can Chat:', canChat);
  console.log('EventRealtimeChat - Event ID:', eventId);

  const username = user?.user_metadata?.full_name || user?.email || 'Anonymous';
  console.log('EventRealtimeChat - Username:', username);

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

      <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
        {!canChat ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              {!user ? 'Login to join the conversation' : 'Join this event to participate in chat'}
            </p>
          </div>        ) : (
          <div className="h-full">
            {/* Wrap in error boundary */}
            {(() => {
              try {
                return (
                  <RealtimeChat
                    roomName={`event-${eventId}`}
                    username={username}
                  />
                );
              } catch (error) {
                console.error('RealtimeChat error:', error);
                return (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-red-500">Chat temporarily unavailable</p>
                  </div>
                );
              }
            })()}
          </div>
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
