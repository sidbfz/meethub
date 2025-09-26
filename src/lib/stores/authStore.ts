import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Portfolio Demo: Enable demo authentication
const DEMO_MODE = true;

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  checkSession: () => Promise<void>
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,

  setUser: (user: User | null) => {
    set({ user })
  },setSession: (session: Session | null) => {
    set({ 
      session,
      user: session?.user || null 
    })
  },  checkSession: async () => {
    if (DEMO_MODE) {
      // Demo Mode: Check for stored demo user
      try {
        const demoUser = localStorage.getItem('demo_user');
        const isAuthenticated = localStorage.getItem('demo_authenticated') === 'true';
        
        if (demoUser && isAuthenticated) {
          const user = JSON.parse(demoUser);
          set({ 
            user,
            session: { user } as Session, // Mock session object
            isLoading: false
          });
        } else {
          set({ user: null, session: null, isLoading: false });
        }
      } catch (error) {
        console.error('Error checking demo session:', error);
        set({ user: null, session: null, isLoading: false });
      }
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error fetching session:', error)
        set({ user: null, session: null, isLoading: false })
        return
      }

      set({ 
        session,
        user: session?.user || null,
        isLoading: false
      })
    } catch (error) {
      console.error('Error in checkSession:', error)
      set({ user: null, session: null, isLoading: false })
    }
  },
  initialize: async () => {
    if (DEMO_MODE) {
      // Demo Mode: Initialize with demo authentication
      await get().checkSession();
      
      // Listen for demo auth changes
      const handleDemoAuthChange = (event: CustomEvent) => {
        const { user } = event.detail;
        set({ 
          user,
          session: { user } as Session,
          isLoading: false
        });
      };
      
      window.addEventListener('demo-auth-change', handleDemoAuthChange as EventListener);
      return;
    }

    // Get initial session
    await get().checkSession()    

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      set({ 
        session,
        user: session?.user || null,
        isLoading: false
      })
    })
  },

  signOut: async () => {
    if (DEMO_MODE) {
      // Demo Mode: Clear demo authentication
      localStorage.removeItem('demo_user');
      localStorage.removeItem('demo_authenticated');
      set({ user: null, session: null });
      
      // Redirect to home page
      window.location.href = '/';
      return;
    }

    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
        return
      }

      // Clear the store state
      set({ user: null, session: null })
    } catch (error) {
      console.error('Error in signOut:', error)
    }
  }
}))
