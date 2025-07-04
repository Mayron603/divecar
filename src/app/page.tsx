
import { HeroSection } from '@/components/sections/hero-section';
import { InfoCard } from '@/components/common/info-card';
import { Users, ScrollText, Info, Building, Video, Shirt, UserCircle2 } from 'lucide-react'; 
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() { 
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const infoCardsData = [
    {
      title: "Nossa Hierarquia",
      description: "Conheça a estrutura de cargos e carreiras da Polícia Civil na DIVECAR Osasco.",
      href: "/hierarchy",
      icon: Users,
    },
    {
      title: "Nossa História",
      description: "Descubra a trajetória e os marcos importantes da DIVECAR em Osasco.",
      href: "/history",
      icon: ScrollText,
    },
    {
      title: "Sobre Nós",
      description: "Saiba mais sobre a missão, visão e valores da DIVECAR Osasco.",
      href: "/about",
      icon: Info,
    },
  ];

  return (
    <div className="space-y-16">
      <HeroSection />

      {user && (
        <Card className="mt-8 mb-12 shadow-lg animate-fade-in-up rounded-lg" style={{ animationDelay: '0.5s' }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <UserCircle2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-lg font-semibold text-primary">Bem-vindo(a) de volta!</p>
                <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <PageHeader 
          title="Explore a DIVECAR Osasco"
          description="Dedicados à investigação e repressão de furtos e roubos de veículos e cargas em Osasco."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {infoCardsData.map((card, index) => (
            <InfoCard
              key={card.title}
              title={card.title}
              description={card.description}
              href={card.href}
              icon={card.icon}
              animationDelay={`${0.7 + index * 0.1}s`}
            />
          ))}
        </div>
      </section>

      <section className="py-12 animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
        <PageHeader
          title="Nossa Identidade Visual"
          description="Conheça os detalhes e o simbolismo por trás dos uniformes e insígnias da Polícia Civil."
          icon={Shirt}
        />
        <div className="flex justify-center">
          <Card className="shadow-xl overflow-hidden max-w-3xl w-full rounded-lg">
            <CardContent className="p-0">
              <video 
                className="w-full h-auto"
                autoPlay
                loop
                muted
                playsInline 
                preload="metadata"
                aria-label="Vídeo institucional da Polícia Civil - Identidade Visual"
              >
                <source src="/videos/divecar2.mp4" type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12 animate-fade-in-up" style={{ animationDelay: '1.1s' }}>
        <PageHeader
          title="Nossas Operações em Destaque"
          description="Veja um pouco mais da nossa atuação e dedicação em campo."
          icon={Video}
        />
        <div className="flex justify-center">
          <Card className="shadow-xl overflow-hidden max-w-3xl w-full rounded-lg">
            <CardContent className="p-0">
              <video 
                className="w-full h-auto"
                controls
                autoPlay
                loop
                muted
                playsInline 
                preload="metadata"
                aria-label="Vídeo adicional de operações da DIVECAR Osasco"
              >
                <source src="/videos/divecar.mp4" type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="text-center py-12 bg-card p-8 rounded-lg shadow-xl animate-fade-in-up" style={{ animationDelay: '1.3s' }}>
        <Building className="h-16 w-16 text-accent mx-auto mb-6 transition-transform duration-300 hover:scale-110"/>
        <h2 className="text-3xl font-headline font-bold text-primary mb-4">Compromisso com Osasco</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          A DIVECAR Osasco é composta por profissionais dedicados e altamente qualificados, focados na investigação criminal para desvendar e coibir crimes de furto e roubo de veículos e cargas, visando a segurança e a justiça para a população de Osasco.
        </p>
      </section>
    </div>
  );
}
