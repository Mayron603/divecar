
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, User, FileText, School, Star, CheckSquare, Briefcase, Link as LinkIcon, ExternalLink, MessageCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function ConcursoPage() {
  const etapasConcurso = [
    { text: "Prova Objetiva" },
    { text: "Teste de Aptidão Física (TAF)" },
    { text: "Avaliação Psicológica" },
    { text: "Investigação Social" },
    { text: "Curso de Formação" },
  ];

  const requisitosBasicos = [
    { text: "Ser brasileiro nato ou naturalizado" },
    { text: "Ter idade mínima de 18 anos" },
    { text: "Estar em dia com as obrigações eleitorais e militares" },
    { text: "Possuir CNH categoria mínima “AB”" },
    { text: "Ter aptidão física e mental para o exercício da função" },
  ];

  const carreiraOferece = [
    { text: "Estabilidade" },
    { text: "Plano de progressão funcional" },
    { text: "Capacitação contínua" },
    { text: "Valorização profissional" },
  ];

  return (
    <div className="space-y-12">
      <PageHeader
        title="Concurso Público - GCM Osasco"
        description="A Prefeitura de Osasco anuncia concurso público para ingresso na Guarda Civil Municipal – 3ª Classe."
        icon={Megaphone}
      />

      <Card className="shadow-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Informações Gerais do Cargo</CardTitle>
          <CardDescription>Detalhes sobre a vaga e os requisitos de escolaridade.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
            <Briefcase className="h-10 w-10 text-primary mb-2" />
            <h3 className="font-semibold text-lg">Cargo</h3>
            <p className="text-muted-foreground">Guarda Civil Municipal – 3ª Classe</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
            <FileText className="h-10 w-10 text-primary mb-2" />
            <h3 className="font-semibold text-lg">Regime Jurídico</h3>
            <p className="text-muted-foreground">Estatutário</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
            <School className="h-10 w-10 text-primary mb-2" />
            <h3 className="font-semibold text-lg">Escolaridade Exigida</h3>
            <p className="text-muted-foreground">Ensino Médio Completo</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="text-primary"/>Etapas do Concurso</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {etapasConcurso.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0"/>
                  <span className="text-foreground">{item.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="text-primary"/>Requisitos Básicos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {requisitosBasicos.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0"/>
                  <span className="text-foreground">{item.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card className="text-center bg-primary/5 border-primary/20 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Inscreva-se e Participe!</CardTitle>
          <CardDescription>Não perca a chance de servir com honra e coragem pela cidade de Osasco.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row justify-center items-center gap-4">
          <Button asChild size="lg" className="w-full md:w-auto">
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSe0CSW1EPkB-k3zoztqe_pbKQ2LHQCi8StwDucikG2f_b5Beg/viewform?usp=header" target="_blank" rel="noopener noreferrer">
              <LinkIcon className="mr-2"/> Formulário de Inscrição Oficial
              <ExternalLink className="ml-2 h-4 w-4"/>
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full md:w-auto">
            <a href="https://discord.gg/HTQMxZKV77" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2"/> Entre em nosso Discord
              <ExternalLink className="ml-2 h-4 w-4"/>
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
