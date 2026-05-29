"use client";

import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Plus, User } from 'lucide-react';

export default function AuthNavigation() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };  if (user) {
    // Authenticated user
    return (
      <div className="flex items-center gap-0.5">
        <Link href={`/profile/${user.id}`}>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-white text-xs px-1.5 py-0.5 h-6 min-h-0">
            <User className="w-3 h-3 mr-0.5" />
            Profile
          </Button>
        </Link>
        <Link href="/my-events">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-white text-xs px-1.5 py-0.5 h-6 min-h-0">
            <Calendar className="w-3 h-3 mr-0.5" />
            My Events
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white hover:bg-white/20 hover:text-white text-xs px-1.5 py-0.5 h-6 min-h-0">
          Sign Out
        </Button>
      </div>
    );
  }  // Unauthenticated user
  return (
    <div className="flex gap-0.5">
      <Button variant="ghost" onClick={() => router.push('/login')} className="text-white hover:bg-white/20 hover:text-white text-xs px-1.5 py-0.5 h-6 min-h-0">
        Sign In
      </Button>
      <Button onClick={() => router.push('/signup')} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20 text-xs px-1.5 py-0.5 h-6 min-h-0">
        Sign Up
      </Button>
    </div>
  );
}
