"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useRouter } from "next/navigation";
import EventCard from "@/components/EventCard";
import EventFilters from "@/components/EventFilters";
import { useAuthStore } from "@/lib/stores/authStore";
import { useEvents } from "@/lib/hooks/useEvents";
import { EventFilters as EventFiltersType } from "@/lib/types/event";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Grid, Map, User, Users, Calendar, Home as HomeIcon } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [filters, setFilters] = useState<EventFiltersType>({});
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useEvents(filters);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Auto-fetch next page when scroll near bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Listen for view mode changes from global header
  useEffect(() => {
    const handleViewModeChange = (event: CustomEvent) => {
      setViewMode(event.detail);
    };

    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);
    
    return () => {
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
    };
  }, []);

  // Get all events from all pages
  const allEvents = data?.pages.flatMap(page => page.events) || [];
  const totalResults = allEvents.length;

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Events</h1>
            <p className="text-gray-600">
              {error instanceof Error ? error.message : 'Something went wrong'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pt-4 pb-8">
        {/* Filters */}
        <div className="mb-8">
          <EventFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultsCount={totalResults}
          />
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          <>
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading events...</span>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && allEvents.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Grid className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No events found</h3>
                <p className="text-gray-600 mb-6">
                  {Object.keys(filters).length > 0
                    ? "Try adjusting your filters to find more events."
                    : "Be the first to create an event in your community!"}
                </p>
                {user && (
                  <Link href="/create-event">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Event
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* Events Grid */}
            {allEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {allEvents.map((event, index) => (
                  <EventCard
                    key={`${event.id}-${index}`}
                    event={event}
                  />
                ))}
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            {hasNextPage && (
              <div ref={ref} className="flex items-center justify-center py-8">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-gray-600">Loading more events...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of Results */}
            {!hasNextPage && allEvents.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  You've seen all {totalResults} events. Come back later for more!
                </p>
              </div>
            )}
          </>
        ) : (
          /* Map View Placeholder */
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-8 text-center">
            <Map className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Map View Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Interactive map view with event locations will be available soon.
            </p>
            <Button onClick={() => {
              setViewMode('grid');
              window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'grid' }));
            }} 
            variant="outline"
          >
            <Grid className="w-4 h-4 mr-2" />
            Switch to Grid View
          </Button>
          </div>
        )}
      </div>
    </div>
  );
}
