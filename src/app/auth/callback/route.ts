
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  console.log('[AuthCallback] Received callback. Code:', code, 'Next:', next, 'Origin:', origin);

  if (code) {
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      console.log('[AuthCallback] Code exchanged for session successfully. Redirecting to:', `${origin}${next}`);
      // It's crucial that the redirect URL is absolute.
      return NextResponse.redirect(new URL(next, origin).toString());
    }
    
    console.error('[AuthCallback] Error exchanging code for session:', error.message, error);
    // Redirect to login with a more specific error message if possible
    const errorMessage = encodeURIComponent(error.message || 'Could not authenticate user.');
    return NextResponse.redirect(new URL(`/login?error=auth_callback_error&error_description=${errorMessage}`, origin).toString());
  }

  // If no code is present, it might be a general redirect after email confirmation
  // (where Supabase handles the session client-side if already logged in elsewhere,
  // or if it's just confirming the email without an immediate session exchange via code).
  // Or it could be an error from Supabase before even sending a code.
  
  const errorParam = searchParams.get('error');
  const errorCodeParam = searchParams.get('error_code');
  const errorDescriptionParam = searchParams.get('error_description');

  if (errorParam || errorCodeParam) {
    console.warn('[AuthCallback] Callback received with error parameters. Error:', errorParam, 'Code:', errorCodeParam, 'Description:', errorDescriptionParam);
    const errorMessage = encodeURIComponent(errorDescriptionParam || errorParam || 'An authentication error occurred.');
    const targetUrl = new URL(`/login?error=${encodeURIComponent(errorParam || 'unknown_error')}&error_code=${encodeURIComponent(errorCodeParam || 'unknown')}&error_description=${errorMessage}`, origin);
    return NextResponse.redirect(targetUrl.toString());
  }

  console.warn('[AuthCallback] No code and no explicit error parameters found in callback URL. Redirecting to home.');
  // Default redirect if no code and no explicit error.
  return NextResponse.redirect(new URL(next, origin).toString());
}
