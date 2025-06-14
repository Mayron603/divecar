
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="space-y-8 flex flex-col items-center">
      <PageHeader
        title="Login"
        description="A funcionalidade de login será implementada em breve."
        icon={LogIn}
      />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Esta página está em desenvolvimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Ainda não tem uma conta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Registre-se aqui.
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
