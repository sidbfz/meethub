import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

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
    // Get initial session
    await get().checkSession()    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      set({ 
        session,
        user: session?.user || null,
        isLoading: false
      })
    })
  },

  signOut: async () => {
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
