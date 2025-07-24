
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { 
  Users, 
  Shield,
  Star,
  Award,
  UserCheck,
  ChevronUp,
  ChevronDown,
  UserPlus
} from 'lucide-react';

interface Rank {
  name: string;
  description: string;
  icon: LucideIcon;
}

const hierarchyData: Rank[] = [
  {
    name: "Inspetor Superintendente",
    description: "Comando geral da GCM, responsável pela gestão estratégica e representação da instituição.",
    icon: Star,
  },
  {
    name: "Inspetor de Agrupamento",
    description: "Coordena um agrupamento de divisões, supervisionando operações de grande escala.",
    icon: Shield,
  },
  {
    name: "Inspetor de Divisão",
    description: "Responsável por uma divisão específica, como a ambiental ou de trânsito.",
    icon: Award,
  },
  {
    name: "Inspetor",
    description: "Lidera equipes maiores em campo, garantindo a execução das diretrizes operacionais.",
    icon: UserCheck,
  },
  {
    name: "Subinspetor",
    description: "Supervisiona equipes e setores específicos, atuando como elo com o comando.",
    icon: Users,
  },
  {
    name: "Classe Distinta",
    description: "GCM com vasta experiência, atua em funções especializadas e de mentoria.",
    icon: ChevronUp,
  },
  {
    name: "Classe Especial",
    description: "GCM experiente, com responsabilidades de liderança em pequenas equipes.",
    icon: ChevronDown,
  },
  {
    name: "Agente de 1ª Classe",
    description: "Agente com progressão na carreira, atua com maior autonomia.",
    icon: UserPlus,
  },
  {
    name: "Agente de 2ª Classe",
    description: "Agente com experiência consolidada nas funções de patrulhamento.",
    icon: Users,
  },
  {
    name: "Agente de 3ª Classe",
    description: "Posto de ingresso na corporação, executa o patrulhamento preventivo e comunitário.",
    icon: Users,
  },
];

const RankCard = ({ rank, animationDelay }: { rank: Rank, animationDelay: string }) => (
  <Card 
    className="shadow-lg mb-6 hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col h-full hover:-translate-y-1 animate-fade-in-up rounded-lg"
    style={{ animationDelay }}
  >
    <CardHeader>
      <div className="flex items-center gap-3">
        <rank.icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" />
        <CardTitle className="text-2xl text-primary">{rank.name}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="flex-grow">
      <CardDescription className="text-md mt-1 text-foreground leading-relaxed">{rank.description}</CardDescription>
    </CardContent>
  </Card>
);

export default function HierarchyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Hierarquia da GCM de Osasco"
        description="Conheça os postos e graduações que compõem a estrutura da nossa Guarda Civil Municipal."
        icon={Users}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hierarchyData.map((rank, index) => (
          <RankCard key={rank.name} rank={rank} animationDelay={`${0.2 + index * 0.1}s`} />
        ))}
      </div>
    </div>
  );
}
