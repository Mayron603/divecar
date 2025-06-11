import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Award, ChevronDown, ChevronRight, UserSquare, Landmark } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Rank {
  name: string;
  description: string;
  icon: LucideIcon;
  personnel?: string[];
  subUnits?: Rank[];
}

const hierarchyData: Rank[] = [
  {
    name: "Comandante Geral",
    description: "Responsável pela liderança estratégica e operacional de toda a Força Tática.",
    icon: Award,
    personnel: ["Cel. Silva"],
  },
  {
    name: "Subcomandante",
    description: "Auxilia o Comandante Geral e supervisiona as operações diárias.",
    icon: Shield,
    personnel: ["Ten. Cel. Oliveira"],
  },
  {
    name: "Departamentos Operacionais",
    description: "Unidades especializadas responsáveis por diferentes aspectos da segurança.",
    icon: Landmark,
    subUnits: [
      {
        name: "Companhia de Operações Especiais (COE)",
        description: "Equipe de elite para missões de alto risco e complexidade.",
        icon: Users,
        personnel: ["Cap. Souza (Líder)", "Sgt. Pereira", "Cabo Alves"],
      },
      {
        name: "Patrulhamento Tático Móvel (PATAMO)",
        description: "Unidades de resposta rápida e patrulhamento ostensivo em áreas críticas.",
        icon: UserSquare,
        personnel: ["Cap. Lima (Líder)", "Sgt. Costa", "Cabo Ferreira"],
      },
      {
        name: "Departamento de Inteligência",
        description: "Coleta e análise de informações para prevenção e combate ao crime.",
        icon: Shield,
        personnel: ["Maj. Andrade (Líder)", "Sgt. Mendes"],
      },
    ],
  },
  {
    name: "Suporte Administrativo",
    description: "Setores que garantem o funcionamento e a logística da Força Tática.",
    icon: Users,
    subUnits: [
       {
        name: "Recursos Humanos",
        description: "Gestão de pessoal, treinamento e desenvolvimento.",
        icon: UserSquare,
       },
       {
        name: "Logística e Suprimentos",
        description: "Gerenciamento de equipamentos, veículos e materiais.",
        icon: UserSquare,
       }
    ]
  }
];

const RankCard = ({ rank }: { rank: Rank }) => (
  <Card className="shadow-lg mb-6">
    <CardHeader>
      <div className="flex items-center gap-3">
        <rank.icon className="h-8 w-8 text-accent" />
        <CardTitle className="text-2xl text-primary">{rank.name}</CardTitle>
      </div>
      <CardDescription className="text-md mt-1">{rank.description}</CardDescription>
    </CardHeader>
    { (rank.personnel && rank.personnel.length > 0) || (rank.subUnits && rank.subUnits.length > 0) ? (
      <CardContent>
        {rank.personnel && rank.personnel.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-muted-foreground mb-1">Pessoal Chave:</h4>
            <ul className="list-disc list-inside ml-4 text-foreground">
              {rank.personnel.map(p => <li key={p}>{p}</li>)}
            </ul>
          </div>
        )}
        {rank.subUnits && rank.subUnits.length > 0 && (
           <Accordion type="single" collapsible className="w-full">
            {rank.subUnits.map((subUnit, index) => (
              <AccordionItem value={`item-${index}`} key={subUnit.name}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <subUnit.icon className="h-5 w-5 text-secondary" />
                    {subUnit.name}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-6">
                  <p className="text-muted-foreground mb-2">{subUnit.description}</p>
                  {subUnit.personnel && subUnit.personnel.length > 0 && (
                     <div>
                        <h5 className="font-semibold text-muted-foreground text-sm mb-1">Pessoal:</h5>
                        <ul className="list-disc list-inside ml-2 text-foreground text-sm">
                        {subUnit.personnel.map(p => <li key={p}>{p}</li>)}
                        </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    ) : null}
  </Card>
);

export default function HierarchyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Nossa Hierarquia"
        description="Conheça a estrutura de comando e as divisões da Força Tática de Morumbi, projetada para máxima eficiência e coordenação."
        icon={Users}
      />
      <div className="max-w-4xl mx-auto">
        {hierarchyData.map(rank => <RankCard key={rank.name} rank={rank} />)}
      </div>
    </div>
  );
}
