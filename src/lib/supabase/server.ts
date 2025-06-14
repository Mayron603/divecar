
// src/lib/supabase/server.ts
// This client is for use in Server Components, Server Actions, and Route Handlers
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type cookies as NextCookiesType } from "next/headers"; // Import the type of cookies()

// Define a function to create the server client
// It needs the cookieStore to be passed in from Server Components/Actions
export const createSupabaseServerClient = (cookieStore: ReturnType<typeof NextCookiesType>) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    const message = 'Supabase URL is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_URL in your .env file.';
    // This error will be caught server-side
    throw new Error(message);
  }
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    const message = `Supabase URL "${supabaseUrl}" does not seem to be a valid URL. Please check NEXT_PUBLIC_SUPABASE_URL in your .env file. It should start with http:// or https://.`;
    console.error(message);
    throw new Error(message);
  }
  if (!supabaseAnonKey) {
    const message = 'Supabase Anon Key is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.';
    // This error will be caught server-side
    throw new Error(message);
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, options);
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          // console.warn(`[SupabaseServerClient] Error in 'set' cookie: ${error}`);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set(name, '', options);
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          // console.warn(`[SupabaseServerClient] Error in 'remove' cookie: ${error}`);
        }
      },
    },
  });
};
