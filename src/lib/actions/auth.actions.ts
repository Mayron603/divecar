
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
  const functionName = "signUpUser";
  console.log(`[AuthActions][${functionName}] Iniciando registro para:`, credentials.email);
  const supabase = createSupabaseServerClient();

  // Logging para entender as variáveis de ambiente
  const vercelUrl = process.env.VERCEL_URL;
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  console.log(`[AuthActions][${functionName}] VERCEL_URL: ${vercelUrl}, NEXT_PUBLIC_BASE_URL: ${explicitBaseUrl}`);
  
  let siteUrl;
  if (explicitBaseUrl) {
    siteUrl = explicitBaseUrl;
    console.log(`[AuthActions][${functionName}] Usando explicitBaseUrl: ${siteUrl}`);
  } else if (vercelUrl) {
    siteUrl = `https://${vercelUrl}`;
    console.log(`[AuthActions][${functionName}] Usando vercelUrl: ${siteUrl}`);
  } else {
    siteUrl = 'http://localhost:9002'; // Ajustado para porta 9002
    console.log(`[AuthActions][${functionName}] Usando fallback localhost: ${siteUrl}`);
  }
  const callbackUrl = `${siteUrl}/auth/callback`;
  console.log(`[AuthActions][${functionName}] callbackUrl para emailRedirectTo: ${callbackUrl}`);
  console.log(`[AuthActions][${functionName}] VERIFIQUE "Alteração segura de e-mail" NO SUPABASE. Idealmente DESABILITADA para esta lógica funcionar como esperado.`);

  const { data, error: supabaseError } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (supabaseError) {
    console.error(`[AuthActions][${functionName}] Supabase Auth SignUp retornou um ERRO EXPLÍCITO.`);
    console.error(`[AuthActions][${functionName}] Objeto de erro completo:`, JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError), 2));
    
    let errorMessage = supabaseError.message || 'Ocorreu um erro desconhecido durante o registro.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status || (supabaseError as any).code; 
                                         
    const lowerMessage = (supabaseError.message || '').toLowerCase();

    if (
        (typeof errorStatus === 'string' && (errorStatus.includes('400') || errorStatus.includes('409') || errorStatus.includes('422'))) || 
        (typeof errorStatus === 'number' && (errorStatus === 400 || errorStatus === 409 || errorStatus === 422)) ||
        lowerMessage.includes('user already registered') ||
        lowerMessage.includes('email address already registered by another user') ||
        lowerMessage.includes('user already exists') 
       ) {
      errorMessage = 'Este e-mail já está registrado e confirmado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
      console.log(`[AuthActions][${functionName}] Detectado erro de usuário já existente e CONFIRMADO (via supabaseError): ${errorMessage}. Status: ${errorStatus}`);
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
        console.log(`[AuthActions][${functionName}] Detectado erro de limite de taxa (via supabaseError): ${errorMessage}`);
    } else {
      console.log(`[AuthActions][${functionName}] Erro genérico do Supabase (via supabaseError): ${errorMessage}, Nome: ${errorName}, Status: ${errorStatus}`);
    }
    return { error: { message: errorMessage, name: errorName, status: errorStatus as number | undefined }, data: null };
  }
  
  console.log(`[AuthActions][${functionName}] Supabase Auth SignUp NÃO retornou erro explícito.`);
  if (!data || !data.user) {
    console.warn(`[AuthActions][${functionName}] Supabase signUp NÃO retornou erro explícito E NÃO retornou data.user. Data:`, JSON.stringify(data));
    return { error: { message: 'Resposta inesperada do servidor durante o registro (sem usuário). Tente novamente.' }, data: null };
  }

  const user = data.user;
  console.log(`[AuthActions][${functionName}] DETALHES DO data.user (objeto user desta chamada signUp) -> ID:`, user.id);
  console.log(`[AuthActions][${functionName}] DETALHES DO data.user -> Email:`, user.email);
  console.log(`[AuthActions][${functionName}] DETALHES DO data.user -> email_confirmed_at (da identidade DESTA CHAMADA signUp):`, user.email_confirmed_at);
  console.log(`[AuthActions][${functionName}] DETALHES DO data.user -> created_at (da identidade DESTA CHAMADA signUp):`, user.created_at);
  console.log(`[AuthActions][${functionName}] DETALHES DO data.user -> identities (histórico de identidades para este user object):`, user.identities ? JSON.stringify(user.identities, null, 2) : 'NULO ou VAZIO');
  
  if (user.identities && user.identities.length > 0) {
    // Verifica se alguma identidade pré-existente para este e-mail já estava confirmada
    const isPreviouslyConfirmed = user.identities.some(identity => {
      // Log específico para cada identidade sendo verificada
      console.log(`[AuthActions][${functionName}] Verificando identidade pré-existente: provider=${identity.provider}, identity_data.email_verified_at=${(identity.identity_data as any)?.email_verified_at}, identity.identity_data.verified=${(identity.identity_data as any)?.verified}`);
      return identity.provider === 'email' &&
             identity.identity_data &&
             ( (identity.identity_data as any).email_verified_at || (identity.identity_data as any).verified === true );
    });

    if (isPreviouslyConfirmed) {
        // Este é o cenário onde o e-mail já existe e uma de suas identidades anteriores FOI confirmada.
        console.log(`[AuthActions][${functionName}] SCENARIO 1 (NO EXPLICIT ERROR) - E-mail já registrado e CONFIRMADO (baseado em user.identities pré-existentes e verificadas). Email:`, user.email);
        return {
            error: {
                message: 'Este e-mail já está registrado e confirmado. Tente fazer login.',
                name: 'UserAlreadyExistsError',
            },
            data: null
        };
    } else {
        // Se user.identities não está vazio, mas nenhuma identidade pré-existente para este e-mail estava confirmada
        console.log(`[AuthActions][${functionName}] SCENARIO 2 (NO EXPLICIT ERROR) - E-mail já cadastrado, NÃO CONFIRMADO (identities existem, mas nenhuma confirmada para este email). Reenviando confirmação. Email:`, user.email);
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
  else {
    console.log(`[AuthActions][${functionName}] SCENARIO 3 (NO EXPLICIT ERROR) - Usuário NOVO (identities é nulo ou vazio). Enviando confirmação. Email:`, user.email);
    return {
      error: null,
      data: {
        user: user,
        session: data.session, // Geralmente null aqui
        message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
      }
    };
  }
}


export async function signInUser(credentials: UserCredentials): Promise<AuthResponse> {
  const supabase = createSupabaseServerClient();
  const functionName = "signInUser";
  console.log(`[AuthActions][${functionName}] Tentando login para:`, credentials.email);

  const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (supabaseError) {
    console.error(`[AuthActions][${functionName}] Supabase Auth SignIn retornou um ERRO.`);
    console.error(`[AuthActions][${functionName}] Objeto de erro completo:`, JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError), 2));
    
    let friendlyMessage = 'Falha no login. Verifique suas credenciais ou tente novamente mais tarde.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status || (supabaseError as any).code;

    const lowerMessage = (supabaseError.message || '').toLowerCase();

    if (lowerMessage.includes('invalid login credentials')) {
        friendlyMessage = 'Credenciais de login inválidas. Verifique seu e-mail e senha.';
        console.log(`[AuthActions][${functionName}] Detectado erro de credenciais inválidas.`);
    } else if (lowerMessage.includes('email not confirmed')) {
        friendlyMessage = 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada e spam pelo link de confirmação.';
        errorName = 'EmailNotConfirmedError'; 
        console.log(`[AuthActions][${functionName}] Detectado erro de e-mail não confirmado.`);
    } else if (lowerMessage.includes('rate limit exceeded')) {
        friendlyMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
        console.log(`[AuthActions][${functionName}] Detectado erro de limite de taxa.`);
    } else {
      console.log(`[AuthActions][${functionName}] Erro genérico do Supabase: ${friendlyMessage}, Nome: ${errorName}, Status: ${errorStatus}`);
    }
    return { error: { message: friendlyMessage, name: errorName, status: errorStatus as number | undefined }, data: null };
  }

  if (data && data.user && data.session) {
    console.log(`[AuthActions][${functionName}] Login bem-sucedido. User ID:`, data.user?.id, 'Sessão existente:', data.session !== null);
    return { error: null, data: { user: data.user, session: data.session } };
  }

  if (data && data.user && !data.session) {
    console.warn(`[AuthActions][${functionName}] Usuário retornado mas SEM SESSÃO. Email:`, data.user.email, 'Email Confirmado:', data.user.email_confirmed_at);
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

  console.warn(`[AuthActions][${functionName}] Supabase signInWithPassword retornou estado inesperado (sem erro, mas sem user/session válidos). Data:`, JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o login. Por favor, tente novamente.' }, data: null };
}


export async function signInWithGoogle() {
  const supabase = createSupabaseServerClient();
  const vercelUrl = process.env.VERCEL_URL;
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  let siteUrl;
  if (explicitBaseUrl) {
    siteUrl = explicitBaseUrl;
  } else if (vercelUrl) {
    siteUrl = `https://${vercelUrl}`;
  } else {
    siteUrl = 'http://localhost:9002'; // Ajustado para porta 9002
  }
  const redirectURL = `${siteUrl}/auth/callback`;

  console.log('[AuthActions] signInWithGoogle: Iniciando login com Google. Redirecionando para (options.redirectTo):', redirectURL);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectURL,
      // Você pode adicionar escopos se precisar de mais permissões do Google
      // scopes: 'email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    },
  });

  if (error) {
    console.error('[AuthActions] signInWithGoogle: Erro ao iniciar OAuth com Google:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return redirect(`/login?error=oauth_init_failed&error_description=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    console.log('[AuthActions] signInWithGoogle: URL de autorização do Google recebida. Redirecionando para (data.url):', data.url);
    redirect(data.url); 
  } else {
    console.error('[AuthActions] signInWithGoogle: Nenhuma URL de autorização retornada pelo Supabase.');
    return redirect('/login?error=oauth_url_missing&error_description=Falha ao obter URL de autorização do Google.');
  }
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
    
