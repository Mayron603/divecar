
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User, Session } from '@supabase/supabase-js';
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

  console.log('[AuthActions] signUpUser: Iniciando registro para:', credentials.email);
  console.log('[AuthActions] signUpUser: callbackUrl para emailRedirectTo:', callbackUrl);

  const { data, error: supabaseError } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (supabaseError) {
    console.error('[AuthActions] Supabase Auth SignUp retornou um ERRO EXPLÍCITO:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError)));
    
    let errorMessage = supabaseError.message || 'Ocorreu um erro desconhecido durante o registro.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status;
    const lowerMessage = (supabaseError.message || '').toLowerCase();

    if (
        lowerMessage.includes('user already registered') ||
        lowerMessage.includes('email address already registered by another user') ||
        lowerMessage.includes('user already exists') ||
        (errorStatus === 400 && lowerMessage.includes('already registered')) || 
        (errorStatus === 422 && lowerMessage.includes('already registered')) || // Common for "User already registered" by Supabase
        (errorStatus === 409) // HTTP 409 Conflict
       ) {
      errorMessage = 'Este e-mail já está registrado e confirmado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    }
    
    return { error: { message: errorMessage, name: errorName, status: errorStatus }, data: null };
  }

  // Se não houve erro explícito do Supabase, analisamos data.user
  if (data.user) {
    const user = data.user;
    console.log('[AuthActions] signUpUser: User data returned from Supabase (no explicit error):', JSON.stringify(user, null, 2));
    
    // Cenário 1: Usuário tem identidades e o e-mail JÁ está confirmado.
    // Isso é mais provável se "Secure Email Change" estiver habilitado e o Supabase não lançou erro,
    // ou se, mesmo desabilitado, algo anômalo ocorreu.
    if (user.identities && user.identities.length > 0 && user.email_confirmed_at) {
        console.warn('[AuthActions] signUpUser: User data returned, identities exist, AND email_confirmed_at is set. Email is already confirmed. Email:', user.email);
        return {
            error: {
                message: 'Este e-mail já está registrado e confirmado. Tente fazer login.',
                name: 'UserAlreadyExistsError', // Sinaliza para o formulário de registro tratar como erro
            },
            data: null
        };
    }
    // Cenário 2: Usuário tem identidades, mas o e-mail NÃO está confirmado (email_confirmed_at é null).
    // Isso significa que o e-mail já foi registrado anteriormente, mas nunca confirmado.
    // Supabase está reenviando o e-mail de confirmação.
    else if (user.identities && user.identities.length > 0 && !user.email_confirmed_at) {
        console.log('[AuthActions] signUpUser: User has identities but email_confirmed_at is null. Re-sending confirmation. Email:', user.email);
        return {
            error: null, // Não é um "erro" para o formulário, mas uma mensagem informativa.
            data: {
                user: user,
                session: null,
                message: 'Este e-mail já está cadastrado, mas não confirmado. Enviamos um novo e-mail de confirmação. Por favor, verifique sua caixa de entrada.'
            }
        };
    }
    // Cenário 3: Usuário NÃO tem identidades (user.identities é um array vazio ou ausente).
    // Este é um usuário genuinamente novo.
    else if (!user.identities || user.identities.length === 0) {
        console.log('[AuthActions] signUpUser: User has no identities, considered new. Sending confirmation. Email:', user.email);
        return {
            error: null,
            data: {
            user: user,
            session: null,
            message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
            }
        };
    }
    // Fallback dentro da análise de data.user - comportamento inesperado
    else {
        console.warn('[AuthActions] signUpUser: User data analysis fallback. User object:', JSON.stringify(user, null, 2));
        return {
            error: { message: 'Não foi possível determinar o status do registro. Tente novamente.' },
            data: null
        };
    }
  }
  
  // Fallback para um estado totalmente inesperado (sem erro, sem usuário)
  console.warn('[AuthActions] Supabase signUp retornou um estado inesperado (sem erro, sem usuário). Data:', JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o registro.' }, data: null };
}


export async function signInUser(credentials: UserCredentials): Promise<AuthResponse> {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] signInUser: Tentando login para:', credentials.email);
  const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (supabaseError) {
    console.error('[AuthActions] Supabase Auth SignIn retornou um ERRO:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError)));
    let friendlyMessage = 'Falha no login. Verifique suas credenciais ou tente novamente mais tarde.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status; 

    const lowerMessage = (supabaseError.message || '').toLowerCase();

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
    console.log('[AuthActions] signInUser: Login bem-sucedido. User ID:', data.user?.id, 'Sessão existente:', data.session !== null);
    return { error: null, data: { user: data.user, session: data.session } };
  }
  
  console.warn('[AuthActions] Supabase signInWithPassword retornou estado inesperado. Data:', JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o login.' }, data: null };
}

export async function signOutUser() {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] signOutUser: Tentando logout (server action)...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[AuthActions] Supabase Auth SignOut ERRO:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  } else {
    console.log('[AuthActions] signOutUser: Usuário deslogado com sucesso do backend Supabase via server action.');
  }
  redirect('/'); 
}
