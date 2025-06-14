
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

interface AuthResponse {
  data: SignUpResponseData | null;
  error: { message: string; name?: string; status?: number } | null;
}


export async function signUpUser(credentials: UserCredentials): Promise<AuthResponse> {
  const supabase = createSupabaseServerClient(); // Não passa mais cookieStore
  
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
    console.error('[AuthActions] Supabase Auth SignUp Error:', error.message, 'Status:', error.status, 'Name:', error.name);
    const genericErrorMessage = 'Ocorreu um erro desconhecido durante o registro.';
    let errorMessage = error.message || genericErrorMessage;
    let errorName = error.name;

    if (error instanceof AuthError &&
        (error.message.toLowerCase().includes('user already registered') ||
         error.message.toLowerCase().includes('email address already registered by another user') ||
         (error.status === 400 && error.message.toLowerCase().includes('user already exists')) || 
         (error.status === 422 && error.message.toLowerCase().includes('already registered')) 
        )
       ) {
      errorMessage = 'Este e-mail já está registrado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
    } else if (error instanceof AuthError && error.message.toLowerCase().includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    }

    return { error: { message: errorMessage, name: errorName, status: error.status }, data: null };
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
  const supabase = createSupabaseServerClient(); // Não passa mais cookieStore
  console.log('[AuthActions] Attempting to sign in user:', credentials.email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    if (error instanceof AuthError) {
      console.error('[AuthActions] Supabase Auth SignIn Error:', error.message, error.status);
      let friendlyMessage = error.message;
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        friendlyMessage = 'Credenciais de login inválidas. Verifique seu e-mail e senha.';
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        friendlyMessage = 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada e spam pelo link de confirmação.';
      }
      return { error: { message: friendlyMessage, status: error.status }, data: null };
    }
    console.error('[AuthActions] Unknown error during sign in:', error);
    return { error: { message: 'Ocorreu um erro desconhecido durante o login.' }, data: null };
  }

  console.log('[AuthActions] Sign in successful. User:', data.user?.id, 'Session:', data.session !== null);
  return { error: null, data: { user: data.user, session: data.session } };
}

export async function signOutUser() {
  const supabase = createSupabaseServerClient(); // Não passa mais cookieStore
  console.log('[AuthActions] Attempting to sign out user...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[AuthActions] Supabase Auth SignOut Error:', error);
  } else {
    console.log('[AuthActions] User signed out successfully from Supabase backend.');
  }
  // Para Server Actions, é recomendado usar redirect ao invés de router.push
  // router.refresh() será chamado no cliente pela Navbar no onAuthStateChange
  redirect('/'); 
}
