
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthError, User, Session } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers'; // Ainda necessário para o redirect, mas não para o client

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

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    console.error('[AuthActions] Supabase Auth SignUp Raw Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    let errorMessage = error.message || 'Ocorreu um erro desconhecido durante o registro.';
    let errorName: string | undefined = error.name;
    let errorStatus: number | undefined = undefined;
    
    if (typeof error === 'object' && error !== null) {
      errorStatus = (error as any).status; // Common place for HTTP status
    }


    // Check for "User already registered" or similar errors
    const lowerMessage = error.message.toLowerCase();
    if (
        lowerMessage.includes('user already registered') ||
        lowerMessage.includes('email address already registered by another user') ||
        (errorStatus === 400 && lowerMessage.includes('user already exists')) ||
        (errorStatus === 422 && lowerMessage.includes('already registered')) ||
        (errorName === 'AuthApiError' && errorStatus === 400 && lowerMessage.includes('user already exists')) // More specific check for some Supabase versions
       ) {
      errorMessage = 'Este e-mail já está registrado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    } else {
      // Keep original error name if not one of the above special cases
      errorName = error.name;
    }

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
      return {
        error: null,
        data: {
            user: data.user,
            session: data.session,
            message: 'Conta criada e logada com sucesso!'
        }
      };
  }

  console.warn('[AuthActions] Supabase signUp returned unexpected data/error state:', { data, error });
  return { error: { message: 'Resposta inesperada do servidor durante o registro.' }, data: null };
}


export async function signInUser(credentials: UserCredentials): Promise<AuthResponse> {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] Attempting to sign in user:', credentials.email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    console.error('[AuthActions] Supabase Auth SignIn Raw Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    let friendlyMessage = 'Falha no login. Verifique suas credenciais ou tente novamente mais tarde.';
    let errorName: string | undefined = error.name;
    let errorStatus: number | undefined = undefined;

    if (typeof error === 'object' && error !== null) {
        const lowerMessage = String((error as any).message).toLowerCase();
        errorStatus = (error as any).status; // Common place for HTTP status

        if (lowerMessage.includes('invalid login credentials')) {
            friendlyMessage = 'Credenciais de login inválidas. Verifique seu e-mail e senha.';
        } else if (lowerMessage.includes('email not confirmed')) {
            friendlyMessage = 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada e spam pelo link de confirmação.';
        } else {
            // For other errors, use the message from Supabase if available, but keep it understandable
            friendlyMessage = (error as any).message || friendlyMessage;
        }
        errorName = (error as any).name || errorName;
    }
    
    return { error: { message: friendlyMessage, name: errorName, status: errorStatus }, data: null };
  }

  console.log('[AuthActions] Sign in successful. User:', data.user?.id, 'Session:', data.session !== null);
  return { error: null, data: { user: data.user, session: data.session } };
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

