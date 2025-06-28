
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import NextImage from 'next/image';

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 rounded-lg shadow-2xl overflow-hidden mb-16 h-[50vh] md:h-[70vh] flex items-center justify-center">
      <NextImage
        src="https://placehold.co/1280x720.png"
        alt="Paisagem urbana de Osasco ao entardecer"
        fill
        className="absolute z-0 object-cover"
        priority
        data-ai-hint="cityscape osasco"
      />
      <div className="absolute inset-0 bg-black/60 z-10"></div> {/* Overlay escurecido para melhor contraste */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold tracking-tight text-white drop-shadow-md animate-fade-in-up">
          <span className="block">Guarda Civil Municipal</span>
          <span className="block text-primary mt-2">Osasco</span>
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg sm:text-xl text-slate-100 drop-shadow-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Servindo e protegendo a comunidade de Osasco com honra e dedicação.
        </p>
        <div className="mt-10 flex justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg">
            <Link href="/about">
              Nossa Missão
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-primary text-primary bg-white/90 hover:bg-white transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg">
            <Link href="/history">
              Nossa História
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
