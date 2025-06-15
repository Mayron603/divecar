
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 rounded-lg shadow-2xl overflow-hidden mb-16 h-[50vh] md:h-[70vh] flex items-center justify-center">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute z-0 w-auto min-w-full min-h-full max-w-none object-cover"
        aria-label="Vídeo de apresentação da DIVECAR Osasco"
      >
        <source src="/videos/divecar3.mp4" type="video/mp4" />
        Seu navegador não suporta o elemento de vídeo.
      </video>
      <div className="absolute inset-0 bg-black/60 z-10"></div> {/* Overlay escurecido para melhor contraste */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold tracking-tight text-white drop-shadow-md animate-fade-in-up">
          <span className="block">Polícia Civil de Osasco</span>
          <span className="block text-accent mt-2">DIVECAR</span>
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg sm:text-xl text-slate-100 drop-shadow-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Divisão de Investigações sobre Furtos e Roubos de Veículos e Cargas. Combatendo o crime com inteligência e rigor.
        </p>
        <div className="mt-10 flex justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:brightness-110 shadow-lg">
            <Link href="/about">
              Nossa Missão
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:text-accent hover:border-accent shadow-lg">
            <Link href="/history">
              Nossa História
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
