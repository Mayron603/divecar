export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Força Tática de Morumbi. Todos os direitos reservados.
        </p>
        <p className="text-xs mt-1">
          Este site é um projeto demonstrativo.
        </p>
      </div>
    </footer>
  );
}
