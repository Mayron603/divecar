
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { Info, Target, Eye, ShieldCheck, ClipboardList } from 'lucide-react';
import NextImage from 'next/image';

interface AboutSection {
  title: string;
  content: string;
  icon: LucideIcon;
}

const aboutSections: AboutSection[] = [
  {
    title: "Nossa Missão",
    content: "Proteger os cidadãos, o patrimônio público e o meio ambiente do município de Osasco, atuando de forma preventiva e comunitária, garantindo a ordem e a segurança urbana com respeito e dedicação.",
    icon: Target,
  },
  {
    title: "Nossa Visão",
    content: "Ser uma Guarda Civil Municipal de referência, reconhecida pela excelência no serviço prestado, pela integração com a comunidade e pela inovação em políticas de segurança pública municipal.",
    icon: Eye,
  },
  {
    title: "Nossos Valores",
    content: "Hierarquia, Disciplina, Respeito, Probidade, Coragem e Profissionalismo. Estes são os pilares que guiam as ações de cada um dos nossos agentes em seu serviço diário à população de Osasco.",
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        title="Sobre a GCM de Osasco"
        description="Guarda Civil Municipal de Osasco. Comprometidos com a proteção e o serviço à comunidade."
        icon={Info}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="overflow-hidden rounded-lg shadow-xl">
          <NextImage
            src="https://placehold.co/600x400.png"
            alt="Agentes da GCM de Osasco em formação"
            width={600} 
            height={400} 
            className="w-full h-auto object-cover transition-transform duration-500 ease-in-out hover:scale-105"
            data-ai-hint="municipal guard"
          />
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-headline font-semibold text-primary">Quem Somos</h2>
          <p className="text-lg text-foreground leading-relaxed">
            A Guarda Civil Municipal (GCM) de Osasco é uma instituição de segurança pública, uniformizada e armada, com a função primordial de proteger o patrimônio, bens, serviços e instalações públicas municipais.
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            Nossos agentes são a linha de frente no patrulhamento preventivo da cidade, colaborando com as demais forças de segurança e atuando próximos à comunidade para construir um ambiente mais seguro para todos.
          </p>
        </div>
      </div>

      <div className="space-y-8 mt-16">
        {aboutSections.map((section, index) => (
          <Card 
            key={section.title} 
            className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:-translate-y-1 animate-fade-in-up rounded-lg"
            style={{ animationDelay: `${0.4 + index * 0.15}s` }}
            >
            <CardHeader className="flex flex-row items-center space-x-4 group">
              <div className="p-3 bg-primary/10 rounded-full transition-transform duration-300 group-hover:scale-110">
                <section.icon className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl text-primary">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground text-lg leading-relaxed">{section.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <section className="py-12 bg-card p-8 rounded-lg shadow-xl mt-16 transition-all duration-300 ease-in-out hover:shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-3xl font-headline font-semibold text-primary mb-4">Nossas Atribuições</h3>
            <p className="text-lg text-foreground mb-3">A GCM de Osasco concentra seus esforços em:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground text-lg">
              <li>Patrulhamento preventivo e comunitário.</li>
              <li>Proteção do patrimônio ecológico, histórico, cultural e arquitetônico.</li>
              <li>Apoio às ações de fiscalização do Município.</li>
              <li>Colaboração com a segurança escolar e de eventos.</li>
              <li>Atuação na segurança do trânsito em conjunto com os órgãos competentes.</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <ClipboardList className="h-40 w-40 text-primary opacity-80 transition-transform duration-300 ease-in-out hover:scale-110" />
          </div>
        </div>
      </section>
    </div>
  );
}
