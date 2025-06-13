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
  if (!supabaseAnonKey) {
    const message = 'Supabase Anon Key is missing from environment variables. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.';
    // This error will be caught server-side
    throw new Error(message);
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (e) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions. In Server Actions, this might also occur
          // if trying to set cookies after headers have been sent.
          // For anon key usage, this is less critical.
          console.warn(`[SupabaseServerClient] Error setting cookies in setAll: ${e}`);
        }
      },
    },
  });
};
