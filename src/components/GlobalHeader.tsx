'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Grid, Map, User, Users, Calendar, Home as HomeIcon, ArrowLeft, Menu, X, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';

export default function GlobalHeader() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  
  // Check if user is moderator
  const isModerator = user?.role === 'moderator';

  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Listen for view mode changes from other components
  useEffect(() => {
    const handleViewModeChange = (event: CustomEvent) => {
      if (event.detail === 'grid' || event.detail === 'map') {
        setViewMode(event.detail);
      }
    };

    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);

    return () => {
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
    };
  }, []);

  // Reset view mode to grid when returning to homepage
  useEffect(() => {
    if (pathname === '/') {
      setViewMode('grid');
    }
  }, [pathname]);  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);  // Don't show header on login, signup, auth callback pages
  if (pathname?.includes('/login') || pathname?.includes('/signup') || pathname?.includes('/auth/callback')) {
    return null;
  }

  // Check if we're on the home page to show view toggle
  const isHomePage = pathname === '/';

  // Emit view mode change event for home page to listen to
  const handleViewModeChange = (mode: 'grid' | 'map') => {
    setViewMode(mode);
    // Dispatch custom event for home page to listen to
    window.dispatchEvent(new CustomEvent('viewModeChange', { detail: mode }));
  };// Get page title based on current route
  const getPageTitle = () => {
    if (pathname === '/') return 'FistBump';
    if (pathname === '/my-events') return 'My Events';
    if (pathname?.includes('/profile')) return 'Profile';
    if (pathname === '/create-event') return 'Create Event';
    if (pathname?.includes('/event/') && pathname?.includes('/edit')) return 'Edit Event';
    if (pathname?.includes('/event/')) return 'Event Details';
    if (pathname === '/moderator') return 'Moderator Dashboard';
    return 'FistBump';
  };

  // Check if current page is active
  const isActivePage = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path === '/my-events' && pathname === '/my-events') return true;
    if (path === '/create-event' && pathname === '/create-event') return true;
    if (path === '/moderator' && pathname === '/moderator') return true;
    // For profile, only highlight if viewing own profile
    if (path === '/profile' && user) {
      return pathname === `/profile/${user.id}`;
    }
    if (path !== '/' && path !== '/profile' && pathname?.startsWith(path)) return true;
    return false;
  };

  // Check if we should show the back button (not on home page)
  const shouldShowBackButton = pathname !== '/';

  // Handle back button click
  const handleBackClick = () => {
    router.back();
  };  return (
    <div ref={menuRef} className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 border-b border-white/20 shadow-lg">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      <div className="absolute -top-5 -right-5 w-10 h-10 bg-white/5 rounded-full blur-xl"></div>
      <div className="absolute -bottom-5 -left-5 w-10 h-10 bg-white/5 rounded-full blur-xl"></div>
        <div className="relative z-10 container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Back Button - only show on non-home pages */}
            {shouldShowBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="text-white hover:bg-white/20 hover:text-white rounded-md p-1 h-6 w-6 min-h-0 min-w-0"
              >
                <ArrowLeft className="w-3 h-3" />
              </Button>
            )}
              <h1 className="text-base md:text-lg font-bold text-white drop-shadow-sm">
              {getPageTitle()}
            </h1>
          </div>          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle - always visible on home page */}
            {isHomePage && (
              <div className="flex rounded-md bg-white/20 backdrop-blur-sm p-0.5 border border-white/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewModeChange('grid')}
                  className={`rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                      : 'text-white hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Grid className="w-3 h-3 mr-0.5" />
                  Grid
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewModeChange('map')}
                  className={`rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 ${
                    viewMode === 'map' 
                      ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                      : 'text-white hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Map className="w-3 h-3 mr-0.5" />
                  Map
                </Button>
              </div>
            )}

            {/* Desktop Navigation - hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5">

              {/* Navigation Links */}
              {user && (
                <>                  {/* Main Navigation: Home, My Events, Profile, Moderator */}
                  <div className="flex rounded-md bg-white/20 backdrop-blur-sm p-0.5 border border-white/20">
                    <Link href="/">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 ${
                          isActivePage('/') 
                            ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                            : 'text-white hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        <HomeIcon className="w-3 h-3 mr-0.5" />
                        Home
                      </Button>
                    </Link>
                    <Link href="/my-events">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 ${
                          isActivePage('/my-events') 
                            ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                            : 'text-white hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        <Calendar className="w-3 h-3 mr-0.5" />
                        My Events
                      </Button>
                    </Link>
                    <Link href={`/profile/${user.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 ${
                          isActivePage('/profile') 
                            ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                            : 'text-white hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        <User className="w-3 h-3 mr-0.5" />
                        Profile
                      </Button>
                    </Link>
                    {/* Moderator Dashboard - only show for moderators */}
                    {isModerator && (
                      <Link href="/moderator">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 ${
                            isActivePage('/moderator') 
                              ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                              : 'text-white hover:bg-white/20 hover:text-white'
                          }`}
                        >
                          <Shield className="w-3 h-3 mr-0.5" />
                          Moderator
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Create Button - Separate */}
                  <div className="flex rounded-md bg-white/20 backdrop-blur-sm p-0.5 border border-white/20">
                    <Link href="/create-event">
                      <Button 
                        variant="ghost"
                        size="sm"
                        className={`rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 ${
                          isActivePage('/create-event')
                            ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200'
                            : 'text-white hover:bg-white/20 hover:text-white font-medium'
                        }`}
                      >
                        <Plus className="w-3 h-3 mr-0.5" />
                        Create
                      </Button>
                    </Link>
                  </div>
                </>
              )}

              {/* Sign In/Sign Up for non-authenticated users */}
              {!user && (
                <>
                  <div className="flex rounded-md bg-white/20 backdrop-blur-sm p-0.5 border border-white/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/login')}
                      className="rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 text-white hover:bg-white/20 hover:text-white"
                    >
                      Sign In
                    </Button>
                  </div>
                  <div className="flex rounded-md bg-white/20 backdrop-blur-sm p-0.5 border border-white/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/signup')}
                      className="rounded-sm transition-all text-xs px-1.5 py-0.5 h-6 min-h-0 text-white hover:bg-white/20 hover:text-white"
                    >
                      Sign Up
                    </Button>
                  </div>
                </>
              )}
            </div>            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:bg-white/20 hover:text-white rounded-md p-1 h-8 w-8 min-h-0 min-w-0"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div></div>
        </div>        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden container mx-auto px-4 pb-2">
            <div className="mt-2 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="space-y-2">
              {/* Navigation Links for authenticated users */}              {user && (                <>                  <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-end rounded-md transition-all text-sm px-3 py-2 h-9 min-h-0 ${
                        isActivePage('/') 
                          ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                          : 'text-white hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      Home
                      <HomeIcon className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/my-events" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-end rounded-md transition-all text-sm px-3 py-2 h-9 min-h-0 ${
                        isActivePage('/my-events') 
                          ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                          : 'text-white hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      My Events
                      <Calendar className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href={`/profile/${user.id}`} onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-end rounded-md transition-all text-sm px-3 py-2 h-9 min-h-0 ${
                        isActivePage('/profile') 
                          ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200' 
                          : 'text-white hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      Profile
                      <User className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>                  <Link href="/create-event" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-end rounded-md transition-all text-sm px-3 py-2 h-9 min-h-0 ${
                        isActivePage('/create-event')
                          ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200'
                          : 'text-white hover:bg-white/20 hover:text-white font-medium'
                      }`}
                    >
                      Create Event
                      <Plus className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  {/* Moderator Dashboard - only show for moderators */}
                  {isModerator && (
                    <Link href="/moderator" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-end rounded-md transition-all text-sm px-3 py-2 h-9 min-h-0 ${
                          isActivePage('/moderator')
                            ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-200'
                            : 'text-white hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        Moderator Dashboard
                        <Shield className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </>
              )}{/* Sign In/Sign Up for non-authenticated users */}
              {!user && (
                <>                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      router.push('/login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-end rounded-md transition-all text-sm px-3 py-2 h-9 min-h-0 text-white hover:bg-white/20 hover:text-white"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      router.push('/signup');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-end rounded-md transition-all text-sm px-3 py-2 h-9 min-h-0 text-white hover:bg-white/20 hover:text-white"
                  >
                    Sign Up                  </Button>
                </>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
