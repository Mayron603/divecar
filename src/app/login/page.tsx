
'use client';

import { useState, type FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { signInUser } from '@/lib/actions/auth.actions';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorCodeParam = searchParams.get('error_code');
    const errorDescriptionParam = searchParams.get('error_description');
    const messageParam = searchParams.get('message'); // For custom messages

    let displayError: string | null = null;

    if (messageParam) {
      displayError = messageParam;
    } else if (errorDescriptionParam) {
      displayError = errorDescriptionParam;
    } else if (errorParam) {
      displayError = `Erro: ${errorParam}${errorCodeParam ? ` (código: ${errorCodeParam})` : ''}`;
    }
    
    if (displayError) {
      // Decodificar a mensagem se ela foi codificada
      try {
        displayError = decodeURIComponent(displayError);
      } catch (e) {
        console.warn("Failed to decode error message from URL:", e);
      }
      setError(displayError);
      toast({ variant: 'destructive', title: 'Erro de Autenticação', description: displayError });
      // Limpar os parâmetros da URL para não exibir a mensagem novamente em um refresh simples
      // router.replace('/login', { scroll: false }); // Comentado pois pode causar loop se o toast não for suficiente
    }
  }, [searchParams, toast, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Limpar erros anteriores
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

  return (
    <div className="space-y-8 flex flex-col items-center">
      <PageHeader
        title="Acessar Conta"
        description="Entre com suas credenciais para acessar a plataforma."
        icon={LogIn}
      />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Preencha os campos abaixo para entrar.</CardDescription>
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
                disabled={isLoading}
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
                disabled={isLoading}
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Entrar
                </>
              )}
            </Button>
            <Button variant="link" asChild className="text-sm">
                <Link href="/register">Não tem uma conta? Registre-se</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
