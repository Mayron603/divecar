
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthError, User, Session } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

interface UserCredentials {
  email: string;
  password: string;
}

interface SignUpResponseData {
  user: User | null;
  session: Session | null;
  message?: string;
}

interface AuthResponseError {
  message: string;
  name?: string;
  status?: number;
}

interface AuthResponse {
  data: SignUpResponseData | null;
  error: AuthResponseError | null;
}


export async function signUpUser(credentials: UserCredentials): Promise<AuthResponse> {
  const supabase = createSupabaseServerClient();
  
  const callbackUrl = process.env.NEXT_PUBLIC_BASE_URL ? 
                      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback` : 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/auth/callback` : 'http://localhost:3000/auth/callback');

  console.log('[AuthActions] signUpUser: callbackUrl for emailRedirectTo:', callbackUrl);

  const { data, error: supabaseError } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (supabaseError) {
    console.error('[AuthActions] Supabase Auth SignUp Raw Error:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError)));
    
    let errorMessage = supabaseError.message || 'Ocorreu um erro desconhecido durante o registro.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status;

    const lowerMessage = supabaseError.message.toLowerCase();

    // Specific check for user already registered
    if (
        (errorStatus === 400 && (lowerMessage.includes('user already exists') || lowerMessage.includes('a user with this email address has already been registered'))) ||
        (errorStatus === 422 && lowerMessage.includes('already registered')) || // Older Supabase versions might use 422
        lowerMessage.includes('user already registered') || // General catch
        lowerMessage.includes('email address already registered by another user')
       ) {
      errorMessage = 'Este e-mail já está registrado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError'; // Crucial for client-side handling
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    }
    // For other errors, use the prepared message or the original one.
    return { error: { message: errorMessage, name: errorName, status: errorStatus }, data: null };
  }

  if (data.user && data.session === null) {
    console.log('[AuthActions] signUpUser successful (confirmation email sent). User ID:', data.user.id);
    return {
      error: null,
      data: {
        user: data.user,
        session: null,
        message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
      }
    };
  }

  if (data.user && data.session) {
      console.log('[AuthActions] signUpUser successful and session created (auto-confirmation likely enabled). User ID:', data.user.id);
      // This path is less common if email confirmation is on, but handle it.
      return {
        error: null,
        data: {
            user: data.user,
            session: data.session,
            message: 'Conta criada e logada com sucesso!'
        }
      };
  }

  // Fallback for unexpected Supabase response
  console.warn('[AuthActions] Supabase signUp returned unexpected data/error state:', { data, error: supabaseError });
  return { error: { message: 'Resposta inesperada do servidor durante o registro.' }, data: null };
}


export async function signInUser(credentials: UserCredentials): Promise<AuthResponse> {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] Attempting to sign in user:', credentials.email);
  const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (supabaseError) {
    console.error('[AuthActions] Supabase Auth SignIn Raw Error:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError)));
    let friendlyMessage = 'Falha no login. Verifique suas credenciais ou tente novamente mais tarde.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status;

    const lowerMessage = supabaseError.message.toLowerCase();

    if (lowerMessage.includes('invalid login credentials')) {
        friendlyMessage = 'Credenciais de login inválidas. Verifique seu e-mail e senha.';
    } else if (lowerMessage.includes('email not confirmed')) {
        friendlyMessage = 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada e spam pelo link de confirmação.';
        errorName = 'EmailNotConfirmedError'; // Specific name for client if needed
    } else if (lowerMessage.includes('rate limit exceeded')) {
        friendlyMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    }
    // For other errors, use the prepared message or the original one.
    return { error: { message: friendlyMessage, name: errorName, status: errorStatus }, data: null };
  }

  if (data.user && data.session) {
    console.log('[AuthActions] Sign in successful. User:', data.user?.id, 'Session:', data.session !== null);
    return { error: null, data: { user: data.user, session: data.session } };
  }
  
  // Fallback for unexpected Supabase response
  console.warn('[AuthActions] Supabase signInWithPassword returned unexpected data/error state:', { data, error: supabaseError });
  return { error: { message: 'Resposta inesperada do servidor durante o login.' }, data: null };
}

export async function signOutUser() {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] Attempting to sign out user (server action)...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[AuthActions] Supabase Auth SignOut Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  } else {
    console.log('[AuthActions] User signed out successfully from Supabase backend via server action.');
  }
  redirect('/'); 
}
