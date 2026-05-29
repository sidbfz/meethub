// src/components/profile/profile-card.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User } from '@/lib/types';
import { MapPin, Calendar } from 'lucide-react';

interface ProfileCardProps {
  user: User;
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card shadow-sm">
      <div className="relative w-16 h-16 rounded-full overflow-hidden">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground text-xl font-semibold">
            {user.name.charAt(0)}
          </div>
        )}
      </div>
      <div>
        <Link href={`/profile/${user.id}`} className="text-lg font-semibold hover:underline">
          {user.name}
        </Link>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          {user.location && <MapPin className="h-3 w-3" />} {user.location}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Member since {new Date(user.memberSince).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
