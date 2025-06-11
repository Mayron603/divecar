import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { 
  Users, 
  Shield, 
  Award, 
  User, 
  Users2, 
  Badge, 
  Star, 
  GraduationCap, 
  ChevronUp, 
  ChevronsUp, 
  ShieldCheck, 
  Briefcase, 
  Landmark,
  TowerControl
} from 'lucide-react';

interface Rank {
  name: string;
  exampleName?: string;
  description: string;
  icon: LucideIcon;
}

const hierarchyData: Rank[] = [
  {
    name: "Soldado",
    exampleName: "Sd. PM Silva (Ex: João Silva)",
    description: "A base da força, responsável pelo patrulhamento ostensivo e pela execução direta das ordens.",
    icon: User,
  },
  {
    name: "Cabo",
    exampleName: "Cb. PM Oliveira (Ex: Maria Oliveira)",
    description: "Graduado com experiência, auxilia o Sargento e lidera pequenas frações de tropa em missões específicas.",
    icon: Shield,
  },
  {
    name: "3º Sargento",
    exampleName: "3º Sgt. PM Souza (Ex: Carlos Souza)",
    description: "Primeira graduação do círculo de Sargentos, elo fundamental entre o comando e a tropa, liderando equipes e instruindo.",
    icon: Users2,
  },
  {
    name: "2º Sargento",
    exampleName: "2º Sgt. PM Costa (Ex: Ana Costa)",
    description: "Sargento com maior experiência e responsabilidade, supervisiona equipes e missões de maior complexidade.",
    icon: Badge,
  },
  {
    name: "1º Sargento",
    exampleName: "1º Sgt. PM Pereira (Ex: Pedro Pereira)",
    description: "Graduado experiente, auxilia os oficiais no planejamento e execução de operações, e na administração.",
    icon: Star,
  },
  {
    name: "Subtenente",
    exampleName: "Subten. PM Santos (Ex: Laura Santos)",
    description: "Graduação máxima entre os praças, possui vasta experiência e atua como principal assessor dos oficiais em questões de tropa.",
    icon: Award, 
  },
  {
    name: "Aspirante a Oficial",
    exampleName: "Asp. Of. PM Lima (Ex: Bruno Lima)",
    description: "Em período de estágio probatório após a formação, preparando-se para o primeiro posto de oficial.",
    icon: GraduationCap,
  },
  {
    name: "2º Tenente",
    exampleName: "2º Ten. PM Almeida (Ex: Juliana Almeida)",
    description: "Primeiro posto do oficialato, comanda pelotões e assume responsabilidades de liderança em operações.",
    icon: ChevronUp,
  },
  {
    name: "1º Tenente",
    exampleName: "1º Ten. PM Ferreira (Ex: Rafael Ferreira)",
    description: "Oficial intermediário, comanda pelotões ou seções, e pode assumir funções de staff.",
    icon: ChevronsUp,
  },
  {
    name: "Capitão",
    exampleName: "Cap. PM Gomes (Ex: Fernanda Gomes)",
    description: "Comanda companhias ou assume chefias de seções administrativas/operacionais, elo entre oficiais subalternos e superiores.",
    icon: ShieldCheck,
  },
  {
    name: "Major",
    exampleName: "Maj. PM Rodrigues (Ex: Ricardo Rodrigues)",
    description: "Oficial superior, assume funções de estado-maior, chefia de seções ou subcomando de unidades.",
    icon: Briefcase,
  },
  {
    name: "Tenente-Coronel",
    exampleName: "Ten. Cel. PM Martins (Ex: Patrícia Martins)",
    description: "Oficial superior de alto escalão, comanda batalhões ou grandes seções, ou atua como subcomandante da força.",
    icon: Landmark,
  },
  {
    name: "Coronel",
    exampleName: "Cel. PM Barbosa (Ex: Marcelo Barbosa)",
    description: "Posto máximo da carreira, comanda grandes unidades, diretorias ou assume o Comando Geral da Força.",
    icon: TowerControl,
  },
];

const RankCard = ({ rank }: { rank: Rank }) => (
  <Card className="shadow-lg mb-6 hover:shadow-xl transition-shadow duration-300">
    <CardHeader>
      <div className="flex items-center gap-3">
        <rank.icon className="h-8 w-8 text-accent" />
        <CardTitle className="text-2xl text-primary">{rank.name}</CardTitle>
      </div>
      {rank.exampleName && <p className="text-sm text-muted-foreground mt-1">{rank.exampleName}</p>}
    </CardHeader>
    <CardContent>
      <CardDescription className="text-md mt-1 text-foreground leading-relaxed">{rank.description}</CardDescription>
    </CardContent>
  </Card>
);

export default function HierarchyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Nossa Hierarquia"
        description="Conheça a estrutura de postos e graduações da Força Tática de Morumbi, desde a base até o mais alto comando."
        icon={Users}
      />
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {hierarchyData.map(rank => <RankCard key={rank.name} rank={rank} />)}
      </div>
    </div>
  );
}
