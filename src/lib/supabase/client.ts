// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Supabase URL is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_URL.');
  throw new Error('Supabase URL is missing. App cannot initialize.');
}
if (!supabaseAnonKey) {
  console.error('Supabase Anon Key is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  throw new Error('Supabase Anon Key is missing. App cannot initialize.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
