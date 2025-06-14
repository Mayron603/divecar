
// src/lib/supabase/server.ts
// This client is for use in Server Components, Server Actions, and Route Handlers
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers"; // Import cookies diretamente

// A função createSupabaseServerClient não precisa mais do parâmetro cookieStore
export const createSupabaseServerClient = () => {
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
        // Chamar cookies() diretamente aqui
        const cookieStore = cookies();
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          // Chamar cookies() diretamente aqui
          const cookieStore = cookies();
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
          // Chamar cookies() diretamente aqui
          const cookieStore = cookies();
          cookieStore.set(name, '', options); // Supabase ssr usa set com valor vazio para remover
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
