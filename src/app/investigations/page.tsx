

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
import type { Investigation, InvestigationInput } from '@/types/investigation';
import {
  addInvestigation,
  getInvestigations,
  updateInvestigation,
  deleteInvestigation,
  uploadFileToSupabaseStorage,
  deleteFileFromSupabaseStorageUrl
} from '@/lib/supabase/investigationService';
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
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Carregar Investigações",
        description: error.message || `Não foi possível buscar os dados. Verifique suas políticas RLS e a conexão.`,
      });
      console.error("[InvestigationsPage] Error fetching investigations from Supabase. Full error object:", error);
      console.error("[InvestigationsPage] Error fetching investigations from Supabase. Message:", error.message);
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
      fileInputRef.current.value = "";
    }
    setEditingInvestigation(null);
    setExistingMediaUrls([]);
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

    let currentInvestigationId = editingInvestigation?.id;
    let finalMediaUrls: string[] = editingInvestigation?.mediaUrls ? [...editingInvestigation.mediaUrls] : [];
    
    if (!editingInvestigation) {
        console.log("[InvestigationsPage] Creating new investigation record...");
        try {
            const initialPayload: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'> & { mediaUrls?: string[] } = {
                title,
                description,
                assignedInvestigator,
                status,
                occurrenceDate: occurrenceDate ? occurrenceDate.toISOString() : undefined,
                mediaUrls: [], // Initial record has no media yet
            };
            const addResponse = await addInvestigation(initialPayload);
            if (!addResponse.success || !addResponse.data) {
                console.error("[InvestigationsPage] Failed to create initial investigation record. Server error:", addResponse.error);
                toast({
                    variant: "destructive",
                    title: "Erro ao Iniciar Investigação",
                    description: addResponse.error || `Falha ao criar registro base. Verifique o console.`,
                });
                setIsSubmitting(false);
                return;
            }
            currentInvestigationId = addResponse.data.id;
            console.log("[InvestigationsPage] Initial investigation record created successfully. ID:", currentInvestigationId, "R.O.:", addResponse.data.roNumber);
            toast({ title: "Registro Base Criado", description: `R.O. ${addResponse.data.roNumber} iniciado. Processando mídias se houver...` });
        } catch (error: any) { // Catch for unexpected errors during addInvestigation call itself
            console.error("[InvestigationsPage] Critical error calling addInvestigation server action. Full error object:", error);
            console.error("[InvestigationsPage] Error message:", error.message);
            toast({
                variant: "destructive",
                title: "Erro Crítico ao Iniciar Investigação",
                description: error.message || `Falha inesperada ao criar registro base. Verifique o console.`,
            });
            setIsSubmitting(false);
            return;
        }
    }

    if (!currentInvestigationId) {
        const criticalErrorMsg = "[InvestigationsPage] Critical error: Investigation ID is missing for file upload/update step.";
        console.error(criticalErrorMsg);
        toast({ variant: "destructive", title: "Erro Crítico", description: "ID da investigação não encontrado para prosseguir." });
        setIsSubmitting(false);
        return;
    }
    console.log("[InvestigationsPage] Current Investigation ID for media processing:", currentInvestigationId);


    if (selectedFiles && selectedFiles.length > 0) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('investigationId', currentInvestigationId);
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('mediaFiles', selectedFiles[i]);
      }
      
      console.log("[InvestigationsPage] FormData prepared for upload. Investigation ID:", formData.get('investigationId'), "Number of files:", Array.from(formData.getAll('mediaFiles')).length);
      if (Array.from(formData.getAll('mediaFiles')).length > 0) {
        const firstFile = Array.from(formData.getAll('mediaFiles'))[0] as File;
        console.log("[InvestigationsPage] First file details:", {name: firstFile.name, size: firstFile.size, type: firstFile.type});
      }


      try {
        console.log("[InvestigationsPage] Calling uploadFileToSupabaseStorage server action...");
        const uploadResponse = await uploadFileToSupabaseStorage(formData);
        console.log("[InvestigationsPage] Raw response from uploadFileToSupabaseStorage server action:", uploadResponse);

        if (uploadResponse.success && uploadResponse.urls) {
          finalMediaUrls = [...finalMediaUrls, ...uploadResponse.urls];
          toast({ title: "Mídias Enviadas", description: `${uploadResponse.urls.length} arquivo(s) de mídia foram processados.`});
        } else {
          console.error("[InvestigationsPage] Upload failed. Server response error:", uploadResponse.error);
          toast({
            variant: "destructive",
            title: "Erro no Upload de Mídia",
            description: uploadResponse.error || "Não foi possível carregar uma ou mais mídias. Verifique o console do servidor e suas políticas do Supabase Storage.",
          });
          // Do not return here if some files failed but others might succeed or if it's an update.
          // The main save will proceed with whatever finalMediaUrls contains.
        }
      } catch (error: any) { // This catch block handles if the call to the server action itself fails (e.g., network error, "unexpected response")
        console.error("[InvestigationsPage] Error calling uploadFileToSupabaseStorage server action. Full error object:", error);
        console.error("[InvestigationsPage] Error message from upload process:", error.message);
        console.error("[InvestigationsPage] Error stack from upload process:", error.stack);
        toast({
          variant: "destructive",
          title: "Erro Inesperado no Upload",
          description: error.message || "Ocorreu um erro inesperado ao tentar enviar mídias. Verifique o console.",
        });
        setIsUploading(false);
        setIsSubmitting(false);
        return; 
      } finally {
        setIsUploading(false);
      }
    }

    const investigationPayload: Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>> = {
      title,
      description,
      assignedInvestigator,
      status,
      occurrenceDate: occurrenceDate ? occurrenceDate.toISOString() : undefined,
      mediaUrls: finalMediaUrls,
    };

    console.log("[InvestigationsPage] Attempting to save/update final investigation record with ID:", currentInvestigationId, "Payload:", investigationPayload);
    try {
      const updateOpResponse = await updateInvestigation(currentInvestigationId, investigationPayload);
      if (!updateOpResponse.success) {
        console.error("[InvestigationsPage] Error saving/updating investigation (final step). Server error:", updateOpResponse.error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar Investigação",
            description: updateOpResponse.error || `Verifique o console do servidor para detalhes.`,
        });
      } else {
        toast({ title: editingInvestigation ? "Investigação Atualizada" : "Investigação Salva", description: `"${investigationPayload.title}" foi salva com sucesso.` });
        setShowForm(false);
        resetForm();
        fetchInvestigations();
      }
    } catch (error: any) { // Catch for unexpected errors during updateInvestigation call itself
      console.error("[InvestigationsPage] Critical error calling updateInvestigation server action. Full error object:", error);
      console.error("[InvestigationsPage] Error message:", error.message);
      toast({
        variant: "destructive",
        title: "Erro Crítico ao Salvar Investigação",
        description: error.message || `Verifique o console do servidor para detalhes.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (investigation: Investigation) => {
    resetForm();
    setEditingInvestigation(investigation);
    setTitle(investigation.title);
    setDescription(investigation.description || '');
    setAssignedInvestigator(investigation.assignedInvestigator);
    setStatus(investigation.status);
    setOccurrenceDate(investigation.occurrenceDate ? new Date(investigation.occurrenceDate) : undefined);
    setExistingMediaUrls(investigation.mediaUrls || []);
    setShowForm(true);
  };

  const handleDeleteMedia = async (mediaUrlToDelete: string) => {
    if (!editingInvestigation) {
        console.warn("[InvestigationsPage] Attempted to delete media for a non-editing investigation.");
        return;
    }
    setIsSubmitting(true); // Consider a specific 'isDeletingMedia' state if needed
    try {
      const deleteResponse = await deleteFileFromSupabaseStorageUrl(mediaUrlToDelete);
      if (!deleteResponse.success) {
        toast({ variant: "destructive", title: "Erro ao Remover Mídia", description: deleteResponse.error || "Falha ao remover mídia do storage."});
        setIsSubmitting(false);
        return;
      }

      const updatedMediaUrls = existingMediaUrls.filter(url => url !== mediaUrlToDelete);
      setExistingMediaUrls(updatedMediaUrls);

      const updatePayload = { mediaUrls: updatedMediaUrls };
      const recordUpdateResponse = await updateInvestigation(editingInvestigation.id, updatePayload);

      if (!recordUpdateResponse.success) {
        toast({ variant: "destructive", title: "Erro ao Atualizar Investigação", description: recordUpdateResponse.error || "Não foi possível atualizar o registro após remover a mídia." });
      } else {
        toast({ title: "Mídia Removida", description: "O arquivo e sua referência foram removidos." });
        setEditingInvestigation(prev => prev ? {...prev, mediaUrls: updatedMediaUrls} : null);
      }

    } catch (error: any) { 
        console.error("[InvestigationsPage] Error during media deletion process (calling server actions). Full error object:", error);
        toast({
          variant: "destructive",
          title: "Erro Inesperado na Remoção de Mídia",
          description: error.message || `Verifique o console.`,
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDeleteInvestigation = async (investigation: Investigation) => {
    setIsSubmitting(true);
    try {
      const deleteResponse = await deleteInvestigation(investigation.id, investigation.mediaUrls);
      if (!deleteResponse.success) {
         toast({
            variant: "destructive",
            title: "Erro ao Remover Investigação",
            description: deleteResponse.error || `Verifique o console do servidor para detalhes.`,
          });
      } else {
        toast({ title: "Investigação Removida", description: `"${investigation.title}" e suas mídias associadas foram removidas.`, variant: "default" });
        fetchInvestigations(); // Refresh list
      }
    } catch (error: any) {
      console.error("[InvestigationsPage] Critical error calling deleteInvestigation server action. Full error object:", error);
      toast({
        variant: "destructive",
        title: "Erro Crítico ao Remover Investigação",
        description: error.message || `Verifique o console do servidor para detalhes.`,
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

  const formatDateString = (dateString: string | undefined, includeTime: boolean = false) => {
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
    const isImage = /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(url);
    const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block relative w-full h-32 overflow-hidden rounded group shadow">
          <Image src={url} alt="Mídia da investigação" layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover:scale-105" />
           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-opacity duration-300">
            <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </a>
      );
    }
    if (isVideo) {
      return (
         <div className="relative group w-full h-32 rounded overflow-hidden shadow">
          <video controls muted loop className="w-full h-full object-cover" preload="metadata" playsInline>
            <source src={url} type={`video/${url.split('.').pop()?.split('?')[0]}`} />
            Seu navegador não suporta a tag de vídeo.
          </video>
           <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-opacity duration-300">
            <VideoIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        </div>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all flex items-center p-2 bg-slate-50 rounded shadow-sm">
        <LinkIcon className="h-4 w-4 mr-1.5 shrink-0" /> {new URL(url).pathname.split('/').pop()?.substring(0,30) || 'Link de Mídia'}...
      </a>
    );
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerenciamento de Investigações (Supabase)"
        description="Adicione, visualize e gerencie as investigações da DIVECAR Osasco com Supabase."
        icon={FolderSearch}
      />

      <Card className="p-4 bg-card shadow-md">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Certifique-se de que seu projeto Supabase está configurado com a tabela 'investigations' (RLS para SELECT, INSERT, UPDATE, DELETE), o bucket 'investigationmedia' (Políticas de Storage para upload/leitura/delete), e as variáveis de ambiente corretas.
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
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSubmitting}
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
                  accept="image/*,video/*"
                />
                {isUploading && (
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando arquivos... (Isso pode levar alguns instantes)
                  </div>
                )}
                {selectedFiles && selectedFiles.length > 0 && !isUploading && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>{selectedFiles.length} arquivo(s) selecionado(s):</p>
                    <ul className="list-disc list-inside max-h-20 overflow-y-auto">
                      {Array.from(selectedFiles).map((file, index) => (
                        <li key={index} className="truncate">{file.name} ({(file.size / (1024*1024)).toFixed(2)} MB)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {editingInvestigation && existingMediaUrls.length > 0 && (
                <div>
                  <Label>Mídias Existentes ({existingMediaUrls.length})</Label>
                  <div className="space-y-2 mt-1 border p-3 rounded-md bg-muted/20 max-h-60 overflow-y-auto">
                    {existingMediaUrls.map((url) => (
                      <div key={url} className="flex items-center justify-between text-sm p-2 bg-card rounded shadow-sm hover:shadow-md transition-shadow">
                        <div className="truncate max-w-[calc(100%-3rem)] flex-grow">
                           {renderMedia(url)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto ml-2 flex-shrink-0"
                          onClick={() => handleDeleteMedia(url)}
                          disabled={isSubmitting || isUploading}
                          title="Remover mídia"
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                  {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploading ? 'Enviando Mídia...' : (editingInvestigation ? 'Salvar Alterações' : 'Salvar Investigação')}
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
         <Card className="text-center py-12 shadow-lg bg-card">
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
            <Card key={inv.id} className={`shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col border-l-4 ${statusColors[inv.status]?.split(' ')[2] ?? 'border-gray-300'} bg-card`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-primary mb-1 line-clamp-2">{inv.title}</CardTitle>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center whitespace-nowrap ${statusColors[inv.status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                    {statusIcons[inv.status] ?? <ListChecks className="h-4 w-4 mr-1.5" />}
                    {inv.status}
                  </span>
                </div>
                <p className="text-sm text-primary font-semibold">R.O.: {inv.roNumber}</p>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex items-center text-sm text-foreground">
                  <User className="h-4 w-4 mr-2 text-primary shrink-0" />
                  <strong>Investigador:</strong>&nbsp;<span className="truncate">{inv.assignedInvestigator}</span>
                </div>
                 <div className="flex items-center text-sm text-foreground">
                  <CalendarIcon className="h-4 w-4 mr-2 text-primary shrink-0" />
                  <strong>Ocorrido em:</strong>&nbsp;{inv.occurrenceDate ? formatDateString(inv.occurrenceDate) : 'Não informada'}
                </div>
                 <div className="flex items-center text-sm text-foreground">
                  <CalendarClock className="h-4 w-4 mr-2 text-primary shrink-0" />
                  <strong>Criada em:</strong>&nbsp;{formatDateString(inv.creationDate, true)}
                </div>
                {inv.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t mt-2 line-clamp-3">
                    {inv.description}
                  </p>
                )}
                {inv.mediaUrls && inv.mediaUrls.length > 0 && (
                  <div className="pt-3 border-t mt-3">
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center"><FileUp className="h-4 w-4 mr-1.5"/>Mídias Anexadas ({inv.mediaUrls.length}):</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
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
                <Button variant="outline" size="sm" onClick={() => handleEdit(inv)} disabled={isSubmitting || isUploading}>
                  <Edit3 className="mr-1.5 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteInvestigation(inv)} disabled={isSubmitting || isUploading}>
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

