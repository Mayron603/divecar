
// src/lib/supabase/client.ts
// This client is for use in Browser/Client Components
import { createBrowserClient } from "@supabase/ssr";

// Define a function to create the browser client
export const createSupabaseBrowserClient = () => { // Renamed for clarity
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    const message = 'Supabase URL is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_URL in your .env file.';
    console.error(message);
    throw new Error(message);
  }
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    const message = `Supabase URL "${supabaseUrl}" does not seem to be a valid URL. Please check NEXT_PUBLIC_SUPABASE_URL in your .env file. It should start with http:// or https://.`;
    console.error(message);
    throw new Error(message);
  }

  if (!supabaseAnonKey) {
    const message = 'Supabase Anon Key is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.';
    console.error(message);
    throw new Error(message);
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
