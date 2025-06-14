
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signUpUser } from '@/lib/actions/auth.actions';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      const msg = 'As senhas não coincidem.';
      setError(msg);
      toast({ variant: 'destructive', title: 'Erro de Validação', description: msg });
      return;
    }
    if (password.length < 6) {
      const msg = 'A senha deve ter pelo menos 6 caracteres.';
      setError(msg);
      toast({ variant: 'destructive', title: 'Erro de Validação', description: msg });
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpUser({ email, password });

      if (result.error) {
        // Se for o erro customizado de "usuário já existe"
        if (result.error.name === 'UserAlreadyExistsError') {
          setError(result.error.message);
          toast({ variant: 'destructive', title: 'Falha no Registro', description: result.error.message });
        } else {
          // Outros erros
          const errorMessage = result.error.message || 'Ocorreu um erro durante o registro.';
          setError(errorMessage);
          toast({ variant: 'destructive', title: 'Erro no Registro', description: errorMessage });
        }
        setSuccessMessage(null);
      } else if (result.data && result.data.message) {
        // Usa a mensagem de sucesso específica da Server Action
        setSuccessMessage(result.data.message);
        toast({ title: 'Registro Enviado!', description: result.data.message });
        // Limpa os campos apenas em caso de sucesso claro de novo registro
        if (result.data.message.includes('Conta criada com sucesso')) {
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        }
        setError(null); 
      } else {
         // Fallback para um estado inesperado, mas que não é um erro explícito.
         const unexpectedMsg = 'Resposta inesperada do servidor.';
         setError(unexpectedMsg);
         toast({ variant: 'destructive', title: 'Erro Inesperado', description: unexpectedMsg });
         setSuccessMessage(null);
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Ocorreu um erro crítico durante o registro.';
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Erro Crítico', description: errorMessage });
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 flex flex-col items-center">
      <PageHeader
        title="Registrar Nova Conta"
        description="Crie uma conta para acessar os recursos da plataforma."
        icon={UserPlus}
      />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>Preencha os campos abaixo para se registrar.</CardDescription>
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
                placeholder="•••••••• (mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            {error && !successMessage && (
              <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                <AlertCircle className="mr-2 h-5 w-5" />
                <p>{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center p-3 text-sm text-green-700 bg-green-50 border border-green-300 rounded-md">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                <p>{successMessage}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || (!!successMessage && successMessage.includes('Conta criada com sucesso'))}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Registrar
                </>
              )}
            </Button>
            <Button variant="link" asChild className="text-sm">
                <Link href="/login">Já tem uma conta? Faça login</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

