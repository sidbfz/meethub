import type { User } from '@supabase/supabase-js';
import { mockUsers } from '@/lib/mock-data';

export const DEMO_MODE = true;

export function createDemoAuthUser(email?: string, name?: string): User {
  const mockUser = mockUsers.find(user => user.email === email) || mockUsers[0];
  const fullName = name || mockUser.name;
  const userEmail = email || mockUser.email;
  const now = new Date().toISOString();

  return {
    id: mockUser.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: userEmail,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      full_name: fullName,
      name: fullName,
      avatar_url: mockUser.avatarUrl,
    },
    identities: [],
    created_at: `${mockUser.memberSince}T00:00:00Z`,
    updated_at: now,
  } as User;
}

export function persistDemoSession(user: User) {
  localStorage.setItem('demo_user', JSON.stringify(user));
  localStorage.setItem('demo_authenticated', 'true');
  window.dispatchEvent(new CustomEvent('demo-auth-change', { detail: { user } }));
}
