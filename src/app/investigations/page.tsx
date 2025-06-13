
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderSearch, PlusCircle, Trash2, Edit3, User, ShieldCheck, CalendarClock, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Investigation } from '@/types/investigation';
import { addInvestigation, getInvestigations, updateInvestigation, deleteInvestigation } from '@/lib/firebase/firestoreService';
import { Timestamp } from 'firebase/firestore';

export default function InvestigationsPage() {
  const { toast } = useToast();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvestigation, setEditingInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedInvestigator, setAssignedInvestigator] = useState('');
  const [status, setStatus] = useState<'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada'>('Aberta');
  const [roNumber, setRoNumber] = useState('');

  const fetchInvestigations = async () => {
    setIsLoading(true);
    try {
      const fetchedInvestigations = await getInvestigations();
      setInvestigations(fetchedInvestigations);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Carregar Investigações",
        description: "Não foi possível buscar os dados do Firestore. Verifique sua configuração do Firebase.",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignedInvestigator('');
    setStatus('Aberta');
    setRoNumber('');
    setEditingInvestigation(null);
    setShowForm(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !assignedInvestigator) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Título e Investigador Responsável são obrigatórios.",
      });
      return;
    }

    setIsSubmitting(true);

    const investigationData = {
      title,
      description,
      assignedInvestigator,
      status,
      roNumber: roNumber || undefined,
    };

    try {
      if (editingInvestigation) {
        await updateInvestigation(editingInvestigation.id, investigationData);
        toast({ title: "Investigação Atualizada", description: `"${investigationData.title}" foi atualizada.` });
      } else {
        await addInvestigation(investigationData);
        toast({ title: "Investigação Adicionada", description: `"${investigationData.title}" foi criada.` });
      }
      resetForm();
      fetchInvestigations(); // Re-fetch para atualizar a lista
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Não foi possível salvar a investigação.",
      });
      setIsSubmitting(false);
    }
  };

  const handleEdit = (investigation: Investigation) => {
    setEditingInvestigation(investigation);
    setTitle(investigation.title);
    setDescription(investigation.description);
    setAssignedInvestigator(investigation.assignedInvestigator);
    setStatus(investigation.status);
    setRoNumber(investigation.roNumber || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string, investigationTitle: string) => {
    try {
      await deleteInvestigation(id);
      toast({ title: "Investigação Removida", description: `"${investigationTitle}" foi removida.`, variant: "destructive" });
      fetchInvestigations(); // Re-fetch para atualizar a lista
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao Remover",
        description: "Não foi possível remover a investigação.",
      });
    }
  };

  const statusColors: Record<Investigation['status'], string> = {
    'Aberta': 'bg-blue-100 text-blue-700 border-blue-300',
    'Em Andamento': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'Concluída': 'bg-green-100 text-green-700 border-green-300',
    'Arquivada': 'bg-gray-100 text-gray-700 border-gray-300',
  };
  
  const statusIcons: Record<Investigation['status'], React.ReactNode> = {
    'Aberta': <PlusCircle className="h-4 w-4 mr-1.5" />,
    'Em Andamento': <CalendarClock className="h-4 w-4 mr-1.5" />,
    'Concluída': <ShieldCheck className="h-4 w-4 mr-1.5" />,
    'Arquivada': <ListChecks className="h-4 w-4 mr-1.5" />,
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Data desconhecida';
    return timestamp.toDate().toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerenciamento de Investigações"
        description="Adicione, visualize e gerencie as investigações da DIVECAR Osasco."
        icon={FolderSearch}
      />

      {!showForm && (
        <div className="flex justify-center mb-8">
          <Button onClick={() => { setShowForm(true); resetForm(); }} size="lg" disabled={isLoading}>
            <PlusCircle className="mr-2 h-5 w-5" /> Nova Investigação
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle>{editingInvestigation ? 'Editar Investigação' : 'Nova Investigação'}</CardTitle>
            <CardDescription>
              {editingInvestigation ? 'Modifique os detalhes da investigação existente.' : 'Preencha os dados para registrar uma nova investigação.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Título da Investigação</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Investigação Furto Veículo Bairro Centro" required disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="roNumber">Número do R.O. (Opcional)</Label>
                <Input id="roNumber" value={roNumber} onChange={(e) => setRoNumber(e.target.value)} placeholder="Ex: 1234/2024" disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="description">Descrição Detalhada</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes sobre o caso, ocorrência inicial, etc." rows={4} disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="assignedInvestigator">Investigador Responsável</Label>
                <Input id="assignedInvestigator" value={assignedInvestigator} onChange={(e) => setAssignedInvestigator(e.target.value)} placeholder="Nome do investigador" required disabled={isSubmitting} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: Investigation['status']) => setStatus(value)} disabled={isSubmitting}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberta">Aberta</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Arquivada">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingInvestigation ? 'Salvar Alterações' : 'Adicionar Investigação'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Carregando investigações...</p>
        </div>
      )}

      {!isLoading && investigations.length === 0 && !showForm && (
         <Card className="text-center py-12 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center">
            <FolderSearch className="h-20 w-20 text-muted-foreground mb-6" />
            <p className="text-xl font-semibold text-muted-foreground">Nenhuma investigação registrada ainda.</p>
            <p className="text-muted-foreground mt-1">Clique em "Nova Investigação" para começar.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && investigations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {investigations.map((inv) => (
            <Card key={inv.id} className={`shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col border-l-4 ${statusColors[inv.status].split(' ')[2]}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-primary mb-1">{inv.title}</CardTitle>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center ${statusColors[inv.status]}`}>
                    {statusIcons[inv.status]}
                    {inv.status}
                  </span>
                </div>
                {inv.roNumber && <p className="text-xs text-muted-foreground">R.O.: {inv.roNumber}</p>}
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex items-center text-sm text-foreground">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  <strong>Investigador:</strong>&nbsp;{inv.assignedInvestigator}
                </div>
                 <div className="flex items-center text-sm text-foreground">
                  <CalendarClock className="h-4 w-4 mr-2 text-primary" />
                  <strong>Criada em:</strong>&nbsp;{formatDate(inv.creationDate)}
                </div>
                {inv.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t mt-2">
                    {inv.description.length > 100 ? `${inv.description.substring(0, 100)}...` : inv.description}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 border-t pt-4 mt-auto">
                <Button variant="outline" size="sm" onClick={() => handleEdit(inv)} disabled={isSubmitting}>
                  <Edit3 className="mr-1.5 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(inv.id, inv.title)} disabled={isSubmitting}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
