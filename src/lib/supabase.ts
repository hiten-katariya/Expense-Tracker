import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

import type { Profile } from '@/types';

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  console.log("Profile payload:", updates);

  // Fetch current database profile for debugging audits
  try {
    const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    console.log("Database profile:", existing);
  } catch (err) {
    console.error("Error fetching current profile for audit:", err);
  }

  const payload: any = {};
  for (const key of Object.keys(updates)) {
    if (updates[key as keyof Profile] !== undefined) {
      payload[key] = updates[key as keyof Profile];
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Supabase Error Code:", error.code);
    console.error("Supabase Error Message:", error.message);
    console.error("Supabase Error Details:", error.details);
    console.error("Supabase Error Hint:", error.hint);

    // Self-healing fallback: If column is missing in hosted database (code 42703)
    if (error.code === '42703') {
      console.warn("Detected missing column error. Attempting self-healing fallback update with core profiles schema...");
      const fallbackPayload = {
        full_name: payload.full_name,
        currency_code: payload.currency_code,
        avatar_url: payload.avatar_url,
        phone_number: payload.phone_number,
        city: payload.city,
        state: payload.state,
        country: payload.country,
        pincode: payload.pincode
      };
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .update(fallbackPayload)
        .eq('id', userId)
        .select()
        .maybeSingle();
        
      if (fallbackError) {
        console.error("Supabase Fallback Error Code:", fallbackError.code);
        console.error("Supabase Fallback Error Message:", fallbackError.message);
        throw fallbackError;
      }
      return fallbackData;
    }
    throw error;
  }
  return data;
}
