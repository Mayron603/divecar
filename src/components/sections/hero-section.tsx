import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground py-20 md:py-32 rounded-lg shadow-2xl overflow-hidden mb-16">
      <div className="absolute inset-0">
        <Image
          src="https://placehold.co/1200x600.png"
          alt="Força Tática em ação"
          data-ai-hint="tactical police team"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold tracking-tight drop-shadow-md">
          <span className="block">Bem-vindo ao Hub da</span>
          <span className="block text-accent mt-2">Força Tática de Morumbi</span>
        </h1>
        <p className="mt-6 max-w-lg mx-auto text-lg sm:text-xl text-primary-foreground/90 drop-shadow-sm">
          A vanguarda da segurança e proteção em nossa cidade. Conheça nossa missão, história e estrutura.
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
