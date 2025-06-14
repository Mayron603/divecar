
'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthError, User, Session } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

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
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  
  // Construir a URL de redirecionamento dinamicamente ou certificar-se que NEXT_PUBLIC_BASE_URL está configurada no Vercel
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
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  console.log('[AuthActions] Attempting to sign in user:', credentials.email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    if (error instanceof AuthError) {
      console.error('[AuthActions] Supabase Auth SignIn Error:', error.message, error.status);
      return { error: { message: error.message, status: error.status }, data: null };
    }
    console.error('[AuthActions] Unknown error during sign in:', error);
    return { error: { message: 'Ocorreu um erro desconhecido durante o login.' }, data: null };
  }

  console.log('[AuthActions] Sign in successful. User:', data.user?.id, 'Session:', data.session !== null);
  return { error: null, data: { user: data.user, session: data.session } };
}

export async function signOutUser() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  console.log('[AuthActions] Attempting to sign out user...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[AuthActions] Supabase Auth SignOut Error:', error);
    // Mesmo com erro, o redirecionamento ocorrerá e o cliente Supabase deve pegar o estado deslogado.
  } else {
    console.log('[AuthActions] User signed out successfully from Supabase backend.');
  }
  // É importante que o redirect aconteça *depois* do signOut.
  return redirect('/'); // Redireciona para a página inicial após o logout.
}
