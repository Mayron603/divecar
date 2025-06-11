import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Target, Eye, HeartHandshake, ShieldQuestion, Users2 } from 'lucide-react';
import Image from 'next/image';

interface AboutSection {
  title: string;
  content: string;
  icon: LucideIcon;
}

const aboutSections: AboutSection[] = [
  {
    title: "Nossa Missão",
    content: "Proteger e servir a comunidade de Morumbi com integridade, profissionalismo e coragem, garantindo a ordem pública e a segurança de todos os cidadãos através de policiamento proativo e parcerias comunitárias.",
    icon: Target,
  },
  {
    title: "Nossa Visão",
    content: "Ser uma força tática de referência, reconhecida pela excelência em suas operações, pela inovação em estratégias de segurança e pelo forte laço de confiança com a população de Morumbi.",
    icon: Eye,
  },
  {
    title: "Nossos Valores",
    content: "Honra, Integridade, Coragem, Profissionalismo, Respeito, Dedicação e Justiça. Estes são os pilares que guiam cada ação e decisão de nossos oficiais.",
    icon: HeartHandshake,
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        title="Sobre a Força Tática de Morumbi"
        description="Comprometidos com a excelência, a segurança e o bem-estar da nossa cidade. Saiba mais sobre quem somos e o que nos move."
        icon={Info}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <Image 
            src="https://placehold.co/600x400.png" 
            alt="Equipe da Força Tática" 
            width={600} 
            height={400} 
            className="rounded-lg shadow-xl"
            data-ai-hint="police officers group" 
          />
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-headline font-semibold text-primary">Quem Somos</h2>
          <p className="text-lg text-foreground leading-relaxed">
            A Força Tática de Morumbi é uma unidade especializada da polícia, dedicada a lidar com situações de alta complexidade e a prover um nível superior de segurança para a nossa comunidade. Nossos oficiais são rigorosamente selecionados e passam por treinamento contínuo para garantir que estejam preparados para qualquer desafio.
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            Nosso trabalho é pautado pela legalidade, técnica e pelo respeito aos direitos humanos. Buscamos a constante evolução de nossas táticas e tecnologias para oferecer o melhor serviço possível à população de Morumbi.
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
            <h3 className="text-3xl font-headline font-semibold text-primary mb-4">Nosso Papel na Comunidade</h3>
            <p className="text-lg text-foreground mb-3">A Força Tática de Morumbi desempenha um papel crucial na manutenção da paz e da ordem. Nossas responsabilidades incluem:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground text-lg">
              <li>Resposta a incidentes críticos e de alto risco.</li>
              <li>Patrulhamento ostensivo em áreas estratégicas.</li>
              <li>Apoio a outras unidades policiais em operações complexas.</li>
              <li>Combate ao crime organizado e tráfico de drogas.</li>
              <li>Programas de policiamento comunitário e prevenção.</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <Users2 className="h-40 w-40 text-primary opacity-80" />
          </div>
        </div>
      </section>

    </div>
  );
}
