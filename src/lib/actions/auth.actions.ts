
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User, Session } from '@supabase/supabase-js'; // AuthError é implícito ou pode ser pego como 'any'
import { redirect } from 'next/navigation';
// cookies é importado e usado dentro de createSupabaseServerClient

interface UserCredentials {
  email: string;
  password: string;
}

interface SignUpResponseData {
  user: User | null;
  session: Session | null; // session será null no signup, mas mantido para consistência da interface
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
    let errorStatus: number | undefined = (supabaseError as any).status; // Cast para any para acessar status
    const lowerMessage = supabaseError.message.toLowerCase();

    // Condições mais específicas para "usuário já existe e confirmado"
    if (
        (errorStatus === 400 && (lowerMessage.includes('user already exists') || lowerMessage.includes('user already registered') || lowerMessage.includes('email address already registered by another user'))) ||
        (errorStatus === 422 && lowerMessage.includes('already registered')) || // Comum para "User already registered"
        lowerMessage.includes('already registered') // Captura geral
       ) {
      errorMessage = 'Este e-mail já está registrado e confirmado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
    }
    // Outras condições de erro podem ser adicionadas aqui
    
    return { error: { message: errorMessage, name: errorName, status: errorStatus }, data: null };
  }

  // Se não houve erro explícito do Supabase, verificamos os dados retornados
  if (data.user) {
    const user = data.user;
    const now = new Date();
    const createdAt = new Date(user.created_at);
    // Verifica se created_at é muito recente (e.g., nos últimos 10 segundos)
    // Isso ajuda a distinguir um usuário genuinamente novo de um usuário existente não confirmado
    // para o qual o Supabase apenas reenviou o e-mail de confirmação.
    const isRecentlyCreated = (now.getTime() - createdAt.getTime()) < 10000; // 10 segundos de buffer

    if (user.email_confirmed_at) {
      // Se o e-mail já está confirmado aqui, significa que o e-mail está em uso.
      // Supabase signUp deveria ter retornado um erro se "Secure Email Change" estiver OFF.
      // Se "Secure Email Change" estiver ON, este cenário é possível (novo user não confirmado com email de user confirmado existente).
      // Para o fluxo padrão (Secure Email Change OFF), consideramos isto um erro de e-mail já registrado.
      console.warn('[AuthActions] signUpUser: Usuário retornado E email_confirmed_at está preenchido. Email:', user.email);
      return {
        error: {
          message: 'Este e-mail já está registrado e confirmado. Tente fazer login.',
          name: 'UserAlreadyExistsError', 
        },
        data: null
      };
    } else {
      // Usuário não está confirmado (email_confirmed_at é nulo ou ausente).
      if (isRecentlyCreated) {
        // Genuinamente novo usuário, confirmação enviada.
        console.log('[AuthActions] signUpUser: Novo usuário registrado (isRecentlyCreated=true). Confirmação de e-mail enviada. Email:', user.email);
        return {
          error: null, 
          data: {
            user: user,
            session: null, 
            message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
          }
        };
      } else {
        // Usuário existente, mas não confirmado. Supabase reenviou o e-mail de confirmação.
        console.log('[AuthActions] signUpUser: E-mail já cadastrado, mas não confirmado (isRecentlyCreated=false). Reenviando e-mail de confirmação. Email:', user.email);
        return {
          error: null, // Não é um "erro" para o formulário, mas uma mensagem informativa.
          data: {
            user: user,
            session: null, 
            message: 'Este e-mail já está cadastrado, mas não confirmado. Enviamos um novo e-mail de confirmação. Por favor, verifique sua caixa de entrada.'
          }
        };
      }
    }
  }
  
  // Fallback para um estado inesperado (sem erro, sem usuário)
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
    let errorStatus: number | undefined = (supabaseError as any).status; // Cast para any para acessar status

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
    console.log('[AuthActions] signInUser: Login bem-sucedido. User ID:', data.user?.id, 'Sessão existente:', data.session !== null);
    return { error: null, data: { user: data.user, session: data.session } };
  }
  
  // Fallback para um estado inesperado (sem erro, mas sem usuário/sessão)
  console.warn('[AuthActions] Supabase signInWithPassword retornou estado inesperado. Data:', JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o login.' }, data: null };
}

export async function signOutUser() {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] signOutUser: Tentando logout (server action)...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[AuthActions] Supabase Auth SignOut ERRO:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // Mesmo com erro no Supabase, tentamos redirecionar. O erro pode ser de rede, etc.
    // O cliente deve lidar com a ausência de sessão.
  } else {
    console.log('[AuthActions] signOutUser: Usuário deslogado com sucesso do backend Supabase via server action.');
  }
  // Sempre redireciona para a home após a tentativa de logout.
  // A Navbar no cliente (onAuthStateChange) deve refletir a mudança de estado.
  redirect('/'); 
}

    