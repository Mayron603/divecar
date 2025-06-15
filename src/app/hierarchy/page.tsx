
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { 
  Users, 
  Briefcase,
  FileText,
  Search,
  User,
  ClipboardCheck,
  FlaskConical
} from 'lucide-react';

interface Rank {
  name: string;
  description: string;
  icon: LucideIcon;
}

const hierarchyData: Rank[] = [
  {
    name: "Delegado de Polícia",
    description: "Preside inquéritos policiais, coordena equipes de investigação, analisa provas, representa pela decretação de medidas cautelares e lidera a unidade ou equipes especializadas.",
    icon: Briefcase,
  },
  {
    name: "Médico Legista",
    description: "Realiza exames de corpo de delito em vivos e mortos, analisa lesões corporais, determina a causa mortis e elabora laudos técnicos essenciais para a investigação criminal.",
    icon: ClipboardCheck, 
  },
  {
    name: "Perito Criminal",
    description: "Coleta e analisa vestígios em locais de crime, examina evidências em laboratório (balística, DNA, informática forense, etc.) e elabora laudos periciais fundamentais para a elucidação de crimes.",
    icon: FlaskConical,
  },
  {
    name: "Investigador de Polícia",
    description: "Realiza diligências investigativas, coleta de provas, oitivas, campanas, infiltrações e outras atividades de campo e inteligência para a elucidação de crimes e identificação de autores.",
    icon: Search,
  },
  {
    name: "Escrivão de Polícia",
    description: "Responsável pela formalização dos atos de polícia judiciária, como depoimentos, autos de prisão, e pela guarda, organização e tramitação de inquéritos e outros procedimentos policiais.",
    icon: FileText,
  },
  {
    name: "Agente Policial",
    description: "Auxilia nas atividades investigativas e operacionais, executa mandados, conduz viaturas, realiza escoltas, garante a segurança de instalações policiais e presta apoio logístico às equipes.",
    icon: User,
  },
];

const RankCard = ({ rank }: { rank: Rank }) => (
  <Card className="shadow-lg mb-6 hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col h-full hover:-translate-y-1">
    <CardHeader>
      <div className="flex items-center gap-3">
        <rank.icon className="h-8 w-8 text-accent" />
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
        title="Hierarquia da Polícia Civil"
        description="Conheça os cargos e funções que compõem a estrutura da Polícia Civil, incluindo os atuantes na DIVECAR Osasco."
        icon={Users}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hierarchyData.map(rank => <RankCard key={rank.name} rank={rank} />)}
      </div>
    </div>
  );
}
