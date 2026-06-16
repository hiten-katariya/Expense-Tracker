import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { Profile, Workspace } from '@/types';
import { supabase, getProfile } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  workspace: Workspace | null;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      workspace: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setWorkspace: (workspace) => set({ workspace }),
      setLoading: (isLoading) => set({ isLoading }),

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            set({ user: session.user });
            const profile = await getProfile(session.user.id);
            set({ profile });

            const { data: workspaces } = await supabase
              .from('workspaces')
              .select('*')
              .eq('owner_id', session.user.id)
              .eq('is_personal', true)
              .single();

            if (workspaces) {
              set({ workspace: workspaces });
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, workspace: null });
      },

      refreshProfile: async () => {
        const { user } = get();
        if (user) {
          try {
            const profile = await getProfile(user.id);
            set({ profile });
          } catch (error) {
            console.error('Error refreshing profile:', error);
          }
        }
      },
    }),
    {
      name: 'expense-tracker-auth',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        workspace: state.workspace,
      }),
    }
  )
);

supabase.auth.onAuthStateChange(async (event, session) => {
  const { setUser, setProfile } = useAuthStore.getState();

  if (event === 'SIGNED_IN' && session?.user) {
    setUser(session.user);
    try {
      const profile = await getProfile(session.user.id);
      setProfile(profile);
    } catch (error) {
      console.error('Error fetching profile after sign in:', error);
    }
  } else if (event === 'SIGNED_OUT') {
    setUser(null);
    setProfile(null);
  } else if (event === 'TOKEN_REFRESHED' && session?.user) {
    setUser(session.user);
  }
});
