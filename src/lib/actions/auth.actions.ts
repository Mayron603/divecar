
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User, Session } from '@supabase/supabase-js'; // Não precisa mais de AuthError aqui se não for usar explicitamente
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

interface CustomAuthError { // Renomeado de AuthError
  message: string;
  name?: string;
  status?: number;
}

interface AuthResponse {
  data: SignUpResponseData | null;
  error: CustomAuthError | null;
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
        (errorStatus === 400 && (lowerMessage.includes('user already registered') || lowerMessage.includes('email address already registered by another user') || lowerMessage.includes('user already exists'))) ||
        (errorStatus === 422 && lowerMessage.includes('already registered')) ||
        (errorStatus === 409) || // HTTP 409 Conflict
        lowerMessage.includes('user already exists with this email address')
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
    // Log detalhado das propriedades chave
    console.log(`[AuthActions] signUpUser: User ID: ${user.id}, Email: ${user.email}`);
    console.log(`[AuthActions] signUpUser: User Identities:`, user.identities);
    console.log(`[AuthActions] signUpUser: User email_confirmed_at: ${user.email_confirmed_at}`);
    console.log(`[AuthActions] signUpUser: User created_at: ${user.created_at}, User confirmed_at (geral): ${user.confirmed_at}`);


    // Cenário 1: O usuário tem identidades E o e-mail já está confirmado.
    if (user.identities && user.identities.length > 0 && user.email_confirmed_at) {
        console.warn('[AuthActions] signUpUser: SCENARIO 1 - Email já registrado e CONFIRMADO (identities exist, email_confirmed_at is true). Email:', user.email);
        return {
            error: {
                message: 'Este e-mail já está registrado e confirmado. Tente fazer login.',
                name: 'UserAlreadyExistsError',
            },
            data: null
        };
    }
    // Cenário 2: O usuário tem identidades, mas o e-mail NÃO está confirmado (email_confirmed_at é null).
    // Isso significa que o e-mail já foi registrado anteriormente, mas nunca confirmado.
    // Supabase está reenviando o e-mail de confirmação.
    else if (user.identities && user.identities.length > 0 && !user.email_confirmed_at) {
        console.log('[AuthActions] signUpUser: SCENARIO 2 - Email já cadastrado, NÃO CONFIRMADO (identities exist, email_confirmed_at is false/null). Re-sending confirmation. Email:', user.email);
        return {
            error: null,
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
        console.log('[AuthActions] signUpUser: SCENARIO 3 - Usuário NOVO (no identities). Sending confirmation. Email:', user.email);
        return {
            error: null,
            data: {
            user: user,
            session: null,
            message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
            }
        };
    }
    // Fallback: Se a lógica acima não cobrir, é um estado inesperado.
    // Isso pode acontecer se `identities` for `null` ou `undefined` em vez de array vazio,
    // ou alguma combinação não prevista. O mais seguro é tratar como usuário já existente se tiver `email_confirmed_at`.
    else {
        console.warn('[AuthActions] signUpUser: User data analysis FALLBACK. User object:', JSON.stringify(user, null, 2));
        if (user.email_confirmed_at) { // Se de alguma forma o email está confirmado aqui, ele já existe.
             return {
                error: {
                    message: 'Este e-mail já está registrado e confirmado (fallback). Tente fazer login.',
                    name: 'UserAlreadyExistsError',
                },
                data: null
            };
        }
        // Se não confirmado, mas não caiu nos cenários anteriores (improvável se identities foi verificado).
        // Por segurança, se não for claramente novo, e não confirmado, assumimos reenvio.
        return {
            error: null,
            data: {
                user: user,
                session: null,
                message: 'Este e-mail já está cadastrado (fallback). Enviamos um novo e-mail de confirmação. Verifique sua caixa de entrada.'
            }
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

  if (data.user && !data.session) {
    // Este caso é frequentemente um e-mail não confirmado se a verificação de erro acima falhar.
    console.warn('[AuthActions] signInWithPassword retornou usuário mas sem sessão. Email:', data.user.email);
    // Verifique novamente se a mensagem é sobre e-mail não confirmado
    if (data.user.email_confirmed_at === null || data.user.email_confirmed_at === undefined) {
      return { error: { message: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (signIn fallback).', name: 'EmailNotConfirmedError' }, data: null };
    }
    return { error: { message: 'Falha ao estabelecer uma sessão de login. Tente novamente.' }, data: null };
  }

  console.warn('[AuthActions] Supabase signInWithPassword retornou estado inesperado. Data:', JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o login.' }, data: null };
}

export async function signOutUser() {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] signOutUser: Tentando logout (server action)...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[AuthActions] Supabase Auth SignOut ERRO:', JSON.stringify(error, Object.getOwnPropertyNames(supabaseError)));
  } else {
    console.log('[AuthActions] signOutUser: Usuário deslogado com sucesso do backend Supabase via server action.');
  }
  redirect('/');
}

    