
'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { z } from 'zod';
import { AuthError } from '@supabase/supabase-js';

// Não precisamos de Zod para este formulário simples por enquanto.
// Se precisarmos, podemos adicionar:
// import { z } from 'zod';
// const SignUpSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

interface SignUpUserCredentials {
  email: string;
  password: string;
}

export async function signUpUser(credentials: SignUpUserCredentials) {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      // Você pode adicionar data_email_confirm aqui se quiser que seja enviado
      // mesmo que a confirmação de e-mail esteja desativada no projeto Supabase.
      // emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, // Opcional: para onde redirecionar após a confirmação
    },
  });

  if (error) {
    if (error instanceof AuthError) {
        console.error('Supabase Auth Error:', error.message, error.status);
        return { error: { message: error.message, status: error.status }, data: null };
    }
    console.error('Unknown error during sign up:', error);
    return { error: { message: 'Ocorreu um erro desconhecido durante o registro.' }, data: null };
  }

  // data.user será null se a confirmação de email estiver habilitada e o usuário ainda não confirmou.
  // data.session será null até que o usuário confirme o email (se habilitado) E faça login.
  // Se a confirmação de email estiver desabilitada, data.user e data.session serão preenchidos.
  console.log('Sign up successful. User:', data.user, 'Session:', data.session);
  return { error: null, data };
}

// Outras ações de autenticação (login, logout, etc.) podem ser adicionadas aqui.
