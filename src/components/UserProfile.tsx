'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  Edit,
  User,
  Star,
  LogOut,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { Event } from '@/lib/types/event';
import { useAuthStore } from '@/lib/stores/authStore';

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  created_at: string;
  participated_events?: {
    status: string;
    created_at: string;
    event: Event & {
      organizer?: {
        id: string;
        full_name: string;
      };
    };
  }[];
}

interface Props {
  profile: any;
  hostedEvents: any[];
  currentUser?: any;
  isLoading?: boolean;
}

export default function UserProfile({ profile, hostedEvents, currentUser, isLoading = false }: Props) {
  const [activeTab, setActiveTab] = useState('hosted');
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  // Prevent scroll restoration and ensure we start at top
  useEffect(() => {
    // Disable automatic scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Immediately scroll to top
    window.scrollTo(0, 0);
    
    // Set scrolled state after a brief delay to prevent flash
    setTimeout(() => setIsScrolled(true), 0);
    
    // Clean up on unmount
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await useAuthStore.getState().signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading state for content only
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-48 rounded-lg mb-6"></div>
            <div className="space-y-4">
              <div className="bg-gray-200 h-6 rounded w-3/4"></div>
              <div className="bg-gray-200 h-4 rounded w-1/2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where profile is still loading but we want to show content
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const participatedEvents = profile.participated_events?.map((pe: any) => pe.event) || [];
  
  const joinedEventsCount = participatedEvents.length;
  const hostedEventsCount = hostedEvents.length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };  const getEventStatusBadge = (event: any) => {
    const status = event.status || 'pending';
    
    let badgeColor = '';
    let badgeText = '';
      switch (status) {
      case 'approved':
        badgeColor = 'bg-green-100 text-green-800 border-green-200';
        badgeText = 'Live';
        break;
      case 'concluded':
        badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
        badgeText = 'Concluded';
        break;
      case 'cancelled':
        badgeColor = 'bg-red-100 text-red-800 border-red-200';
        badgeText = 'Cancelled';
        break;
      case 'pending':
      default:
        badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        badgeText = 'Pending';
        break;
    }
    
    return <Badge variant="outline" className={badgeColor}>{badgeText}</Badge>;
  };  return (
    <div style={{ opacity: isScrolled ? 1 : 0 }} className="transition-opacity duration-75">
      <div className="flex flex-col lg:flex-row gap-2 mb-2">        {/* Left side: Profile + Action Buttons (desktop only) */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Main Profile Container */}
          <Card className="flex-grow">
            <CardContent className="p-3 sm:p-4 h-full flex items-center">
              <div className="flex items-center gap-3 w-full">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
                      </div>
                    )}
                  </Avatar>
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 leading-tight">{profile.full_name}</h1>
                  <div className="flex items-center text-gray-500 text-xs sm:text-sm">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Joined {formatDate(profile.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons - Desktop only */}
          {currentUser && currentUser.id === profile.id && (
            <div className="hidden lg:flex flex-col sm:flex-row gap-2">
              <Link href="/profile/edit" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>

        {/* About Container */}
        <Card className="w-full lg:w-1/2 lg:flex-shrink-0">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {/* Bio */}
            {profile.bio ? (
              <p className="text-gray-700 mb-2 text-sm">{profile.bio}</p>
            ) : (
              <p className="text-gray-500 italic mb-2 text-sm">No bio added yet.</p>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Interests</h3>
                <div className="flex flex-wrap gap-1">
                  {profile.interests.map((interest: any, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}          </CardContent>        </Card>      </div>      {/* Action Buttons - Mobile only (above tabs section) */}
      {currentUser && currentUser.id === profile.id && (
        <div className="lg:hidden flex gap-3 mb-2 mt-2">
          <Link href="/profile/edit" className="w-1/2">
            <Button variant="outline" className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="w-1/2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-1 h-auto flex-wrap justify-start">
          <TabsTrigger value="hosted">Hosted Events</TabsTrigger>
          <TabsTrigger value="joined">Joined Events</TabsTrigger>
        </TabsList>{/* Hosted Events Tab */}
        <TabsContent value="hosted">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostedEvents.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No events hosted yet.</p>
                  </CardContent>
                </Card>
              </div>) : (              hostedEvents.map((event) => {
                const eventDate = new Date(event.date_time);
                const participantCount = event.participants_count || 0;
                
                return (
                  <Link key={event.id} href={`/event/${event.id}`} className="block">
                    <Card className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm border-0 overflow-hidden cursor-pointer p-0">
                      {/* Event Image */}
                      {event.image_url ? (
                        <div className="relative h-48 w-full">
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <div className="text-center">
                            <Calendar className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                            <p className="text-sm text-gray-600 font-medium">{event.category}</p>
                          </div>
                        </div>
                      )}
                      
                      <CardContent className="px-3 pb-3 -mt-5">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">{event.title}</h3>
                            <div className="flex items-center gap-2 mb-1">
                              {getEventStatusBadge(event)}
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {event.category}
                              </Badge>
                            </div>
                          </div>
                        </div>                        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 mb-1">
                          <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs md:text-sm font-medium truncate">{formatDate(event.date_time)}</p>
                              <p className="text-xs truncate">{new Date(event.date_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                            </div>
                          </div>

                          {event.city && (
                            <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                              <Building2 className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                              <p className="text-xs md:text-sm truncate">{event.city}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                            <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                            <p className="text-xs md:text-sm truncate">{participantCount} / {event.max_participants || 'No limit'}</p>
                          </div>
                        </div>                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </TabsContent>        {/* Joined Events Tab */}
        <TabsContent value="joined">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {participatedEvents.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No events joined yet.</p>
                  </CardContent>
                </Card>
              </div>) : (
              participatedEvents.map((event: any) => {
                const eventDate = new Date(event.date_time);
                
                return (
                  <Link key={event.id} href={`/event/${event.id}`} className="block">
                    <Card className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm border-0 overflow-hidden cursor-pointer p-0">
                      {/* Event Image */}
                      {event.image_url ? (
                        <div className="relative h-48 w-full">
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-48 w-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <div className="text-center">
                            <Calendar className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                            <p className="text-sm text-gray-600 font-medium">{event.category}</p>
                          </div>
                        </div>
                      )}
                      
                      <CardContent className="px-3 pb-3 -mt-5">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">{event.title}</h3>
                            <div className="flex items-center gap-2 mb-1">
                              {getEventStatusBadge(event)}
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {event.category}
                              </Badge>
                            </div>
                          </div>
                        </div>                        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 mb-1">
                          <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs md:text-sm font-medium truncate">{formatDate(event.date_time)}</p>
                              <p className="text-xs truncate">{new Date(event.date_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                            </div>
                          </div>                          {event.city && (
                            <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                              <Building2 className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                              <p className="text-xs md:text-sm truncate">{event.city}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                            <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                            <p className="text-xs md:text-sm truncate">{event.participants_count || 0} / {event.max_participants || 'No limit'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
