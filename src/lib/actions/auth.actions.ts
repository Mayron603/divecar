
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

interface CustomAuthError {
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

  const vercelUrl = process.env.VERCEL_URL;
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  let siteUrl;
  if (explicitBaseUrl) {
    siteUrl = explicitBaseUrl;
  } else if (vercelUrl) {
    siteUrl = `https://${vercelUrl}`;
  } else {
    siteUrl = 'http://localhost:3000'; 
  }
  const callbackUrl = `${siteUrl}/auth/callback`;

  console.log('[AuthActions] signUpUser: Iniciando registro para:', credentials.email);
  console.log('[AuthActions] signUpUser: callbackUrl para emailRedirectTo:', callbackUrl);
  console.log('[AuthActions] signUpUser: VERIFIQUE A CONFIGURAÇÃO "Alteração segura de e-mail" NO PAINEL SUPABASE. DEVE ESTAR DESABILITADA.');

  const { data, error: supabaseError } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  // =====================================================================================
  // LOGGING DETALHADO DA RESPOSTA DO SUPABASE - ESSENCIAL PARA DEBUG
  // =====================================================================================
  if (supabaseError) {
    console.error('[AuthActions] signUpUser: Supabase Auth SignUp retornou um ERRO EXPLÍCITO.');
    console.error('[AuthActions] signUpUser: Objeto de erro completo:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError), 2));
  } else {
    console.log('[AuthActions] signUpUser: Supabase Auth SignUp NÃO retornou erro explícito.');
  }

  if (data) {
    console.log('[AuthActions] signUpUser: Supabase Auth SignUp retornou DADOS.');
    if (data.user) {
        console.log('[AuthActions] signUpUser: DETALHES DO data.user (objeto user desta chamada signUp) -> ID:', data.user.id);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> Email:', data.user.email);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> email_confirmed_at (da identidade desta chamada signUp):', data.user.email_confirmed_at);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> created_at (da identidade desta chamada signUp):', data.user.created_at);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> identities (histórico de identidades para este user object):', data.user.identities ? JSON.stringify(data.user.identities, null, 2) : 'NULO ou VAZIO');
    } else {
        console.log('[AuthActions] signUpUser: Supabase Auth SignUp retornou DADOS, mas data.user é NULO.');
    }
    if (data.session) {
        console.log('[AuthActions] signUpUser: Supabase Auth SignUp retornou DADOS de SESSÃO (incomum para signUp inicial).');
    } else {
        console.log('[AuthActions] signUpUser: Supabase Auth SignUp retornou DADOS, mas data.session é NULO (esperado para signUp inicial).');
    }
  } else {
    console.log('[AuthActions] signUpUser: Supabase Auth SignUp NÃO retornou dados (data é nulo).');
  }
  // =====================================================================================
  // FIM DO LOGGING DETALHADO
  // =====================================================================================

  if (supabaseError) {
    let errorMessage = supabaseError.message || 'Ocorreu um erro desconhecido durante o registro.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status || (supabaseError as any).code; 
                                         
    const lowerMessage = (supabaseError.message || '').toLowerCase();

    // Check for explicit "user already exists" type errors (usually for confirmed users when Secure Email Change is OFF)
    if (
        (typeof errorStatus === 'string' && (errorStatus.includes('400') || errorStatus.includes('409') || errorStatus.includes('422'))) || 
        (typeof errorStatus === 'number' && (errorStatus === 400 || errorStatus === 409 || errorStatus === 422)) ||
        lowerMessage.includes('user already registered') ||
        lowerMessage.includes('email address already registered by another user') ||
        lowerMessage.includes('user already exists') 
       ) {
      errorMessage = 'Este e-mail já está registrado e confirmado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
      console.log(`[AuthActions] signUpUser: Detectado erro de usuário já existente e CONFIRMADO (via supabaseError): ${errorMessage}. Status: ${errorStatus}`);
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
        console.log(`[AuthActions] signUpUser: Detectado erro de limite de taxa (via supabaseError): ${errorMessage}`);
    } else {
      console.log(`[AuthActions] signUpUser: Erro genérico do Supabase (via supabaseError): ${errorMessage}, Nome: ${errorName}, Status: ${errorStatus}`);
    }
    return { error: { message: errorMessage, name: errorName, status: errorStatus as number | undefined }, data: null };
  }

  // Se NÃO houve erro explícito do Supabase, analisamos data.user
  if (data && data.user) {
    const user = data.user;

    // SCENARIO 1: O e-mail já era conhecido pelo Supabase (array identities NÃO é vazio)
    if (user.identities && user.identities.length > 0) {
        // Verificar se ALGUMA das identidades pré-existentes para este e-mail já estava confirmada.
        const isPreviouslyConfirmed = user.identities.some(identity => {
            // Logar cada identidade para depuração
            // console.log('[AuthActions] signUpUser: Verificando identidade pré-existente:', JSON.stringify(identity, null, 2));
            return identity.provider === 'email' &&
                   identity.identity_data &&
                   ( (identity.identity_data as any).email_verified_at || (identity.identity_data as any).verified === true );
        });

        if (isPreviouslyConfirmed) {
            console.log('[AuthActions] signUpUser: SCENARIO 1 (NO EXPLICIT ERROR) - E-mail já registrado e CONFIRMADO (baseado em user.identities pré-existentes e verificadas). Email:', user.email);
            return {
                error: {
                    message: 'Este e-mail já está registrado e confirmado. Tente fazer login.',
                    name: 'UserAlreadyExistsError',
                },
                data: null
            };
        } else {
            // Se user.identities não está vazio, mas nenhuma identidade pré-existente para este e-mail estava confirmada
            // (ou user.email_confirmed_at DESTA CHAMADA signUp é nulo), então é um e-mail já cadastrado mas não confirmado.
            // Supabase está reenviando a confirmação.
            console.log('[AuthActions] signUpUser: SCENARIO 2 (NO EXPLICIT ERROR) - E-mail já cadastrado, NÃO CONFIRMADO (identities existem, mas nenhuma confirmada para este email). Reenviando confirmação. Email:', user.email);
            return {
                error: null,
                data: {
                    user: user,
                    session: data.session, // Geralmente null aqui
                    message: 'Este e-mail já está cadastrado, mas não confirmado. Enviamos um novo e-mail de confirmação. Por favor, verifique sua caixa de entrada.'
                }
            };
        }
    } 
    // SCENARIO 3: Usuário é genuinamente NOVO (array identities ESTÁ VAZIO ou nulo)
    // `email_confirmed_at` na `data.user` (desta chamada signUp) será `null` pois é uma nova conta aguardando confirmação.
    else if (!user.identities || user.identities.length === 0) {
      console.log('[AuthActions] signUpUser: SCENARIO 3 (NO EXPLICIT ERROR) - Usuário NOVO (identities é nulo ou vazio). Enviando confirmação. Email:', user.email);
      return {
        error: null,
        data: {
          user: user,
          session: data.session, // Geralmente null aqui
          message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
        }
      };
    } else {
      // Fallback para uma lógica inesperada sobre identities.
      console.warn('[AuthActions] signUpUser: Lógica de identities inesperada (NO EXPLICIT ERROR), e não se encaixa nos cenários 1, 2 ou 3. User object:', JSON.stringify(user, null, 2));
      // Como fallback, se o email_confirmed_at do usuário desta chamada for verdadeiro (altamente improvável sem erro), trate como confirmado.
      if (user.email_confirmed_at) { 
          return {
              error: {
                  message: 'Este e-mail parece já estar registrado e confirmado (fallback extremo). Tente fazer login.',
                  name: 'UserAlreadyExistsError',
              },
              data: null
          };
      }
      // Caso contrário, assumir reenvio de confirmação como medida de segurança.
      return {
          error: null,
          data: {
              user: user,
              session: data.session,
              message: 'Este e-mail parece já estar cadastrado (fallback extremo). Enviamos um novo e-mail de confirmação. Verifique sua caixa de entrada.'
          }
      };
    }
  }

  // Fallback para um estado totalmente inesperado (sem erro, sem data ou sem data.user)
  console.warn('[AuthActions] Supabase signUp retornou um estado inesperado (sem erro explícito e sem data.user). Data:', JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o registro. Por favor, tente novamente.' }, data: null };
}


export async function signInUser(credentials: UserCredentials): Promise<AuthResponse> {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] signInUser: Tentando login para:', credentials.email);

  const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (supabaseError) {
    console.error('[AuthActions] signInUser: Supabase Auth SignIn retornou um ERRO.');
    console.error('[AuthActions] signInUser: Objeto de erro completo:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError), 2));
    
    let friendlyMessage = 'Falha no login. Verifique suas credenciais ou tente novamente mais tarde.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status || (supabaseError as any).code;

    const lowerMessage = (supabaseError.message || '').toLowerCase();

    if (lowerMessage.includes('invalid login credentials')) {
        friendlyMessage = 'Credenciais de login inválidas. Verifique seu e-mail e senha.';
        console.log(`[AuthActions] signInUser: Detectado erro de credenciais inválidas.`);
    } else if (lowerMessage.includes('email not confirmed')) {
        friendlyMessage = 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada e spam pelo link de confirmação.';
        errorName = 'EmailNotConfirmedError'; 
        console.log(`[AuthActions] signInUser: Detectado erro de e-mail não confirmado.`);
    } else if (lowerMessage.includes('rate limit exceeded')) {
        friendlyMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
        console.log(`[AuthActions] signInUser: Detectado erro de limite de taxa.`);
    } else {
      console.log(`[AuthActions] signInUser: Erro genérico do Supabase: ${friendlyMessage}, Nome: ${errorName}, Status: ${errorStatus}`);
    }
    return { error: { message: friendlyMessage, name: errorName, status: errorStatus as number | undefined }, data: null };
  }

  if (data && data.user && data.session) {
    console.log('[AuthActions] signInUser: Login bem-sucedido. User ID:', data.user?.id, 'Sessão existente:', data.session !== null);
    return { error: null, data: { user: data.user, session: data.session } };
  }

  if (data && data.user && !data.session) {
    console.warn('[AuthActions] signInUser: Usuário retornado mas SEM SESSÃO. Email:', data.user.email, 'Email Confirmado:', data.user.email_confirmed_at);
    if (!data.user.email_confirmed_at) { 
      return { 
        error: { 
          message: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (fallback).', 
          name: 'EmailNotConfirmedError' 
        }, 
        data: null 
      };
    }
    return { 
      error: { message: 'Falha ao estabelecer uma sessão de login, embora o usuário exista e esteja confirmado. Tente novamente.' }, 
      data: null 
    };
  }

  console.warn('[AuthActions] signInUser: Supabase signInWithPassword retornou estado inesperado (sem erro, mas sem user/session válidos). Data:', JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o login. Por favor, tente novamente.' }, data: null };
}


export async function signOutUser() {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] signOutUser: Tentando logout (server action)...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[AuthActions] Supabase Auth SignOut ERRO:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  } else {
    console.log('[AuthActions] signOutUser: Usuário deslogado com sucesso do backend Supabase via server action.');
  }
  redirect('/');
}
    

    