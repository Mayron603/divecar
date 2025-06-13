
'use client';

import { useState, useEffect, type FormEvent, useRef } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FolderSearch, PlusCircle, Trash2, Edit3, User, ShieldCheck, CalendarClock, ListChecks, Loader2, CalendarIcon, Link as LinkIcon, AlertTriangle, FileUp, Image as ImageIcon, VideoIcon, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Investigation } from '@/types/investigation';
import { addInvestigation, getInvestigations, updateInvestigation, deleteInvestigation } from '@/lib/firebase/firestoreService';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebase/storageService'; // Import a função de upload
import Image from 'next/image';

export default function InvestigationsPage() {
  const { toast } = useToast();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvestigation, setEditingInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedInvestigator, setAssignedInvestigator] = useState('');
  const [status, setStatus] = useState<'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada'>('Aberta');
  const [occurrenceDate, setOccurrenceDate] = useState<Date | undefined>(undefined);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);


  const fetchInvestigations = async () => {
    setIsLoading(true);
    try {
      const fetchedInvestigations = await getInvestigations();
      setInvestigations(fetchedInvestigations);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Carregar Investigações",
        description: "Não foi possível buscar os dados do Firestore. Verifique sua configuração e regras de segurança.",
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
    setOccurrenceDate(undefined);
    setSelectedFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Limpa o input de arquivo
    }
    setEditingInvestigation(null);
    setExistingMediaUrls([]);
    setIsSubmitting(false);
    setIsUploading(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
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
    setIsUploading(true);

    let uploadedMediaUrls: string[] = [...existingMediaUrls]; // Começa com as mídias existentes

    if (selectedFiles && selectedFiles.length > 0) {
      const uploadPromises = Array.from(selectedFiles).map(file => {
        const filePath = `investigations/${editingInvestigation?.id || Date.now()}/${Date.now()}_${file.name}`;
        return uploadFileToStorage(file, filePath);
      });

      try {
        const urls = await Promise.all(uploadPromises);
        uploadedMediaUrls = [...uploadedMediaUrls, ...urls]; // Adiciona as novas URLs
      } catch (error) {
        console.error("Error uploading files:", error);
        toast({
          variant: "destructive",
          title: "Erro no Upload",
          description: "Não foi possível carregar uma ou mais mídias. A investigação foi salva sem elas.",
        });
        // Prossegue para salvar a investigação sem as novas mídias se o upload falhar
      }
    }
    setIsUploading(false);

    const investigationData: any = {
      title,
      description,
      assignedInvestigator,
      status,
      occurrenceDate: occurrenceDate ? occurrenceDate.toISOString() : undefined,
      mediaUrls: uploadedMediaUrls,
    };

    try {
      if (editingInvestigation) {
        await updateInvestigation(editingInvestigation.id, investigationData);
        toast({ title: "Investigação Atualizada", description: `"${investigationData.title}" foi atualizada.` });
      } else {
        await addInvestigation(investigationData);
        toast({ title: "Investigação Adicionada", description: `"${investigationData.title}" foi criada.` });
      }
      setShowForm(false);
      resetForm();
      fetchInvestigations();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Não foi possível salvar a investigação. Verifique o console para mais detalhes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (investigation: Investigation) => {
    setEditingInvestigation(investigation);
    setTitle(investigation.title);
    setDescription(investigation.description);
    setAssignedInvestigator(investigation.assignedInvestigator);
    setStatus(investigation.status);
    setOccurrenceDate(investigation.occurrenceDate ? new Date(investigation.occurrenceDate) : undefined);
    setExistingMediaUrls(investigation.mediaUrls || []);
    setSelectedFiles(null); // Limpa seleção de arquivos anterior
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    setShowForm(true);
  };

  // Função para extrair o caminho do arquivo do URL do Firebase Storage
  const getPathFromUrl = (url: string) => {
    try {
      const urlObject = new URL(url);
      // O caminho geralmente está após /o/ e antes do ?alt=media
      const pathWithQuery = urlObject.pathname.split('/o/')[1];
      if (pathWithQuery) {
        return decodeURIComponent(pathWithQuery.split('?')[0]);
      }
    } catch (e) {
      console.error("Error parsing URL for path:", url, e);
    }
    return null; // Retorna null se não conseguir parsear
  };


  const handleDeleteMedia = async (mediaUrlToDelete: string, investigationId: string) => {
    if (!editingInvestigation || editingInvestigation.id !== investigationId) return;

    setIsSubmitting(true); // Reutiliza o estado de submissão para indicar processamento
    const filePath = getPathFromUrl(mediaUrlToDelete);

    if (filePath) {
      try {
        await deleteFileFromStorage(filePath);
      } catch (error) {
        console.error("Error deleting file from storage:", error);
        toast({
          variant: "destructive",
          title: "Erro ao Remover Mídia do Storage",
          description: "Não foi possível remover o arquivo do armazenamento. A referência será removida da investigação.",
        });
      }
    } else {
       toast({
          variant: "warning",
          title: "Não foi possível identificar o arquivo no Storage",
          description: "A referência será removida da investigação, mas o arquivo pode permanecer no armazenamento.",
        });
    }

    const updatedMediaUrls = existingMediaUrls.filter(url => url !== mediaUrlToDelete);
    setExistingMediaUrls(updatedMediaUrls); // Atualiza o estado local para UI

    // Atualiza a investigação no Firestore sem a mídia removida
    try {
        const investigationDataToUpdate = {
            ...editingInvestigation,
            mediaUrls: updatedMediaUrls,
        };
        // Remove campos que não devem ser enviados diretamente para update
        const { id, creationDate, roNumber, ...updatePayload } = investigationDataToUpdate;

        await updateInvestigation(investigationId, updatePayload as Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>>);
        toast({ title: "Mídia Removida", description: "A referência da mídia foi removida da investigação." });
        fetchInvestigations(); // Refetch para consistência, embora a UI já esteja atualizada
    } catch (error) {
        console.error("Error updating investigation after media deletion:", error);
        toast({
          variant: "destructive",
          title: "Erro ao Atualizar Investigação",
          description: "Não foi possível atualizar a investigação após remover a mídia.",
        });
        // Reverter a mudança na UI se o Firestore falhar? Ou deixar o usuário tentar salvar manualmente?
        // Por ora, a UI fica com a mídia removida, e o próximo "Salvar Alterações" tentaria persistir.
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDeleteInvestigation = async (investigation: Investigation) => {
    setIsSubmitting(true);
    // Deletar mídias associadas do Firebase Storage
    if (investigation.mediaUrls && investigation.mediaUrls.length > 0) {
      const deletePromises = investigation.mediaUrls.map(url => {
        const filePath = getPathFromUrl(url);
        if (filePath) {
          return deleteFileFromStorage(filePath).catch(err => {
            console.error(`Failed to delete ${filePath} from storage:`, err);
            // Continua mesmo se uma exclusão de arquivo falhar, para não bloquear a exclusão da investigação
          });
        }
        return Promise.resolve();
      });
      try {
        await Promise.all(deletePromises);
        toast({ title: "Mídias Removidas do Storage", description: "Arquivos associados foram removidos.", variant: "default" });
      } catch (error) {
         toast({ title: "Erro ao Remover Mídias do Storage", description: "Alguns arquivos podem não ter sido removidos.", variant: "warning" });
      }
    }

    try {
      await deleteInvestigation(investigation.id);
      toast({ title: "Investigação Removida", description: `"${investigation.title}" foi removida.`, variant: "default" });
      fetchInvestigations(); 
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao Remover Investigação",
        description: "Não foi possível remover a investigação do Firestore.",
      });
    } finally {
      setIsSubmitting(false);
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

  const formatDate = (dateString: string | undefined, includeTime: boolean = false) => {
    if (!dateString) return 'Data desconhecida';
    try {
      const date = new Date(dateString);
      return includeTime ? format(date, "dd/MM/yyyy HH:mm", { locale: ptBR }) : format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date from string:", dateString, error);
      return 'Data inválida';
    }
  };

  const renderMedia = (url: string) => {
    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(url.split('?')[0]); // Ignora query params como o token do Firebase
    const isVideo = /\.(mp4|webm|ogg)$/i.test(url.split('?')[0]);

    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block relative w-full h-32 overflow-hidden rounded group">
          <Image src={url} alt="Mídia da investigação" layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover:scale-105" />
           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity duration-300">
            <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </a>
      );
    }
    if (isVideo) {
      return (
         <div className="relative group">
          <video controls muted loop className="w-full h-32 object-cover rounded" preload="metadata">
            <source src={url} type={`video/${url.split('.').pop()?.split('?')[0]}`} />
            Seu navegador não suporta a tag de vídeo.
          </video>
           <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity duration-300">
            <VideoIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        </div>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all flex items-center">
        <LinkIcon className="h-4 w-4 mr-1.5 shrink-0" /> {url.substring(0, 30)}...
      </a>
    );
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerenciamento de Investigações"
        description="Adicione, visualize e gerencie as investigações da DIVECAR Osasco."
        icon={FolderSearch}
      />
      
      <Card className="p-4 bg-card shadow-md">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> O número de R.O. é gerado automaticamente. Configure as regras de segurança do Firebase Storage para permitir uploads.
          </p>
        </div>
      </Card>

      {!showForm && (
        <div className="flex justify-center mb-8">
          <Button 
            onClick={() => { 
              resetForm(); 
              setShowForm(true); 
            }} 
            size="lg" 
            disabled={isLoading || isSubmitting}
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Nova Investigação
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle>{editingInvestigation ? `Editando Investigação (R.O.: ${editingInvestigation.roNumber})` : 'Nova Investigação'}</CardTitle>
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
              
              {editingInvestigation && (
                <div>
                  <Label>Número do R.O.</Label>
                  <Input value={editingInvestigation.roNumber} disabled />
                </div>
              )}

              <div>
                <Label htmlFor="occurrenceDate">Data do Ocorrido</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${!occurrenceDate && "text-muted-foreground"}`}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {occurrenceDate ? format(occurrenceDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={occurrenceDate}
                      onSelect={setOccurrenceDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
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

              <div>
                <Label htmlFor="mediaFiles">Adicionar Mídias (Imagens/Vídeos)</Label>
                <Input 
                  id="mediaFiles" 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  ref={fileInputRef}
                  disabled={isSubmitting || isUploading} 
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {isUploading && (
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando arquivos...
                  </div>
                )}
                {selectedFiles && selectedFiles.length > 0 && !isUploading && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>{selectedFiles.length} arquivo(s) selecionado(s):</p>
                    <ul className="list-disc list-inside max-h-20 overflow-y-auto">
                      {Array.from(selectedFiles).map((file, index) => (
                        <li key={index} className="truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {editingInvestigation && existingMediaUrls.length > 0 && (
                <div>
                  <Label>Mídias Existentes</Label>
                  <div className="space-y-2 mt-1 border p-2 rounded-md">
                    {existingMediaUrls.map((url) => (
                      <div key={url} className="flex items-center justify-between text-sm p-1 bg-muted/50 rounded">
                        <span className="truncate max-w-[80%]">
                           {url.substring(url.lastIndexOf('%2F') + 3, url.indexOf('?')).split('_').slice(1).join('_') || 'Nome de arquivo desconhecido'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
                          onClick={() => handleDeleteMedia(url, editingInvestigation.id)}
                          disabled={isSubmitting}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();      
                    setShowForm(false); 
                  }} 
                  disabled={isSubmitting || isUploading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {(isSubmitting || isUploading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
            <Card key={inv.id} className={`shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col border-l-4 ${statusColors[inv.status]?.split(' ')[2] ?? 'border-gray-300'}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-primary mb-1">{inv.title}</CardTitle>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center ${statusColors[inv.status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                    {statusIcons[inv.status] ?? <ListChecks className="h-4 w-4 mr-1.5" />}
                    {inv.status}
                  </span>
                </div>
                <p className="text-sm text-primary font-semibold">R.O.: {inv.roNumber}</p>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex items-center text-sm text-foreground">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  <strong>Investigador:</strong>&nbsp;{inv.assignedInvestigator}
                </div>
                 <div className="flex items-center text-sm text-foreground">
                  <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                  <strong>Data do Ocorrido:</strong>&nbsp;{inv.occurrenceDate ? formatDate(inv.occurrenceDate) : 'Não informada'}
                </div>
                 <div className="flex items-center text-sm text-foreground">
                  <CalendarClock className="h-4 w-4 mr-2 text-primary" />
                  <strong>Criada em:</strong>&nbsp;{formatDate(inv.creationDate, true)}
                </div>
                {inv.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t mt-2">
                    {inv.description.length > 100 ? `${inv.description.substring(0, 100)}...` : inv.description}
                  </p>
                )}
                {inv.mediaUrls && inv.mediaUrls.length > 0 && (
                  <div className="pt-2 border-t mt-3">
                    <h4 className="text-sm font-semibold text-primary mb-1.5 flex items-center"><FileUp className="h-4 w-4 mr-1.5"/>Mídias Anexadas:</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                      {inv.mediaUrls.map((url, index) => (
                        <div key={index} className="text-xs">
                          {renderMedia(url)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 border-t pt-4 mt-auto">
                <Button variant="outline" size="sm" onClick={() => handleEdit(inv)} disabled={isSubmitting}>
                  <Edit3 className="mr-1.5 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteInvestigation(inv)} disabled={isSubmitting}>
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
