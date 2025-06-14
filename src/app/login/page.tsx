
import React, { Suspense } from 'react'; // Import Suspense
import { PageHeader } from '@/components/common/page-header';
import { LogIn, Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form'; // Import the new component

// Removed 'use client' - this page is now a Server Component

// LoginContent function is removed from here and moved to LoginForm

export default function LoginPage() {
  return (
    <div className="space-y-8 flex flex-col items-center">
      <PageHeader
        title="Acessar Conta"
        description="Entre com suas credenciais para acessar a plataforma."
        icon={LogIn}
      />
      <Suspense fallback={
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Carregando formulário...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
