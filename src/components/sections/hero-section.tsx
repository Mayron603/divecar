import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground py-20 md:py-32 rounded-lg shadow-2xl overflow-hidden mb-16">
      <div className="absolute inset-0 bg-black/40"></div> {/* Increased overlay slightly for better text contrast */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold tracking-tight drop-shadow-md">
          <span className="block">Polícia Civil de Osasco</span>
          <span className="block text-accent mt-2">DIVECAR</span>
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg sm:text-xl text-primary-foreground/90 drop-shadow-sm">
          Divisão de Investigações sobre Furtos e Roubos de Veículos e Cargas. Combatendo o crime com inteligência e rigor.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform hover:scale-105 shadow-lg">
            <Link href="/about">
              Nossa Missão
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10 transition-transform hover:scale-105 shadow-lg">
            <Link href="/history">
              Nossa História
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
