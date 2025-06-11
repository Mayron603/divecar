import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { ScrollText, Landmark, CalendarDays, ShieldAlert } from 'lucide-react';

const AwardIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>;

interface HistoryEvent {
  year: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const historyEvents: HistoryEvent[] = [
  {
    year: "1995",
    title: "Fundação da Força Tática de Morumbi",
    description: "A Força Tática de Morumbi foi estabelecida, originária da cidade Grande Metrópole, onde seus membros atuavam como parte do 27º Batalhão de Polícia Militar (BPM). Trouxeram sua experiência e dedicação para combater o crime organizado e prover segurança especializada à população de Morumbi.",
    icon: Landmark,
  },
  {
    year: "2002",
    title: "Primeira Grande Operação",
    description: "Realização da primeira operação de grande escala em Morumbi, resultando na desarticulação de uma importante quadrilha local e no aumento da confiança da comunidade na recém-formada força.",
    icon: ShieldAlert,
  },
  {
    year: "2010",
    title: "Modernização e Treinamento",
    description: "Investimento em novos equipamentos, tecnologias e programas de treinamento avançado para os oficiais, elevando o padrão de atuação da força e adaptando-se aos novos desafios de segurança.",
    icon: CalendarDays,
  },
  {
    year: "2018",
    title: "Reconhecimento Estadual",
    description: "A Força Tática de Morumbi recebe reconhecimento estadual por suas contribuições significativas para a segurança pública e notável redução da criminalidade na região.",
    icon: AwardIcon,
  },
  {
    year: "Presente",
    title: "Compromisso Contínuo",
    description: "Continuamos dedicados à nossa missão original, adaptando-nos constantemente aos novos desafios e trabalhando incansavelmente para proteger e servir a comunidade de Morumbi.",
    icon: ScrollText,
  },
];


export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Nossa História"
        description="Uma jornada de dedicação, bravura e serviço à comunidade de Morumbi. Conheça os marcos que moldaram a nossa força."
        icon={ScrollText}
      />
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border rounded-full transform -translate-x-1/2 hidden md:block"></div>
        {historyEvents.map((event, index) => (
          <div key={index} className="mb-12 md:flex items-start md:gap-8 relative">
            <div className="md:w-1/2 md:flex md:justify-end md:pr-8">
              {index % 2 === 0 && (
                <Card className="shadow-xl w-full hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <event.icon className="h-8 w-8 text-accent" />
                      <div>
                        <CardTitle className="text-2xl text-primary">{event.title}</CardTitle>
                        <p className="text-sm text-muted-foreground font-semibold">{event.year}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground">{event.description}</p>
                  </CardContent>
                </Card>
              )}
               {index % 2 !== 0 && <div className="hidden md:block h-1"></div>} {/* Spacer for alignment */}
            </div>
             <div className="absolute left-1/2 top-1/2 w-4 h-4 bg-accent rounded-full border-4 border-card transform -translate-x-1/2 -translate-y-1/2 hidden md:block"></div>
            <div className="md:w-1/2 md:flex md:justify-start md:pl-8 mt-8 md:mt-0">
               {index % 2 !== 0 && (
                <Card className="shadow-xl w-full hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <event.icon className="h-8 w-8 text-accent" />
                       <div>
                        <CardTitle className="text-2xl text-primary">{event.title}</CardTitle>
                        <p className="text-sm text-muted-foreground font-semibold">{event.year}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground">{event.description}</p>
                  </CardContent>
                </Card>
              )}
               {index % 2 === 0 && <div className="hidden md:block h-1"></div>} {/* Spacer for alignment */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
