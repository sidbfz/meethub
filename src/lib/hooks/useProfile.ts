import { useQuery } from '@tanstack/react-query';
import { profileService } from '@/lib/services/profileService';

export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      return profileService.getUserProfile(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if it's a "Profile not found" error
      if (error?.message === 'Profile not found') {
        return false;
      }
      return failureCount < 3;
    }
  });
}

export function useHostedEvents(userId: string | null) {
  return useQuery({
    queryKey: ['hosted-events', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      return profileService.getHostedEvents(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3
  });
}
