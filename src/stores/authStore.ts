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
  signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Fallback client-side profile creation in case PostgreSQL trigger fails or database has delays
async function createProfileFallback(user: User): Promise<Profile | null> {
  console.log("createProfileFallback: Profile not found. Attempting automatic profile creation fallback...", user);
  try {
    const isVerified = !!user.email_confirmed_at;
    const meta = user.user_metadata || {};
    
    // Determine completeness based on whether metadata has required parameters
    const completed = !!(
      meta.full_name && meta.full_name.trim() !== "" &&
      meta.phone_number && meta.phone_number.trim() !== "" &&
      meta.city && meta.city.trim() !== "" &&
      meta.state && meta.state.trim() !== "" &&
      meta.country && meta.country.trim() !== "" &&
      meta.pincode && meta.pincode.trim() !== ""
    );

    const newProfile = {
      id: user.id,
      email: user.email || '',
      full_name: meta.full_name || null,
      avatar_url: meta.avatar_url || null,
      currency_code: 'INR',
      preferred_currency: 'INR',
      role: 'member' as const,
      mfa_enabled: false,
      email_verified_at: user.email_confirmed_at || null,
      email_verified: isVerified,
      profile_completed: completed,
      phone_number: meta.phone_number || null,
      city: meta.city || null,
      state: meta.state || null,
      country: meta.country || null,
      pincode: meta.pincode || null,
    };

    console.log("createProfileFallback: Inserting profile row:", newProfile);
    const { data, error } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .maybeSingle();

    if (error) {
      console.error("createProfileFallback: Error inserting fallback profile:", error);
      throw error;
    }
    
    console.log("createProfileFallback: Fallback profile created successfully:", data);
    return data;
  } catch (error: any) {
    console.error("createProfileFallback: Exception caught while creating profile fallback:", error);
    if (error) {
      console.error("Error details:", error.code, error.message, error.details, error.hint);
    }
    return null;
  }
}

// Fallback client-side workspace and member creation
async function createPersonalWorkspace(userId?: string): Promise<Workspace | null> {
  const ownerId = userId || useAuthStore.getState().user?.id;
  console.log(`[createPersonalWorkspace] Initiating personal workspace creation for user: ${ownerId}`);
  
  if (!ownerId) {
    const errorMsg = "[createPersonalWorkspace] Error: ownerId is not populated from the current authenticated user.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Fix #3: Never Create Workspace Without Rechecking
  console.log("Checking personal workspace...");
  const existingWorkspace = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("is_personal", true)
    .maybeSingle();

  console.log("Workspace query result:", existingWorkspace.data);
  console.log("Workspace query error:", existingWorkspace.error);

  if (existingWorkspace.data) {
    console.log("Workspace already exists.");
    return existingWorkspace.data;
  }

  const payload = {
    name: "Personal Workspace",
    owner_id: ownerId,
    is_personal: true,
    default_currency_code: 'INR'
  };

  // Log the exact workspace insert payload
  console.log("Workspace insert payload:", payload);

  try {
    let workspace: Workspace | null = null;
    const { data: insertData, error: wError } = await supabase
      .from("workspaces")
      .insert(payload)
      .select()
      .maybeSingle();

    if (wError) {
      // Fix #4: Handle Duplicate Workspace Error Gracefully
      if (wError.code === "23505") {
        console.log("Workspace already exists. Fetching existing workspace.");
        const reQuery = await supabase
          .from("workspaces")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("is_personal", true)
          .maybeSingle();
        
        console.log("Workspace query result:", reQuery.data);
        console.log("Workspace query error:", reQuery.error);

        if (reQuery.data) {
          workspace = reQuery.data;
        } else {
          throw reQuery.error || new Error("Failed to fetch existing workspace after 23505 error");
        }
      } else {
        console.error(`[createPersonalWorkspace] Error inserting workspace record:`, wError);
        console.error(`[createPersonalWorkspace] Error details: code=${wError.code}, message=${wError.message}, details=${wError.details}, hint=${wError.hint}`);
        throw wError;
      }
    } else {
      workspace = insertData;
    }

    if (!workspace || !workspace.id) {
      const emptyError = new Error("[createPersonalWorkspace] Workspace creation failed: returned workspace object is empty or missing ID");
      console.error(emptyError.message);
      throw emptyError;
    }

    console.log(`[createPersonalWorkspace] Workspace created successfully:`, workspace);

    // Fix #5: Prevent Duplicate Membership Creation
    console.log(`[createPersonalWorkspace] Checking if workspace membership admin row already exists for workspace: ${workspace.id}, profile: ${ownerId}`);
    const { data: existingMembership, error: memCheckError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('profile_id', ownerId)
      .maybeSingle();

    if (memCheckError) {
      console.error(`[createPersonalWorkspace] Error checking membership existence:`, memCheckError);
    }

    if (!existingMembership) {
      console.log(`[createPersonalWorkspace] Creating workspace membership admin row for workspace: ${workspace.id}, profile: ${ownerId}`);
      const { error: mError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          profile_id: ownerId,
          member_role: 'admin',
          joined_at: new Date().toISOString()
        });

      if (mError) {
        console.error(`[createPersonalWorkspace] Error inserting workspace member row:`, mError);
        console.error(`[createPersonalWorkspace] Member error details: code=${mError.code}, message=${mError.message}, details=${mError.details}, hint=${mError.hint}`);
        throw mError;
      }
      console.log(`[createPersonalWorkspace] Workspace member admin record inserted successfully`);
    } else {
      console.log(`[createPersonalWorkspace] Workspace membership admin row already exists:`, existingMembership.id);
    }

    // Fix #6: Prevent Duplicate Category Seeding
    console.log(`[createPersonalWorkspace] Checking category count for workspace: ${workspace.id}`);
    const { count, error: countError } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id);

    if (countError) {
      console.error(`[createPersonalWorkspace] Error checking categories count:`, countError);
    }

    if (!countError && count === 0) {
      console.log(`[createPersonalWorkspace] Seeding default categories for workspace: ${workspace.id}`);
      try {
        const { seedDefaultCategories } = await import('@/lib/categories');
        await seedDefaultCategories(workspace.id);
        console.log(`[createPersonalWorkspace] Default categories seeding complete.`);
      } catch (catErr) {
        console.error(`[createPersonalWorkspace] Failed to seed default categories:`, catErr);
      }
    } else {
      console.log(`[createPersonalWorkspace] Categories already exist (count: ${count}), skipping seed.`);
    }

    return workspace;
  } catch (error: any) {
    console.error(`[createPersonalWorkspace] Exception caught during personal workspace creation flow. Stopping execution:`, error);
    throw error;
  }
}

let resourceInitializationRunning = false;

export async function ensureUserResources(user: User): Promise<{ profile: Profile | null; workspace: Workspace | null }> {
  // Fix #5: Add Global Initialization Lock
  if (resourceInitializationRunning) {
    console.log("[ensureUserResources] Resource initialization already running, returning current state.");
    const state = useAuthStore.getState();
    return { profile: state.profile, workspace: state.workspace };
  }

  resourceInitializationRunning = true;
  
  // Fix #6: Verify ensureUserResources Call Count
  console.count("ensureUserResources");
  console.log("ensureUserResources called");
  console.log(`[ensureUserResources] Verification sequence started for user: ${user.id} (${user.email})`);
  
  try {
    // 1. Ensure Profile exists
    let profile = await getProfile(user.id);
    if (!profile) {
      console.log(`[ensureUserResources] Profile not found for user ${user.id}. Creating fallback profile...`);
      profile = await createProfileFallback(user);
      if (profile) {
        console.log(`[ensureUserResources] Fallback profile created successfully:`, profile);
      } else {
        console.error(`[ensureUserResources] Critical: Fallback profile creation failed/returned null.`);
      }
    } else {
      console.log(`[ensureUserResources] Profile verified:`, profile);
    }

    // 2. Ensure Personal Workspace exists
    let workspace: Workspace | null = null;
    try {
      // Fix #2: Add Detailed Workspace Lookup Logging
      console.log("Checking personal workspace...");
      console.log(`[ensureUserResources] Querying workspaces for user: ${user.id}`);
      const { data, error: wSelectError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_personal', true)
        .maybeSingle();

      console.log("Workspace query result:", data);
      console.log("Workspace query error:", wSelectError);

      if (wSelectError) {
        console.error(`[ensureUserResources] Error querying workspaces:`, wSelectError);
        console.error(`[ensureUserResources] Workspace query details: code=${wSelectError.code}, message=${wSelectError.message}, details=${wSelectError.details}, hint=${wSelectError.hint}`);
      } else {
        workspace = data;
      }
    } catch (err) {
      console.error(`[ensureUserResources] Exception thrown when querying workspaces:`, err);
    }

    // Fix #8: Diagnostic Logging
    console.log("Workspace exists:", workspace?.id);

    // Recovery logic: If missing workspace, automatically create one.
    if (!workspace) {
      console.log(`[ensureUserResources] Personal workspace is missing (workspace == null). Triggering automatic workspace creation...`);
      try {
        workspace = await createPersonalWorkspace(user.id);
      } catch (createErr) {
        console.error(`[ensureUserResources] Workspace creation failed. Stopping resource verification sequence.`, createErr);
        return { profile, workspace: null };
      }
    } else {
      console.log(`[ensureUserResources] Personal workspace verified:`, workspace);
    }

    // 3. Ensure Workspace Membership and categories are seeded
    if (workspace) {
      let membership: any = null;
      // Membership double check
      try {
        console.log(`[ensureUserResources] Verifying workspace membership row for workspace: ${workspace.id}, profile: ${user.id}`);
        const { data: memData, error: memError } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (memError) {
          console.error(`[ensureUserResources] Error verifying membership row:`, memError);
        }
        
        membership = memData;

        // Fix #8: Diagnostic Logging
        console.log("Membership exists:", membership?.id);

        if (!membership) {
          console.log(`[ensureUserResources] Workspace membership row missing. Inserting admin membership row now...`);
          const { data: newMem, error: insertMemError } = await supabase
            .from('workspace_members')
            .insert({
              workspace_id: workspace.id,
              profile_id: user.id,
              member_role: 'admin',
              joined_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

          if (insertMemError) {
            console.error(`[ensureUserResources] Error inserting workspace membership row:`, insertMemError);
          } else {
            console.log(`[ensureUserResources] Workspace membership row inserted successfully.`);
            membership = newMem;
          }
        } else {
          console.log(`[ensureUserResources] Workspace membership row verified:`, membership);
        }
      } catch (memExc) {
        console.error(`[ensureUserResources] Exception caught while verifying workspace membership:`, memExc);
      }

      // Categories double check
      try {
        console.log(`[ensureUserResources] Checking category count for workspace: ${workspace.id}`);
        const { data: categories, error: countError } = await supabase
          .from('categories')
          .select('id')
          .eq('workspace_id', workspace.id);

        if (countError) {
          console.error(`[ensureUserResources] Error checking categories count:`, countError);
        } else {
          // Fix #8: Diagnostic Logging
          console.log("Categories count:", categories?.length);
        }

        if (!countError && (!categories || categories.length === 0)) {
          console.log(`[ensureUserResources] Categories count is 0. Triggering client-side categories seed...`);
          const { seedDefaultCategories } = await import('@/lib/categories');
          await seedDefaultCategories(workspace.id);
          console.log(`[ensureUserResources] Client-side category seeding completed.`);
        }
      } catch (catExc) {
        console.error(`[ensureUserResources] Exception caught while verifying categories count:`, catExc);
      }
    }

    console.log(`[ensureUserResources] Verification sequence complete for user: ${user.id}`);
    return { profile, workspace };
  } finally {
    resourceInitializationRunning = false;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error("Auth Error: getSession failed:", sessionError);
            throw sessionError;
          }

          console.log("[initialize] Auth State (Session):", session);
          if (session?.user) {
            const user = session.user;
            console.log("[initialize] User details:", user);
            // Always clear stale persisted workspace before running ensureUserResources
            // to prevent stale workspace_id from a previous session or deleted workspace
            set({ user, workspace: null });

            const { profile: profileData, workspace: workspaceData } = await ensureUserResources(user);
            console.log("[initialize] Profile details:", profileData);

            if (profileData) {
              const isVerified = !!user.email_confirmed_at;
              if (profileData.email_verified !== isVerified) {
                console.log(`[initialize] Syncing profile email_verified to ${isVerified}.`);
                await supabase
                  .from('profiles')
                  .update({
                    email_verified: isVerified,
                    email_verified_at: user.email_confirmed_at || null
                  })
                  .eq('id', user.id);
                profileData.email_verified = isVerified;
                profileData.email_verified_at = user.email_confirmed_at || null;
              }

              const completed = !!(
                profileData.full_name &&
                profileData.phone_number &&
                profileData.city &&
                profileData.state &&
                profileData.country &&
                profileData.pincode &&
                profileData.preferred_currency
              );

              const mergedProfile = {
                ...profileData,
                phone_number: profileData.phone_number || user.user_metadata?.phone_number || null,
                city: profileData.city || user.user_metadata?.city || null,
                state: profileData.state || user.user_metadata?.state || null,
                country: profileData.country || user.user_metadata?.country || null,
                pincode: profileData.pincode || user.user_metadata?.pincode || null,
                preferred_currency: profileData.preferred_currency || 'INR',
                email_verified: isVerified,
                profile_completed: completed,
              };
              set({ profile: mergedProfile });
            } else {
              set({ profile: null });
            }

            // Always overwrite workspace from fresh DB data — never trust persisted state
            set({ workspace: workspaceData ?? null });

            // Safety net: if ensureUserResources returned null workspace (e.g. lock was held
            // by a concurrent SIGNED_IN handler), do a direct DB lookup as last resort.
            if (!workspaceData) {
              console.log('[initialize] Workspace still null after ensureUserResources — attempting direct fallback fetch.');
              try {
                const { data: fallbackWs } = await supabase
                  .from('workspaces')
                  .select('*')
                  .eq('owner_id', user.id)
                  .eq('is_personal', true)
                  .maybeSingle();
                if (fallbackWs) {
                  console.log('[initialize] Fallback workspace fetch succeeded:', fallbackWs.id);
                  set({ workspace: fallbackWs });
                } else {
                  console.warn('[initialize] Fallback workspace fetch returned null — workspace may not exist in DB.');
                }
              } catch (fbErr) {
                console.error('[initialize] Fallback workspace fetch failed:', fbErr);
              }
            }
          } else {
            set({ user: null, profile: null, workspace: null });
          }
        } catch (error) {
          console.error('[initialize] Auth initialization error:', error);
          const { useUIStore } = await import('@/stores/uiStore');
          useUIStore.getState().addNotification({
            type: 'error',
            title: 'Authentication Error',
            message: 'Unable to load profile. Please try again.',
          });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signOut: async (options) => {
        console.log("signOut: Initiating sign out with options:", options);
        await supabase.auth.signOut(options);
        if (!options || options.scope !== 'others') {
          set({ user: null, profile: null, workspace: null });
        }
      },

      refreshProfile: async () => {
        try {
          // Re-fetch latest user from Supabase auth server to ensure session parameters are fully updated
          const { data: { user: latestUser }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;

          if (latestUser) {
            console.log("refreshProfile: Refreshed User details:", latestUser);
            set({ user: latestUser });
            console.log("refreshProfile: Refreshing profile info and ensuring resources for user id:", latestUser.id);
            const { profile: profileData, workspace: workspaceData } = await ensureUserResources(latestUser);
            console.log("refreshProfile: Refreshed Profile details:", profileData);

            if (profileData) {
              const isVerified = !!latestUser.email_confirmed_at;
              if (profileData.email_verified !== isVerified) {
                await supabase
                  .from('profiles')
                  .update({
                    email_verified: isVerified,
                    email_verified_at: latestUser.email_confirmed_at || null
                  })
                  .eq('id', latestUser.id);
                profileData.email_verified = isVerified;
                profileData.email_verified_at = latestUser.email_confirmed_at || null;
              }

              // Compute profile completeness client-side based on all required fields
              const completed = !!(
                profileData.full_name &&
                profileData.phone_number &&
                profileData.city &&
                profileData.state &&
                profileData.country &&
                profileData.pincode &&
                profileData.preferred_currency
              );

              const mergedProfile = {
                ...profileData,
                phone_number: profileData.phone_number || latestUser.user_metadata?.phone_number || null,
                city: profileData.city || latestUser.user_metadata?.city || null,
                state: profileData.state || latestUser.user_metadata?.state || null,
                country: profileData.country || latestUser.user_metadata?.country || null,
                pincode: profileData.pincode || latestUser.user_metadata?.pincode || null,
                preferred_currency: profileData.preferred_currency || 'INR',
                email_verified: isVerified,
                profile_completed: completed,
              };

              // Safely update database record of profile_completed flag
              if (profileData.profile_completed !== completed) {
                console.log(`refreshProfile: Syncing profile_completed to DB: ${completed}`);
                await supabase
                  .from('profiles')
                  .update({ profile_completed: completed })
                  .eq('id', latestUser.id);
              }

              set({ profile: mergedProfile });
            }
            if (workspaceData) {
              set({ workspace: workspaceData });
            }
          }
        } catch (error) {
          console.error('refreshProfile: Error refreshing profile:', error);
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

export async function handleAuthStateChange(event: string, session: any) {
  console.log(`[handleAuthStateChange] event=${event}`);

  // TOKEN_REFRESHED: Only update the user token in state.
  // Do NOT re-run ensureUserResources — initialize() already handled setup.
  if (event === 'TOKEN_REFRESHED' && session?.user) {
    console.log('[handleAuthStateChange] TOKEN_REFRESHED: updating user token only (no resource re-init).');
    useAuthStore.getState().setUser(session.user);
    return;
  }

  if (event === 'SIGNED_IN' && session?.user) {
    const user = session.user;
    const { user: currentUser, setUser, setProfile, setWorkspace } = useAuthStore.getState();

    // Check if the user is already set in store to prevent duplicate initialization on app load
    if (currentUser?.id === user.id) {
      console.log('[handleAuthStateChange] SIGNED_IN received for already active user — skipping resource initialization.');
      setUser(user); // keep user token fresh
      return;
    }

    console.log('[handleAuthStateChange] SIGNED_IN received for new session — executing resource initialization.');
    setUser(user);

    try {
      const { profile: profileData, workspace: workspaceData } = await ensureUserResources(user);

      // Insert login notification
      supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          workspace_id: workspaceData?.id || null,
          type: 'verification',
          title: 'New Sign In Detected',
          message: `New sign in detected for account: ${user.email}`,
          is_read: false
        })
        .then(({ error }) => {
          if (error) console.error("Error creating login notification:", error);
        });

      if (profileData) {
        const isVerified = !!user.email_confirmed_at;
        if (profileData.email_verified !== isVerified) {
          await supabase
            .from('profiles')
            .update({
              email_verified: isVerified,
              email_verified_at: user.email_confirmed_at || null
            })
            .eq('id', user.id);
          profileData.email_verified = isVerified;
          profileData.email_verified_at = user.email_confirmed_at || null;
        }

        const completed = !!(
          profileData.full_name &&
          profileData.phone_number &&
          profileData.city &&
          profileData.state &&
          profileData.country &&
          profileData.pincode &&
          profileData.preferred_currency
        );

        setProfile({
          ...profileData,
          phone_number: profileData.phone_number || user.user_metadata?.phone_number || null,
          city: profileData.city || user.user_metadata?.city || null,
          state: profileData.state || user.user_metadata?.state || null,
          country: profileData.country || user.user_metadata?.country || null,
          pincode: profileData.pincode || user.user_metadata?.pincode || null,
          preferred_currency: profileData.preferred_currency || 'INR',
          email_verified: isVerified,
          profile_completed: completed,
        });
      }

      // Only overwrite workspace if we got a real workspace back
      if (workspaceData) {
        setWorkspace(workspaceData);
      }
    } catch (error) {
      console.error('[handleAuthStateChange] Error during ensureUserResources:', error);
    }
  } else if (event === 'SIGNED_OUT') {
    const { setUser, setProfile, setWorkspace } = useAuthStore.getState();
    setUser(null);
    setProfile(null);
    setWorkspace(null);
  }
}
