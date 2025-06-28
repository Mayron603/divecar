
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { 
  Users, 
  Shield,
  Star,
  Award,
  UserCheck
} from 'lucide-react';

interface Rank {
  name: string;
  description: string;
  icon: LucideIcon;
}

const hierarchyData: Rank[] = [
  {
    name: "Comandante da Guarda",
    description: "Responsável pelo comando geral, planejamento estratégico e gestão administrativa de toda a Guarda Civil Municipal.",
    icon: Star,
  },
  {
    name: "Subcomandante da Guarda",
    description: "Auxilia diretamente o Comandante, substituindo-o em suas ausências e coordenando as operações e o pessoal.",
    icon: Shield,
  },
  {
    name: "Inspetor",
    description: "Coordena grandes áreas operacionais ou divisões administrativas, supervisionando as equipes e garantindo a execução das diretrizes do comando.",
    icon: Award,
  },
  {
    name: "Subinspetor",
    description: "Lidera equipes em campo, supervisiona o patrulhamento em setores específicos e atua como elo entre os guardas e o comando superior.",
    icon: UserCheck,
  },
  {
    name: "Guarda Civil Municipal",
    description: "Executa o patrulhamento preventivo, atende ocorrências, orienta o público e zela pela segurança dos cidadãos e do patrimônio municipal.",
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
