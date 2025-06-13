"use client";

import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Plus } from 'lucide-react';

export default function AuthNavigation() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (user) {
    // Authenticated user
    return (
      <div className="flex items-center gap-4">
        <Link href="/my-events">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            My Events
          </Button>
        </Link>
        <Link href="/create-event">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </Link>
        <span className="text-sm text-gray-600">
          Welcome, {user.user_metadata?.full_name || user.email}!
        </span>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    );
  }

  // Unauthenticated user
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.push('/login')}>
        Sign In
      </Button>
      <Button onClick={() => router.push('/signup')}>
        Sign Up
      </Button>
    </div>
  );
}
