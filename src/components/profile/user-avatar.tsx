// src/components/profile/user-avatar.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/lib/types';

interface UserAvatarProps {
  user: Pick<User, 'name' | 'avatarUrl'>;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  const avatarSize = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  return (
    <Avatar className={avatarSize[size]}>
      <AvatarImage src={user.avatarUrl} alt={user.name} />
      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
