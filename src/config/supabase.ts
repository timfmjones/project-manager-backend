import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

// Create Supabase client with service role key for backend operations
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create a client with anon key for public operations if needed
export const supabasePublic = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);