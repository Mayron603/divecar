
'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { z } from 'zod';
import { AuthError } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

// Esquema para validação de SignUp (pode ser expandido)
// const SignUpSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

interface UserCredentials {
  email: string;
  password: string;
}

export async function signUpUser(credentials: UserCredentials) {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      // emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, // Opcional
    },
  });

  if (error) {
    if (error instanceof AuthError) {
        console.error('Supabase Auth SignUp Error:', error.message, error.status);
        return { error: { message: error.message, status: error.status }, data: null };
    }
    console.error('Unknown error during sign up:', error);
    return { error: { message: 'Ocorreu um erro desconhecido durante o registro.' }, data: null };
  }

  console.log('Sign up processed. User data:', data.user, 'Session:', data.session);
  // Se a confirmação de e-mail estiver habilitada, data.user pode existir mas data.session será null.
  // Se a confirmação estiver desabilitada, ambos (user e session) devem ser preenchidos.
  return { error: null, data };
}


export async function signInUser(credentials: UserCredentials) {
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
  
  // signInWithPassword bem-sucedido define o cookie de sessão automaticamente.
  console.log('Sign in successful. User:', data.user, 'Session:', data.session);
  return { error: null, data };
}

export async function signOutUser() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Supabase Auth SignOut Error:', error);
    // Mesmo que haja um erro, tentamos redirecionar
    // Pode ser útil retornar o erro para o cliente se necessário no futuro.
  }
  // O Supabase SSR cuidará da limpeza dos cookies.
  // Redirecionar para a página inicial após o logout.
  return redirect('/');
}
