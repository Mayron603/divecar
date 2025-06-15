
export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-primary/90 to-primary text-primary-foreground py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Polícia Civil de Osasco - DIVECAR. Todos os direitos reservados.
        </p>
        <p className="text-xs mt-1">
          Divisão de Investigações sobre Furtos e Roubos de Veículos e Cargas - Osasco
        </p>
      </div>
    </footer>
  );
}
