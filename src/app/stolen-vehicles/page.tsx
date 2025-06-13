
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { CarFront, Construction } from 'lucide-react';

export default function StolenVehiclesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Veículos Furtados/Roubados"
        description="Consulte informações sobre veículos com queixa de furto ou roubo."
        icon={CarFront}
      />
      <Card className="text-center py-12 shadow-lg bg-card">
        <CardContent className="flex flex-col items-center justify-center">
          <Construction className="h-20 w-20 text-accent mb-6" />
          <h2 className="text-2xl font-semibold text-primary mb-2">Em Desenvolvimento</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Esta seção para cadastro e consulta de veículos furtados/roubados está sendo preparada e estará disponível em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
