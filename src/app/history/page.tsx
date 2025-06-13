import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { ScrollText, Landmark, CalendarDays, SearchCheck } from 'lucide-react'; // ShieldAlert trocado por SearchCheck (Investigação Concluída)

const AwardIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>; // Ícone de brasão/certificado mais genérico

interface HistoryEvent {
  year: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const historyEvents: HistoryEvent[] = [
  {
    year: "2005", // Ano fictício
    title: "Criação da Delegacia Especializada em Osasco",
    description: "Com o aumento da complexidade dos crimes de furto e roubo de veículos e cargas, é estabelecida uma delegacia especializada em Osasco para centralizar as investigações e otimizar os recursos no combate a essas modalidades criminosas.",
    icon: Landmark,
  },
  {
    year: "2012", // Ano fictício
    title: "Primeiros Resultados Expressivos",
    description: "A delegacia especializada, precursora da DIVECAR, realiza operações significativas que resultam na desarticulação de quadrilhas atuantes na região de Osasco, elevando a confiança da população no trabalho investigativo.",
    icon: SearchCheck,
  },
  {
    year: "2018", // Ano fictício
    title: "Elevação para Divisão - Nasce a DIVECAR Osasco",
    description: "Devido à sua crescente importância estratégica e aos resultados alcançados, a unidade é elevada à categoria de Divisão, tornando-se a DIVECAR Osasco, com maior autonomia e recursos para investigações de alta complexidade.",
    icon: CalendarDays,
  },
  {
    year: "2023", // Ano fictício
    title: "Reconhecimento e Modernização",
    description: "A DIVECAR Osasco recebe reconhecimento por suas contribuições no combate ao crime organizado e investe em tecnologia e capacitação de seus policiais para enfrentar os novos desafios da criminalidade moderna.",
    icon: AwardIcon,
  },
  {
    year: "Presente",
    title: "Compromisso Contínuo com a Investigação",
    description: "A DIVECAR Osasco segue dedicada à sua missão, aprimorando constantemente suas técnicas investigativas e de inteligência para proteger o patrimônio e levar justiça à comunidade de Osasco.",
    icon: ScrollText,
  },
];


export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Nossa História - DIVECAR Osasco"
        description="Uma trajetória de dedicação à investigação criminal e ao combate aos furtos e roubos de veículos e cargas em Osasco."
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
