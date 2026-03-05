import { supabase } from "@/integrations/supabase/client";

let cachedCentreId: string | null = null;

/**
 * Get the current user's primary centre_id (cached).
 * Falls back to RPC if not cached. Cache is cleared on auth state change.
 */
export async function getUserCentreId(): Promise<string> {
  if (cachedCentreId) return cachedCentreId;
  const { data } = await supabase.rpc('get_user_centre_id');
  if (data) {
    cachedCentreId = data;
  }
  return data ?? '';
}

export function clearCentreIdCache() {
  cachedCentreId = null;
}

// Clear cache on auth state change
supabase.auth.onAuthStateChange(() => {
  cachedCentreId = null;
});
