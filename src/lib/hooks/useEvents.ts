import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { eventsService } from '@/lib/services/eventsService';
import { EventFilters, Event, EventMessage } from '@/lib/types/event';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/stores/authStore';

export const useEvents = (filters: EventFilters = {}) => {
  return useInfiniteQuery({
    queryKey: ['events', 'approved', filters],
    queryFn: ({ pageParam = 0 }) => eventsService.getApprovedEvents(pageParam, filters),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useHostEvents = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['events', 'host', user?.id],
    queryFn: () => {
      if (!user) throw new Error('User not authenticated');
      return eventsService.getHostEvents(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useEventDetails = (eventId: string, initialData?: Event) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsService.getEventDetails(eventId),
    initialData,
    // If initialData is provided, set initialDataUpdatedAt to prevent immediate refetch if staleTime is short.
    // This tells React Query that the initialData is fresh as of its provision.
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useEventParticipants = (eventId: string) => {
  return useQuery({
    queryKey: ['event', eventId, 'participants'],
    queryFn: () => eventsService.getEventParticipants(eventId),
    staleTime: 1000 * 10, // Reduced staleTime to 10 seconds (was 30 seconds)
    refetchOnWindowFocus: true, // Explicitly enable refetch on window focus
  });
};

export const useIsParticipant = (eventId: string) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['event', eventId, 'participation', user?.id],
    queryFn: () => {
      if (!user) return false;
      return eventsService.isParticipant(eventId, user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useJoinEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => {
      if (!user) throw new Error('User not authenticated');
      return eventsService.joinEvent(eventId, user.id);
    },
    onSuccess: (_, { eventId }) => {
      toast.success('Successfully joined event!');
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participation'] });
    },
    onError: (error: any) => {
      console.error('Error joining event:', error);
      toast.error(error.message || 'Failed to join event');
    },
  });
};

export const useLeaveEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => {
      if (!user) throw new Error('User not authenticated');
      return eventsService.leaveEvent(eventId, user.id);
    },
    onSuccess: (_, { eventId }) => {
      toast.success('Successfully left event');
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['events'] }); // For general event lists

      // Explicitly invalidate participants and participation status for this event first
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participation'] });
      // Then invalidate the main event data, which might depend on the above or be displayed alongside
      queryClient.invalidateQueries({ queryKey: ['event', eventId] }); 
    },
    onError: (error: any) => {
      console.error('Error leaving event:', error);
      toast.error(error.message || 'Failed to leave event');
    },  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, updates }: { eventId: string; updates: Partial<Event> }) => {
      return eventsService.updateEvent(eventId, updates);
    },    onSuccess: (data) => {
      toast.success('Event updated successfully! It\'s now pending approval.');
      // Update the cached event data
      queryClient.setQueryData(['event', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: any) => {
      console.error('Error updating event:', error);
      toast.error(error.message || 'Failed to update event');
    },
  });
};

export const useCancelEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => {
      return eventsService.cancelEvent(eventId);
    },
    onSuccess: (_, { eventId }) => {
      toast.success('Event cancelled successfully');
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'participants'] });
    },
    onError: (error: unknown) => {
      console.error('Error cancelling event:', error);      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel event';
      toast.error(errorMessage);
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => {
      return eventsService.deleteEvent(eventId);
    },
    onSuccess: (_, { eventId }) => {
      toast.success('Event deleted successfully');
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'host'] });
    },
    onError: (error: unknown) => {
      console.error('Error deleting event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      toast.error(errorMessage);
    },
  });
};
