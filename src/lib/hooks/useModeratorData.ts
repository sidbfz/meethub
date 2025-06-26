import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import toast from 'react-hot-toast';

interface PendingEvent {
  id: string;
  title: string;
  description: string;
  date_time: string;
  address: string;
  city: string;
  category: string;
  max_participants: number;
  current_participants: number; // Calculated from actual participant count
  image_url: string;
  status: string;
  created_at: string;
  host_id: string;
  host: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

interface EventStats {
  pending: number;
  approved: number;
  rejected: number;
  concluded: number;
  cancelled: number;
  total: number;
}

export function useModeratorData() {
  const { user } = useAuthStore();  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<PendingEvent[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<PendingEvent[]>([]);
  const [concludedEvents, setConcludedEvents] = useState<PendingEvent[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<PendingEvent[]>([]);
  const [stats, setStats] = useState<EventStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    concluded: 0,
    cancelled: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Fetch all events by status
  const fetchEventsByStatus = async (status: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host:users!events_host_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching ${status} events:`, error);
        toast.error(`Failed to load ${status} events`);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(`Error fetching ${status} events:`, error);
      toast.error(`Failed to load ${status} events`);
      return [];
    }
  };  // Fetch all events with participant counts
  const fetchAllEvents = async () => {
    try {
      const [pending, approved, rejected, concluded, cancelled] = await Promise.all([
        fetchEventsByStatus('pending_approval'),
        fetchEventsByStatus('approved'),
        fetchEventsByStatus('rejected'),
        fetchEventsByStatus('concluded'),
        fetchEventsByStatus('cancelled')
      ]);

      // Fetch participant counts for all events
      const allEvents = [...pending, ...approved, ...rejected, ...concluded, ...cancelled];
      const eventsWithCounts = await Promise.all(
        allEvents.map(async (event) => {
          try {
            const { count } = await supabase
              .from('event_participants')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('status', 'joined');
            
            return {
              ...event,
              current_participants: count || 0
            };
          } catch (error) {
            console.warn(`Error fetching participant count for event ${event.id}:`, error);
            return {
              ...event,
              current_participants: 0
            };
          }
        })
      );

      // Separate events back into categories with participant counts
      const pendingWithCounts = eventsWithCounts.filter(e => e.status === 'pending_approval');
      const approvedWithCounts = eventsWithCounts.filter(e => e.status === 'approved');
      const rejectedWithCounts = eventsWithCounts.filter(e => e.status === 'rejected');
      const concludedWithCounts = eventsWithCounts.filter(e => e.status === 'concluded');
      const cancelledWithCounts = eventsWithCounts.filter(e => e.status === 'cancelled');

      setPendingEvents(pendingWithCounts);
      setApprovedEvents(approvedWithCounts);
      setRejectedEvents(rejectedWithCounts);
      setConcludedEvents(concludedWithCounts);
      setCancelledEvents(cancelledWithCounts);

      // Update stats
      setStats({
        pending: pendingWithCounts.length,
        approved: approvedWithCounts.length,
        rejected: rejectedWithCounts.length,
        concluded: concludedWithCounts.length,
        cancelled: cancelledWithCounts.length,
        total: eventsWithCounts.length
      });
    } catch (error) {
      console.error('Error fetching all events:', error);
      toast.error('Failed to load events');
    }};

  // Handle event approval
  const approveEvent = async (eventId: string) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setActionLoading(eventId);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('No valid session found');
        return;
      }
      
      const response = await fetch('/api/moderator/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          eventId,
          action: 'approve',
          userId: user.id
        }),
      });      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || 'Failed to approve event');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Event approved successfully');
        
        // Remove from pending list
        setPendingEvents(prev => prev.filter(event => event.id !== eventId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: prev.pending - 1,
          approved: prev.approved + 1
        }));
      } else {
        throw new Error(result.error || 'Failed to approve event');
      }
      
    } catch (error) {
      console.error('Error approving event:', error);
      toast.error('Failed to approve event');
    } finally {
      setActionLoading(null);
    }
  };  // Handle event rejection
  const rejectEvent = async (eventId: string) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setActionLoading(eventId);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('No valid session found');
        return;
      }
      
      const response = await fetch('/api/moderator/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          eventId,
          action: 'reject',
          userId: user.id
        }),
      });      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || 'Failed to reject event');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Event rejected');
        
        // Remove from pending list
        setPendingEvents(prev => prev.filter(event => event.id !== eventId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: prev.pending - 1,
          rejected: prev.rejected + 1
        }));
      } else {
        throw new Error(result.error || 'Failed to reject event');
      }
      
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast.error('Failed to reject event');
    } finally {
      setActionLoading(null);
    }
  };
  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    await fetchAllEvents();
    setLoading(false);
  };

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);
  return {
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
  };
}
