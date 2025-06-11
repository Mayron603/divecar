import { HeroSection } from '@/components/sections/hero-section';
import { InfoCard } from '@/components/common/info-card';
import { Users, ScrollText, Info, ShieldCheck, Video } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const infoCardsData = [
    {
      title: "Nossa Hierarquia",
      description: "Entenda a estrutura organizacional e a cadeia de comando da Força Tática de Morumbi.",
      href: "/hierarchy",
      icon: Users,
    },
    {
      title: "Nossa História",
      description: "Conheça a trajetória, os marcos e as conquistas da nossa força ao longo dos anos.",
      href: "/history",
      icon: ScrollText,
    },
    {
      title: "Sobre Nós",
      description: "Descubra nossa missão, visão, valores e o compromisso com a segurança da comunidade.",
      href: "/about",
      icon: Info,
    },
  ];

  return (
    <div className="space-y-16">
      <HeroSection />

      <section>
        <PageHeader 
          title="Explore Nossa Força"
          description="Dedicados a servir e proteger a cidade de Morumbi com honra, coragem e profissionalismo."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {infoCardsData.map((card) => (
            <InfoCard
              key={card.title}
              title={card.title}
              description={card.description}
              href={card.href}
              icon={card.icon}
            />
          ))}
        </div>
      </section>

      <section className="py-12">
        <PageHeader
          title="Força Tática em Ação"
          description="Veja um pouco do nosso dia a dia e dedicação à comunidade de Morumbi."
          icon={Video}
        />
        <Card className="shadow-xl overflow-hidden">
          <CardContent className="p-0">
            {/* 
              IMPORTANTE: Para este vídeo funcionar, crie uma pasta 'videos' 
              dentro da sua pasta 'public' e coloque o arquivo 'PMESP.mp4' lá.
              O caminho final deve ser: public/videos/PMESP.mp4
            */}
            <video 
              className="w-full h-auto"
              controls 
              preload="metadata"
              aria-label="Vídeo institucional da Força Tática de Morumbi"
            >
              <source src="/videos/PMESP.mp4" type="video/mp4" />
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </CardContent>
        </Card>
         <p className="mt-4 text-sm text-center text-muted-foreground">
          Nota: Certifique-se de que o arquivo de vídeo <code>PMESP.mp4</code> está localizado em <code>public/videos/PMESP.mp4</code>.
        </p>
      </section>

      <section className="text-center py-12 bg-card p-8 rounded-lg shadow-xl">
        <ShieldCheck className="h-16 w-16 text-accent mx-auto mb-6"/>
        <h2 className="text-3xl font-headline font-bold text-primary mb-4">Compromisso com Morumbi</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          A Força Tática de Morumbi é composta por profissionais altamente treinados e dedicados, prontos para enfrentar os desafios da segurança pública moderna. Nosso objetivo é garantir um ambiente seguro e pacífico para todos os cidadãos, trabalhando em estreita colaboração com a comunidade.
        </p>
      </section>
    </div>
  );
}
