
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
  const emailRedirectTo = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback` : undefined;

  if (!emailRedirectTo) {
    console.error("NEXT_PUBLIC_BASE_URL is not set. Email redirection for signup confirmation might not work as expected.");
    // Você pode optar por não prosseguir ou prosseguir com um aviso.
    // Por enquanto, vamos prosseguir mas o link de confirmação pode não levar ao lugar certo.
  }

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    console.error('Supabase Auth SignUp Error:', error.message, 'Status:', error.status, 'Name:', error.name);
    // Verifica se o erro é devido a um usuário já existente
    const genericErrorMessage = 'Ocorreu um erro desconhecido durante o registro.';
    let errorMessage = error.message || genericErrorMessage;
    let errorName = error.name;

    if (error instanceof AuthError &&
        (error.message.toLowerCase().includes('user already registered') ||
         error.message.toLowerCase().includes('email address already registered by another user') ||
         (error.status === 400 && error.message.toLowerCase().includes('user already exists')) || // Outra variação comum
         error.status === 422 // Unprocessable Entity, frequentemente usado para conflitos
        )
       ) {
      errorMessage = 'Este e-mail já está registrado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
    }
    return { error: { message: errorMessage, name: errorName, status: error.status }, data: null };
  }

  // Se data.user existe e data.session é null, é um novo registro pendente de confirmação
  // ou um usuário existente não confirmado ao qual o e-mail foi reenviado.
  if (data.user && data.session === null) {
    console.log('Sign up processed, email confirmation likely required. User ID:', data.user.id);
    return {
      error: null,
      data: {
        user: data.user,
        session: null,
        message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
      }
    };
  }

  // Caso a auto-confirmação esteja habilitada e um usuário seja criado e logado imediatamente.
  if (data.user && data.session) {
      console.log('Sign up successful and session created (auto-confirmation likely enabled). User ID:', data.user.id);
      return {
        error: null,
        data: {
            user: data.user,
            session: data.session,
            message: 'Conta criada e logada com sucesso!'
        }
      };
  }

  // Fallback para um estado inesperado, se não houver erro nem data.user.
  // Isso também cobre o caso onde data.user é null, o que não deveria acontecer com um signUp bem-sucedido sem erro.
  console.warn('Supabase signUp returned unexpected data/error state:', { data, error });
  return { error: { message: 'Resposta inesperada do servidor durante o registro.' }, data: null };
}


export async function signInUser(credentials: UserCredentials): Promise<AuthResponse> {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    if (error instanceof AuthError) {
      console.error('Supabase Auth SignIn Error:', error.message, error.status);
      return { error: { message: error.message, status: error.status }, data: null };
    }
    console.error('Unknown error during sign in:', error);
    return { error: { message: 'Ocorreu um erro desconhecido durante o login.' }, data: null };
  }

  console.log('Sign in successful. User:', data.user?.id, 'Session:', data.session !== null);
  return { error: null, data: { user: data.user, session: data.session } };
}

export async function signOutUser() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Supabase Auth SignOut Error:', error);
  }
  return redirect('/');
}

