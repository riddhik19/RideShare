import { SupabaseClient } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<R = any, P = any>(
      fn: 'get_driver_rating_summary',
      params: P
    ): Promise<{ data: R; error: any }>;

    rpc<R = any, P = any>(
      fn: 'submit_driver_rating',
      params: P
    ): Promise<{ data: R; error: any }>;
  }
}
