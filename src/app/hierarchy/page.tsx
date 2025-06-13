import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { 
  Users, 
  Briefcase, // Delegado
  FileText,  // Escrivão
  Search,    // Investigador
  User,      // Agente Policial
  Fingerprint, // Papiloscopista
  Award,     // Delegado Chefe/Titular
  Star,      // Destaque para Chefias
  ShieldCheck // Símbolo genérico de autoridade/polícia
} from 'lucide-react';

interface Rank {
  name: string;
  exampleName?: string;
  description: string;
  icon: LucideIcon;
}

const hierarchyData: Rank[] = [
  {
    name: "Delegado de Polícia Titular",
    exampleName: "Dr. Carlos Alberto Nobre",
    description: "Responsável pela direção e coordenação geral da DIVECAR, define estratégias investigativas e gerencia a unidade.",
    icon: Award, 
  },
  {
    name: "Delegado de Polícia",
    exampleName: "Dra. Ana Paula Matos",
    description: "Preside inquéritos policiais, coordena equipes de investigação, analisa provas e representa pela decretação de medidas cautelares.",
    icon: Briefcase,
  },
  {
    name: "Escrivão de Polícia Chefe",
    exampleName: "Sr. João Ricardo Silva",
    description: "Coordena os serviços cartorários da delegacia, supervisiona a formalização dos atos de polícia judiciária e o fluxo de documentos.",
    icon: Star, // Destaque para chefia de cartório
  },
  {
    name: "Escrivão de Polícia",
    exampleName: "Sra. Maria Eduarda Costa",
    description: "Responsável pela formalização dos atos de polícia judiciária, como depoimentos, autos de prisão, e pela guarda e organização de inquéritos.",
    icon: FileText,
  },
  {
    name: "Investigador de Polícia Chefe",
    exampleName: "Sr. Marcos Vinicius Lima",
    description: "Lidera equipes de investigadores em campo, planeja operações, distribui tarefas e orienta as diligências investigativas.",
    icon: ShieldCheck, // Destaque para chefia de investigação
  },
  {
    name: "Investigador de Polícia",
    exampleName: "Sr. Paulo Sérgio Oliveira",
    description: "Realiza diligências investigativas, coleta de provas, oitivas, campanas e outras atividades para elucidação de crimes.",
    icon: Search,
  },
  {
    name: "Agente Policial",
    exampleName: "Sra. Laura Mendes",
    description: "Auxilia nas atividades investigativas e operacionais, executa mandados, conduz viaturas e presta apoio logístico às equipes.",
    icon: User,
  },
  {
    name: "Papiloscopista Policial",
    exampleName: "Sr. Ricardo Alves",
    description: "Coleta e analisa impressões digitais e outros vestígios papiloscópicos para identificação humana em locais de crime e documentos.",
    icon: Fingerprint,
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
        title="Hierarquia da DIVECAR Osasco"
        description="Conheça os cargos e funções que compõem a estrutura da Divisão de Investigações sobre Furtos e Roubos de Veículos e Cargas."
        icon={Users}
      />
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {hierarchyData.map(rank => <RankCard key={rank.name} rank={rank} />)}
      </div>
    </div>
  );
}
