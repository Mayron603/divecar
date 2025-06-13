
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { Info, Target, Eye, ShieldCheck, Users2, Search } from 'lucide-react';

interface AboutSection {
  title: string;
  content: string;
  icon: LucideIcon;
}

const aboutSections: AboutSection[] = [
  {
    title: "Nossa Missão",
    content: "Investigar, reprimir e prevenir os crimes de furto e roubo de veículos e cargas na cidade de Osasco, utilizando inteligência policial, tecnologia e dedicação para garantir a aplicação da lei e a proteção do patrimônio dos cidadãos.",
    icon: Target,
  },
  {
    title: "Nossa Visão",
    content: "Ser uma divisão de investigação de referência no combate aos crimes contra o patrimônio, reconhecida pela excelência técnica, pela celeridade nas apurações e pelo impacto positivo na redução da criminalidade em Osasco.",
    icon: Eye,
  },
  {
    title: "Nossos Valores",
    content: "Legalidade, Justiça, Ética, Profissionalismo, Dedicação, Sigilo Profissional e Respeito aos Direitos Humanos. Estes são os pilares que norteiam cada ação investigativa e decisão de nossos policiais.",
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        title="Sobre a DIVECAR Osasco"
        description="Divisão de Investigações sobre Furtos e Roubos de Veículos e Cargas. Comprometidos com a investigação e a justiça."
        icon={Info}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <video
            className="w-full h-auto rounded-lg shadow-xl"
            autoPlay
            loop
            muted
            playsInline
            aria-label="Vídeo institucional sobre a DIVECAR Osasco"
          >
            <source src="/videos/sobre_nos.mp4" type="video/mp4" />
            Seu navegador não suporta o elemento de vídeo.
          </video>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-headline font-semibold text-primary">Quem Somos</h2>
          <p className="text-lg text-foreground leading-relaxed">
            A Divisão de Investigações sobre Furtos e Roubos de Veículos e Cargas (DIVECAR) de Osasco é uma unidade especializada da Polícia Civil, dedicada à apuração de crimes complexos que afetam diretamente o patrimônio e a segurança da nossa comunidade.
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            Nossos policiais civis são altamente qualificados em técnicas de investigação, inteligência e análise criminal, trabalhando incansavelmente para identificar autores, recuperar bens e desarticular organizações criminosas.
          </p>
        </div>
      </div>

      <div className="space-y-8 mt-16">
        {aboutSections.map((section) => (
          <Card key={section.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center space-x-4">
              <div className="p-3 bg-accent rounded-full">
                <section.icon className="h-7 w-7 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl text-primary">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground text-lg leading-relaxed">{section.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <section className="py-12 bg-card p-8 rounded-lg shadow-xl mt-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-3xl font-headline font-semibold text-primary mb-4">Nosso Foco Investigativo</h3>
            <p className="text-lg text-foreground mb-3">A DIVECAR Osasco concentra seus esforços em:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground text-lg">
              <li>Investigação de furtos e roubos de veículos automotores.</li>
              <li>Apuração de roubos e desvios de cargas.</li>
              <li>Identificação e prisão de receptadores e quadrilhas especializadas.</li>
              <li>Recuperação de veículos e cargas subtraídas.</li>
              <li>Utilização de inteligência policial para prevenção e repressão qualificada.</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <Search className="h-40 w-40 text-primary opacity-80" />
          </div>
        </div>
      </section>
    </div>
  );
}
