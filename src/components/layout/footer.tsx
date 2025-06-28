
export function Footer() {
  return (
    <footer className="bg-background text-foreground py-8 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Guarda Civil Municipal de Osasco. Todos os direitos reservados.
        </p>
        <p className="text-xs mt-1 text-muted-foreground">
          Secretaria de Segurança e Controle Urbano - Prefeitura de Osasco
        </p>
      </div>
    </footer>
  );
}
