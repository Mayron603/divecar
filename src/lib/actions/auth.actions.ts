
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
  session: Session | null; // Session is typically null on signUp until email is confirmed
  message?: string;
}

// Renamed to avoid conflict with Supabase's own AuthError type if imported
interface CustomAuthError {
  message: string;
  name?: string;
  status?: number; // HTTP status code or similar
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
  console.log('[AuthActions] signUpUser: VERIFIQUE A CONFIGURAÇÃO "Alteração segura de e-mail" (Secure Email Change) NO PAINEL SUPABASE. ELA DEVE ESTAR DESABILITADA para o comportamento esperado de erro em e-mails já confirmados.');

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
    console.error('[AuthActions] signUpUser: Supabase Auth SignUp retornou um ERRO EXPLÍCITO. Objeto de erro completo:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError)));
  } else {
    console.log('[AuthActions] signUpUser: Supabase Auth SignUp NÃO retornou erro explícito.');
  }
  if (data) {
    console.log('[AuthActions] signUpUser: Supabase Auth SignUp retornou DADOS. Objeto de dados completo:', JSON.stringify(data, null, 2));
    if (data.user) {
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> ID:', data.user.id);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> Email:', data.user.email);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> email_confirmed_at:', data.user.email_confirmed_at);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> created_at:', data.user.created_at);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> updated_at:', data.user.updated_at);
        console.log('[AuthActions] signUpUser: DETALHES DO data.user -> identities:', JSON.stringify(data.user.identities, null, 2));
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
    let errorStatus: number | undefined = (supabaseError as any).status; // Common place for HTTP status
    
    const lowerMessage = (supabaseError.message || '').toLowerCase();

    // Prioritizing errors that indicate the user already exists and is likely confirmed
    if (
        (errorStatus === 400 && (lowerMessage.includes('user already registered') || lowerMessage.includes('email address already registered by another user'))) ||
        (errorStatus === 422 && lowerMessage.includes('already registered')) || // Unprocessable Entity, often for validation like existing user
        (errorStatus === 409) || // HTTP 409 Conflict
        lowerMessage.includes('user already exists with this email address') // Common Supabase message
       ) {
      errorMessage = 'Este e-mail já está registrado e confirmado. Tente fazer login.';
      errorName = 'UserAlreadyExistsError';
      console.log(`[AuthActions] signUpUser: Detectado erro de usuário já existente e CONFIRMADO (via supabaseError): ${errorMessage}`);
    } else if (lowerMessage.includes('rate limit exceeded')) {
        errorMessage = 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.';
        errorName = 'RateLimitError';
        console.log(`[AuthActions] signUpUser: Detectado erro de limite de taxa (via supabaseError): ${errorMessage}`);
    } else {
      console.log(`[AuthActions] signUpUser: Erro genérico do Supabase (via supabaseError): ${errorMessage}, Nome: ${errorName}, Status: ${errorStatus}`);
    }
    return { error: { message: errorMessage, name: errorName, status: errorStatus }, data: null };
  }

  // Se não houve erro explícito do Supabase, analisamos data.user
  if (data && data.user) {
    const user = data.user;

    // Cenário 1: O e-mail já existe e ESTÁ CONFIRMADO.
    // Isso é uma verificação adicional. Idealmente, Supabase deveria ter retornado um erro acima.
    // `user.email_confirmed_at` no objeto de resposta do signUp se refere à *nova* identidade que está sendo criada.
    // A propriedade `identities` é mais confiável para saber se o e-mail já era conhecido.
    // Se identities não está vazio E email_confirmed_at (do objeto user geral) for true, ele já existe e é confirmado.
    // No entanto, a API do Supabase no cliente não expõe diretamente o `email_confirmed_at` de identidades *existentes*
    // de forma fácil durante um `signUp` que não erra. A presença de `identities` é o melhor indicador que temos.

    if (user.identities && user.identities.length > 0) {
      // O usuário/e-mail já é conhecido pelo Supabase.
      // O `user.email_confirmed_at` aqui no objeto de resposta do signUp *pode ser nulo* se o Supabase
      // estiver apenas reenviando uma confirmação para uma identidade existente não confirmada.
      // Se o email_confirmed_at FOR verdadeiro AQUI, é um caso estranho onde o signUp não errou,
      // mas o usuário retornado já tem o email_confirmed_at preenchido.
      // É mais seguro assumir que, se identities não está vazio, o e-mail já estava registrado.
      // A distinção entre confirmado ou não para este caso se baseia se o *novo* signUp
      // resultou em `email_confirmed_at` ser true (o que seria estranho se o usuário já era confirmado).
      // Por isso, se `identities` não for vazio, o mais provável é que o e-mail já estava cadastrado e
      // Supabase está reenviando a confirmação (email_confirmed_at no objeto user será null).
      // Se o usuário *já era confirmado* e Supabase não deu erro, isso é um problema de configuração do Supabase.

      // Para um e-mail JÁ CONFIRMADO que tenta se registrar novamente (e Supabase não deu erro):
      // Precisamos de uma forma de saber que ele *já era confirmado*.
      // Se `user.email_confirmed_at` no objeto User retornado é TRUE e `identities` não é vazio,
      // isso sugere que o usuário já existe e está confirmado.
      // MAS, se o Supabase está criando uma *nova identidade não confirmada* para um e-mail já confirmado,
      // então `user.email_confirmed_at` na resposta pode ser `null`.
      // ESTA É A PARTE MAIS DIFÍCIL DE DISTINGUIR SEM UM ERRO DO SUPABASE.

      // Vamos assumir: se `identities` não é vazio, o usuário já existia.
      // O `user.email_confirmed_at` da resposta do `signUp` reflete o estado da *nova* identidade.
      // Se o Supabase está configurado para não dar erro em `signUp` de e-mail já confirmado,
      // ele pode estar reenviando um e-mail de "confirmação" para uma nova identidade.
      // A melhor heurística aqui, se não houve erro explícito:
      const isExistingUnconfirmed = user.identities.some(id => !id.identity_data?.email_verified_at && id.email === user.email);
      const isExistingConfirmed = user.identities.some(id => id.identity_data?.email_verified_at && id.email === user.email);


      if (isExistingConfirmed) {
         console.log('[AuthActions] signUpUser: SCENARIO 1 - E-mail já registrado e CONFIRMADO (baseado em user.identities). Email:', user.email);
          return {
              error: {
                  message: 'Este e-mail já está registrado e confirmado. Tente fazer login.',
                  name: 'UserAlreadyExistsError',
              },
              data: null
          };
      } else { // Implica que user.identities existe mas nenhum deles está confirmado, ou o email_confirmed_at principal é nulo
          console.log('[AuthActions] signUpUser: SCENARIO 2 - E-mail já cadastrado, NÃO CONFIRMADO (identities existem, email_confirmed_at é nulo ou identities não confirmadas). Reenviando confirmação. Email:', user.email);
          return {
              error: null,
              data: {
                  user: user,
                  session: data.session, // Geralmente null aqui
                  message: 'Este e-mail já está cadastrado, mas não confirmado. Enviamos um novo e-mail de confirmação. Por favor, verifique sua caixa de entrada.'
              }
          };
      }

    } else if (!user.identities || user.identities.length === 0) {
      // Cenário 3: Usuário genuinamente NOVO (sem identidades ou array de identidades vazio).
      console.log('[AuthActions] signUpUser: SCENARIO 3 - Usuário NOVO (sem identities ou identities vazio). Enviando confirmação. Email:', user.email);
      return {
        error: null,
        data: {
          user: user,
          session: data.session, // Geralmente null aqui
          message: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar sua conta.'
        }
      };
    } else {
      // Fallback para uma lógica inesperada sobre identities
      console.warn('[AuthActions] signUpUser: Lógica de identities inesperada. User object:', JSON.stringify(user, null, 2));
       // Se, por algum motivo, não caiu nos cenários acima mas temos um usuário,
      // e o `email_confirmed_at` desse usuário é true, é mais seguro dizer que já existe.
      if (user.email_confirmed_at) {
          return {
              error: {
                  message: 'Este e-mail parece já estar registrado e confirmado (fallback). Tente fazer login.',
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
              message: 'Este e-mail parece já estar cadastrado (fallback). Enviamos um novo e-mail de confirmação. Verifique sua caixa de entrada.'
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
    console.error('[AuthActions] signInUser: Supabase Auth SignIn retornou um ERRO. Objeto de erro completo:', JSON.stringify(supabaseError, Object.getOwnPropertyNames(supabaseError)));
    let friendlyMessage = 'Falha no login. Verifique suas credenciais ou tente novamente mais tarde.';
    let errorName: string | undefined = supabaseError.name;
    let errorStatus: number | undefined = (supabaseError as any).status;

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
    return { error: { message: friendlyMessage, name: errorName, status: errorStatus }, data: null };
  }

  if (data && data.user && data.session) {
    console.log('[AuthActions] signInUser: Login bem-sucedido. User ID:', data.user?.id, 'Sessão existente:', data.session !== null);
    return { error: null, data: { user: data.user, session: data.session } };
  }

  // Caso incomum: usuário retornado, mas sem sessão.
  // Pode acontecer se o e-mail não foi confirmado, mas o Supabase não retornou o erro específico "Email not confirmed".
  if (data && data.user && !data.session) {
    console.warn('[AuthActions] signInUser: Usuário retornado mas SEM SESSÃO. Email:', data.user.email, 'Email Confirmado:', data.user.email_confirmed_at);
    if (!data.user.email_confirmed_at) { // Checa explicitamente a flag de confirmação do usuário.
      return { error: { message: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (fallback).', name: 'EmailNotConfirmedError' }, data: null };
    }
    // Se o email está confirmado mas não há sessão, é um erro de login mais genérico.
    return { error: { message: 'Falha ao estabelecer uma sessão de login, embora o usuário exista e esteja confirmado. Tente novamente.' }, data: null };
  }

  console.warn('[AuthActions] signInUser: Supabase signInWithPassword retornou estado inesperado (sem erro, mas sem user/session válidos). Data:', JSON.stringify(data));
  return { error: { message: 'Resposta inesperada do servidor durante o login. Por favor, tente novamente.' }, data: null };
}


export async function signOutUser() {
  const supabase = createSupabaseServerClient();
  console.log('[AuthActions] signOutUser: Tentando logout (server action)...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Log do erro, mas não impede o redirect. O redirect é mais importante para o UX.
    console.error('[AuthActions] Supabase Auth SignOut ERRO:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  } else {
    console.log('[AuthActions] signOutUser: Usuário deslogado com sucesso do backend Supabase via server action.');
  }
  // Redireciona para a home page independentemente de erro no signOut,
  // pois o objetivo é deslogar o cliente.
  redirect('/');
}
    

    