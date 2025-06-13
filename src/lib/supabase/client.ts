
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  const message = 'Supabase URL is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local file.';
  console.error(message);
  throw new Error(message);
}
// Basic check to see if it looks like a URL. Supabase client will do more thorough validation.
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    const message = `Supabase URL "${supabaseUrl}" does not seem to be a valid URL. Please check NEXT_PUBLIC_SUPABASE_URL in your .env.local file. It should start with http:// or https://.`;
    console.error(message);
    throw new Error(message);
}

if (!supabaseAnonKey) {
  const message = 'Supabase Anon Key is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.';
  console.error(message);
  throw new Error(message);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
