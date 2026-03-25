import type { SupabaseClient } from '@supabase/supabase-js';

export async function trackEngagementEvent(
  supabase: SupabaseClient,
  eventName: string,
  walletAddress: string | null,
  properties: Record<string, unknown>,
  source: string = 'app'
) {
  try {
    await supabase.from('engagement_events').insert({
      wallet_address: walletAddress,
      event_name: eventName,
      properties,
      source,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Analytics must never block product flows.
    console.warn(`Failed to record engagement event ${eventName}:`, error);
  }
}
