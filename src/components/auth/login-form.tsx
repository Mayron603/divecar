
'use client';

import React, { useState, type FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { signInUser, signInWithGoogle } from '@/lib/actions/auth.actions';
import { useToast } from '@/hooks/use-toast';

// Inline SVG for Google icon
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="18px" height="18px">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);


export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorCodeParam = searchParams.get('error_code');
    const errorDescriptionParam = searchParams.get('error_description');
    const messageParam = searchParams.get('message');

    let displayError: string | null = null;

    if (messageParam) {
      displayError = messageParam;
    } else if (errorDescriptionParam) {
      displayError = errorDescriptionParam;
    } else if (errorParam) {
      displayError = `Erro: ${errorParam}${errorCodeParam ? ` (código: ${errorCodeParam})` : ''}`;
    }
    
    if (displayError) {
      try {
        displayError = decodeURIComponent(displayError);
      } catch (e) {
        console.warn("Failed to decode error message from URL:", e);
      }
      setError(displayError);
      if (errorParam || messageParam) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: displayError });
      }
    }
  }, [searchParams, toast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); 
    setIsLoading(true);

    try {
      const result = await signInUser({ email, password });

      if (result.error) {
        const errorMessage = result.error.message || 'Falha no login. Verifique suas credenciais.';
        setError(errorMessage);
        toast({ variant: 'destructive', title: 'Erro no Login', description: errorMessage });
      } else if (result.data?.user) {
        toast({ title: 'Login Bem-sucedido!', description: `Bem-vindo(a) de volta!` });
        router.push('/'); 
        router.refresh(); 
      } else {
        const unexpectedError = 'Resposta inesperada do servidor durante o login.';
        setError(unexpectedError);
        toast({ variant: 'destructive', title: 'Erro Inesperado', description: unexpectedError });
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Ocorreu um erro inesperado durante o login.';
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Erro Crítico', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      // signInWithGoogle irá redirecionar, então não esperamos um resultado aqui
      await signInWithGoogle();
      // O redirecionamento acontece via Server Action, então o finally pode não ser atingido
      // se o redirecionamento for bem-sucedido antes.
    } catch (e: any) {
      const errorMessage = e.message || 'Ocorreu um erro ao tentar login com Google.';
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Erro Login Google', description: errorMessage });
      setIsGoogleLoading(false);
    }
    // Não colocar setIsGoogleLoading(false) aqui se o redirecionamento for esperado.
    // A página será recarregada ou o usuário será redirecionado.
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Preencha os campos abaixo para entrar ou use o Google.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || isGoogleLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || isGoogleLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          {error && (
            <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
              <AlertCircle className="mr-2 h-5 w-5" />
              <p>{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Entrar com E-mail
              </>
            )}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Aguarde...
              </>
            ) : (
              <>
                <GoogleIcon /> 
                <span className="ml-2">Entrar com Google</span>
              </>
            )}
          </Button>

          <Button variant="link" asChild className="text-sm">
              <Link href="/register">Não tem uma conta? Registre-se</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

    