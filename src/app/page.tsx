
import { HeroSection } from '@/components/sections/hero-section';
import { InfoCard } from '@/components/common/info-card';
import { Users, ScrollText, Info, ShieldCheck, UserCircle2 } from 'lucide-react'; 
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() { 
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const infoCardsData = [
    {
      title: "Nossa Hierarquia",
      description: "Conheça a estrutura de postos e graduações da Guarda Civil Municipal de Osasco.",
      href: "/hierarchy",
      icon: Users,
    },
    {
      title: "Nossa História",
      description: "Descubra a trajetória e os marcos importantes da GCM em Osasco.",
      href: "/history",
      icon: ScrollText,
    },
    {
      title: "Sobre Nós",
      description: "Saiba mais sobre a missão, visão e valores da GCM Osasco.",
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
          title="Explore a GCM Osasco"
          description="Dedicados a proteger o patrimônio e servir a comunidade de Osasco com honra e bravura."
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

      <section className="text-center py-12 bg-card p-8 rounded-lg shadow-xl animate-fade-in-up" style={{ animationDelay: '1.3s' }}>
        <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-6 transition-transform duration-300 hover:scale-110"/>
        <h2 className="text-3xl font-headline font-bold text-primary mb-4">Compromisso com Osasco</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          A Guarda Civil Municipal de Osasco é formada por agentes dedicados e qualificados, focados na proteção da população, no patrulhamento preventivo e na preservação da ordem pública, visando a segurança e o bem-estar de todos os cidadãos.
        </p>
      </section>
    </div>
  );
}
