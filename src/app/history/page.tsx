
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { ScrollText, Landmark, CalendarDays, Shield, Users, Award } from 'lucide-react';

interface HistoryEvent {
  year: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const historyEvents: HistoryEvent[] = [
  {
    year: "1993", 
    title: "Criação da Guarda Municipal de Osasco",
    description: "Através da Lei Municipal nº 2.659, é oficialmente criada a Guarda Municipal de Osasco, com a missão inicial de zelar pelos bens, equipamentos e prédios públicos do município.",
    icon: Landmark,
  },
  {
    year: "2002", 
    title: "Ampliação das Atribuições",
    description: "A GCM passa a ter um papel mais ativo na segurança pública, com a implementação do patrulhamento preventivo e comunitário, aproximando a corporação dos cidadãos.",
    icon: Users,
  },
  {
    year: "2014", 
    title: "Estatuto Geral das Guardas Municipais",
    description: "Com a sanção da Lei Federal 13.022, a GCM de Osasco, assim como as demais do país, tem suas competências ampliadas e consolidadas, incluindo o poder de polícia administrativa.",
    icon: ScrollText,
  },
  {
    year: "2020", 
    title: "Modernização e Tecnologia",
    description: "A GCM de Osasco investe em novas tecnologias, como centrais de monitoramento por câmeras, novas viaturas e equipamentos, para aprimorar a eficiência e a resposta às ocorrências.",
    icon: Shield,
  },
  {
    year: "Presente",
    title: "Compromisso Contínuo com a Cidade",
    description: "A GCM segue em constante evolução, capacitando seus agentes e fortalecendo sua presença para fazer de Osasco uma cidade cada vez mais segura para se viver.",
    icon: Award,
  },
];


export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Nossa História - GCM Osasco"
        description="Uma trajetória de compromisso e serviço na proteção da cidade de Osasco e de seus cidadãos."
        icon={ScrollText}
      />
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border rounded-full transform -translate-x-1/2 hidden md:block animate-fade-in-up" style={{ animationDelay: '0.2s' }}></div>
        {historyEvents.map((event, index) => (
          <div key={index} className="mb-12 md:flex items-start md:gap-8 relative animate-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.15}s` }}>
            <div className="md:w-1/2 md:flex md:justify-end md:pr-8">
              {index % 2 === 0 && (
                <Card className="shadow-xl w-full hover:shadow-2xl transition-all duration-300 ease-in-out hover:-translate-y-1 rounded-lg">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <event.icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
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
             <div className="absolute left-1/2 top-1/2 w-4 h-4 bg-primary rounded-full border-4 border-card transform -translate-x-1/2 -translate-y-1/2 hidden md:block transition-transform duration-300 group-hover:scale-110"></div>
            <div className="md:w-1/2 md:flex md:justify-start md:pl-8 mt-8 md:mt-0">
               {index % 2 !== 0 && (
                <Card className="shadow-xl w-full hover:shadow-2xl transition-all duration-300 ease-in-out hover:-translate-y-1 rounded-lg">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-primary/10 rounded-full">
                        <event.icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
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
