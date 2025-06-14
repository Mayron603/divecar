
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

  console.log('[AuthActions] signUpUser: Attempting registration for email:', credentials.email);
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

    // Esta lógica é para quando o Supabase LANÇA um erro explícito de usuário já existente
    // (ex: e-mail já pertence a um usuário CONFIRMADO e "secure email change" está desabilitado)
    if (
        (errorStatus === 400 && (lowerMessage.includes('user already exists') || lowerMessage.includes('a user with this email address has already been registered'))) ||
        (errorStatus === 422 && lowerMessage.includes('already registered')) || 
        lowerMessage.includes('user already registered') || 
        lowerMessage.includes('email address already registered by another user')
       ) {
      errorMessage = 'Este e-mail já está registrado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    }
    return { error: { message: errorMessage, name: errorName, status: errorStatus }, data: null };
  }

  // Se não houve erro explícito do Supabase, verificamos os dados retornados
  if (data.user) {
    const isExistingUserWithIdentities = data.user.identities && data.user.identities.length > 0;
    const isConfirmed = !!data.user.email_confirmed_at;

    if (isExistingUserWithIdentities) {
      if (isConfirmed) {
        // Usuário existente e confirmado
        console.log('[AuthActions] signUpUser: E-mail já registrado por um usuário confirmado. User ID:', data.user.id);
        return {
          error: {
            message: 'Este e-mail já está registrado e confirmado. Tente fazer login.',
            name: 'UserAlreadyExistsError', 
          },
          data: null
        };
      } else {
        // Usuário existente mas não confirmado. Supabase reenviou o e-mail de confirmação.
        console.log('[AuthActions] signUpUser: E-mail já registrado por usuário não confirmado. Reenviando e-mail de confirmação. User ID:', data.user.id);
        // Retornamos a mensagem como parte de `data` para ser exibida como informativa, não como erro.
        return {
          error: null, 
          data: {
            user: data.user,
            session: null, 
            message: 'Este e-mail já está cadastrado, mas não confirmado. Enviamos um novo e-mail de confirmação. Por favor, verifique sua caixa de entrada.'
          }
        };
      }
    } else {
      // Considerado um usuário genuinamente novo se não tem identidades prévias (ou Supabase não as retornou)
      // E não confirmado (pois 'isConfirmed' seria falso aqui se 'isExistingUserWithIdentities' fosse falso)
      console.log('[AuthActions] signUpUser: Novo usuário registrado (confirmação de e-mail enviada). User ID:', data.user.id);
      return {
        error: null,
        data: {
          user: data.user,
          session: null, 
          message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
        }
      };
    }
  }
  
  // Fallback para um estado inesperado (sem erro, sem usuário)
  console.warn('[AuthActions] Supabase signUp returned unexpected data/error state (no error, no user). Data:', JSON.stringify(data), 'Error:', JSON.stringify(supabaseError));
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
        errorName = 'EmailNotConfirmedError'; 
    } else if (lowerMessage.includes('rate limit exceeded')) {
        friendlyMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    }
    
    return { error: { message: friendlyMessage, name: errorName, status: errorStatus }, data: null };
  }

  if (data.user && data.session) {
    console.log('[AuthActions] Sign in successful. User:', data.user?.id, 'Session:', data.session !== null);
    return { error: null, data: { user: data.user, session: data.session } };
  }
  
  // Fallback para um estado inesperado (sem erro, mas sem usuário/sessão)
  console.warn('[AuthActions] Supabase signInWithPassword returned unexpected data/error state. Data:', JSON.stringify(data), 'Error:', JSON.stringify(supabaseError));
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

