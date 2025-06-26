'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Shield,
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  MapPin, 
  Calendar,
  Users,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/stores/authStore';
import { useModeratorData } from '@/lib/hooks/useModeratorData';
import Link from 'next/link';
import Image from 'next/image';

export default function ModeratorDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const hasScrolledToTop = useRef(false);

  const {
    pendingEvents,
    approvedEvents,
    rejectedEvents,
    concludedEvents,
    cancelledEvents,
    stats,
    loading,
    actionLoading,
    approveEvent,
    rejectEvent,
    refreshData
  } = useModeratorData();

  // Prevent auto-scroll to bottom on page load/reload
  useEffect(() => {
    if (!hasScrolledToTop.current) {
      // Scroll to top immediately when component mounts
      window.scrollTo(0, 0);
      hasScrolledToTop.current = true;
      
      // Also prevent any future automatic scroll restoration
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
    }
  }, []);

  // Ensure we stay at top when data loads
  useEffect(() => {
    if (!loading && hasScrolledToTop.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 50);
    }
  }, [loading]);
  // Safe date formatting
  const safeFormatDate = (dateString: string, formatStr: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, formatStr);
    } catch (error) {
      return 'Invalid date';
    }
  };  // Event card component
  const EventCard = ({ event, showActions = false }: { event: any, showActions?: boolean }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/event/${event.id}`)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between -mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">{event.title}</h3>
            <Badge 
              variant={
                event.status === 'approved' ? 'default' : 
                event.status === 'rejected' ? 'destructive' : 
                event.status === 'concluded' ? 'default' :
                event.status === 'cancelled' ? 'destructive' :
                'secondary'
              }
              className={`w-fit text-xs ${
                event.status === 'approved' ? 'bg-green-100 text-green-800' :
                event.status === 'rejected' ? 'bg-red-100 text-red-800' :
                event.status === 'concluded' ? 'bg-purple-100 text-purple-800' :
                event.status === 'cancelled' ? 'bg-gray-100 text-red-800' :
                'bg-orange-100 text-orange-800'
              }`}
            >
              {event.status === 'pending_approval' ? 'Pending' : 
               event.status === 'approved' ? 'Approved' : 
               event.status === 'rejected' ? 'Rejected' :
               event.status === 'concluded' ? 'Concluded' :
               event.status === 'cancelled' ? 'Cancelled' :
               'Unknown'}
            </Badge>
          </div>
          <p className="text-gray-600 mb-3 text-sm sm:text-base line-clamp-2 sm:line-clamp-3">{event.description}</p>
          
          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{safeFormatDate(event.date_time, 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{safeFormatDate(event.date_time, 'hh:mm a')}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{event.city}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{event.participants_count || event.current_participants || (event.participants as any)?.filter((p: any) => p.status === 'joined').length || 0}/{event.max_participants}</span>
            </div>
          </div>

          {event.host && (
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                <AvatarImage src={event.host.avatar_url} />
                <AvatarFallback className="text-xs sm:text-sm">{event.host.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{event.host.full_name || 'Unknown Host'}</p>
                <p className="text-xs text-gray-500 truncate">{event.host.email}</p>
              </div>
            </div>
          )}
        </div>        {event.image_url && (
          <div className="w-full sm:w-32 md:w-40 lg:w-48 sm:ml-4 flex-shrink-0 order-first sm:order-last">
            <Image
              src={event.image_url}
              alt={event.title}
              width={200}
              height={160}
              className="w-full h-32 sm:h-full sm:min-h-[120px] md:min-h-[140px] lg:min-h-[160px] rounded-lg object-cover"
            />
          </div>
        )}
      </div>      {showActions && event.status === 'pending_approval' && (
        <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              approveEvent(event.id);
            }}
            disabled={actionLoading === event.id}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
          >
            {actionLoading === event.id ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1 sm:mr-2" />
            ) : (
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            )}
            Approve
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              rejectEvent(event.id);
            }}
            disabled={actionLoading === event.id}
            size="sm"
            variant="destructive"
            className="flex-1 text-sm"
          >
            {actionLoading === event.id ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1 sm:mr-2" />
            ) : (
              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            )}
            Reject
          </Button>
        </div>
      )}
    </div>
  );  // No need to check user role here since it's already checked in the page component
  return (
    <div className="container mx-auto px-2 sm:px-4 pb-8">
      {/* Events Tabs */}
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tabs */}
          <TabsList className="hidden lg:grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Approved ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Rejected ({stats.rejected})
            </TabsTrigger>
            <TabsTrigger value="concluded" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Concluded ({stats.concluded})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Cancelled ({stats.cancelled})
            </TabsTrigger>
          </TabsList>

          {/* Mobile Dropdown Menu */}
          <div className="lg:hidden mb-6">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select event status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Pending ({stats.pending})
                  </div>
                </SelectItem>
                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Approved ({stats.approved})
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Rejected ({stats.rejected})
                  </div>
                </SelectItem>
                <SelectItem value="concluded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    Concluded ({stats.concluded})
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-gray-600" />
                    Cancelled ({stats.cancelled})
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

            <TabsContent value="pending">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading pending events...</span>
                </div>
              ) : pendingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-600">No events pending approval at the moment.</p>
                </div>              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {pendingEvents.map((event) => (
                    <EventCard key={event.id} event={event} showActions={true} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm sm:text-base text-gray-600">Loading approved events...</span>
                </div>
              ) : approvedEvents.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No approved events</h3>
                  <p className="text-sm sm:text-base text-gray-600">Approved events will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {approvedEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm sm:text-base text-gray-600">Loading rejected events...</span>
                </div>
              ) : rejectedEvents.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <XCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No rejected events</h3>
                  <p className="text-sm sm:text-base text-gray-600">Rejected events will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {rejectedEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="concluded">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm sm:text-base text-gray-600">Loading concluded events...</span>
                </div>
              ) : concludedEvents.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No concluded events</h3>
                  <p className="text-sm sm:text-base text-gray-600">Concluded events will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {concludedEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cancelled">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm sm:text-base text-gray-600">Loading cancelled events...</span>
                </div>
              ) : cancelledEvents.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <XCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No cancelled events</h3>
                  <p className="text-sm sm:text-base text-gray-600">Cancelled events will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {cancelledEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
