
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
  updateInvestigation,
  deleteInvestigation,
  deleteFileFromSupabaseStorageUrl,
} from '@/lib/supabase/investigationService';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import NextImage from 'next/image';

const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia';

// Helper function to extract a meaningful error message
const getErrorMessage = (error: any): string => {
  if (!error) return "Ocorreu um erro desconhecido.";
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    return error.message || error.error_description || error.error || JSON.stringify(error);
  }
  return "Não foi possível carregar esta mídia. Verifique o console para detalhes.";
};


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
  
  const supabaseBrowserClient: SupabaseClient = createSupabaseBrowserClient();


  const fetchInvestigations = async () => {
    setIsLoading(true);
    try {
      const fetchedInvestigations = await getInvestigations();
      setInvestigations(fetchedInvestigations);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Carregar Investigações",
        description: getErrorMessage(error) || `Não foi possível buscar os dados. Verifique suas políticas RLS e a conexão.`,
      });
      console.error("[InvestigationsPage] Error fetching investigations. Full error object:", error);
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
    console.log("[InvestigationsPage] handleFileChange triggered. Files selected:", event.target.files);
    if (event.target.files && event.target.files.length > 0) {
      Array.from(event.target.files).forEach((file, index) => {
        console.log(`[InvestigationsPage] Selected file ${index + 1}: Name: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
      });
    }
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
    let finalMediaUrls: string[] = editingInvestigation ? [...(editingInvestigation.mediaUrls || [])] : [];
    let roNumber = editingInvestigation?.roNumber;

    try {
      if (!editingInvestigation) {
        console.log("[InvestigationsPage] Creating new initial investigation record...");
        const initialPayload = {
            title,
            description,
            assignedInvestigator,
            status,
            occurrenceDate: occurrenceDate ? occurrenceDate.toISOString() : undefined,
        };
        const addResponse = await addInvestigation(initialPayload);
        console.log("[InvestigationsPage] Response from addInvestigation server action:", addResponse);

        if (!addResponse.success || !addResponse.data?.id) {
            toast({
                variant: "destructive",
                title: "Erro ao Iniciar Investigação",
                description: addResponse.error || "Falha ao criar registro base da investigação.",
            });
            setIsSubmitting(false);
            return;
        }
        currentInvestigationId = addResponse.data.id;
        roNumber = addResponse.data.roNumber;
        console.log(`[InvestigationsPage] Initial investigation record created successfully. ID: ${currentInvestigationId}, R.O.: ${roNumber}`);
        toast({ title: "Registro Base Criado", description: `R.O. ${roNumber} iniciado. Processando mídias se houver...` });
      } else {
        currentInvestigationId = editingInvestigation.id;
         console.log(`[InvestigationsPage] Editing existing investigation. ID: ${currentInvestigationId}, Existing media URLs:`, existingMediaUrls);
         finalMediaUrls = [...existingMediaUrls]; 
      }

      if (!currentInvestigationId) {
        toast({ variant: "destructive", title: "Erro Crítico", description: "ID da investigação não encontrado para prosseguir com mídias." });
        setIsSubmitting(false);
        return;
      }
      
      if (selectedFiles && selectedFiles.length > 0) {
        setIsUploading(true);
        toast({ title: "Upload de Mídia", description: `Enviando ${selectedFiles.length} arquivo(s)...` });
        const uploadedFileUrlsThisSession: string[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const sanitizedFileName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
          const fileNameWithTimestamp = `${Date.now()}_${sanitizedFileName}`;
          const filePath = `${currentInvestigationId}/${fileNameWithTimestamp}`;

          console.log(`[InvestigationsPage] Client-side upload: Attempting to upload ${file.name} (sanitized: ${fileNameWithTimestamp}) to path: ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}`);
          
          const { data: uploadData, error: uploadError } = await supabaseBrowserClient.storage
            .from(INVESTIGATION_MEDIA_BUCKET)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false, // Consider true if re-uploading the same file path should overwrite
            });

          if (uploadError) {
            console.error(`[InvestigationsPage] Client-side upload error for ${file.name}. Raw error object:`, uploadError);
            let detailedError = 'Unknown upload error.';
            if (uploadError instanceof Error) {
                detailedError = uploadError.message;
            } else if (typeof uploadError === 'object' && uploadError !== null) {
                const supabaseError = uploadError as any;
                detailedError = supabaseError.message || supabaseError.error_description || supabaseError.error || JSON.stringify(uploadError);
                console.error(`[InvestigationsPage] Client-side upload error for ${file.name} (Stringified Object):`, JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError)));
            } else if (typeof uploadError === 'string') {
                detailedError = uploadError;
            }
            console.error(`[InvestigationsPage] Client-side upload error for ${file.name} (Full Object passed to console):`, uploadError);


            toast({
              variant: "destructive",
              title: `Erro no Upload de ${file.name}`,
              description: detailedError,
            });
            setIsUploading(false);
            setIsSubmitting(false);
            // Do not return immediately; allow other files to be attempted or proceed to save metadata without this file.
            // Consider how to handle partial success if some files upload and others don't.
            // For now, if one fails, we stop this particular upload attempt for this file and continue the loop.
            // If the whole process should stop, uncomment the return below.
            // return; 
            continue; // Skip to the next file if one fails
          }

          if (uploadData?.path) {
            const { data: publicUrlData } = supabaseBrowserClient.storage
              .from(INVESTIGATION_MEDIA_BUCKET)
              .getPublicUrl(uploadData.path);
            
            if (publicUrlData?.publicUrl) {
              console.log(`[InvestigationsPage] Client-side upload success for ${file.name}. URL: ${publicUrlData.publicUrl}`);
              uploadedFileUrlsThisSession.push(publicUrlData.publicUrl);
            } else {
              console.error(`[InvestigationsPage] Client-side upload: Failed to get public URL for ${uploadData.path}`);
              toast({ variant: "destructive", title: `Erro ao obter URL para ${file.name}`, description: "Upload pareceu bem-sucedido, mas a URL não foi obtida." });
            }
          }
        }
        finalMediaUrls.push(...uploadedFileUrlsThisSession);
        console.log("[InvestigationsPage] finalMediaUrls after processing selectedFiles:", finalMediaUrls);
        setIsUploading(false);
         if (uploadedFileUrlsThisSession.length > 0) {
            toast({ title: "Mídias Enviadas", description: `${uploadedFileUrlsThisSession.length} novo(s) arquivo(s) de mídia processados.`});
        }
      }

      console.log(`[InvestigationsPage] Final media URLs to be saved for ID ${currentInvestigationId}:`, finalMediaUrls);

      const investigationPayload: Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>> = {
        title,
        description,
        assignedInvestigator,
        status,
        occurrenceDate: occurrenceDate ? occurrenceDate.toISOString() : undefined,
        mediaUrls: finalMediaUrls,
      };

      console.log(`[InvestigationsPage] Attempting to save/update final investigation record with ID: ${currentInvestigationId}, Payload:`, JSON.stringify(investigationPayload));
      const updateOpResponse = await updateInvestigation(currentInvestigationId, investigationPayload);
      console.log("[InvestigationsPage] Response from final updateInvestigation server action:", updateOpResponse);

      if (!updateOpResponse.success || !updateOpResponse.data) {
        console.error("[InvestigationsPage] Error saving/updating investigation (final step). Server error:", updateOpResponse.error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar Investigação",
            description: updateOpResponse.error || `Verifique o console do servidor para detalhes.`,
        });
      } else {
        toast({ title: editingInvestigation ? "Investigação Atualizada" : "Investigação Salva", description: `R.O. ${roNumber || updateOpResponse.data.roNumber} "${investigationPayload.title}" foi salva com sucesso.` });
        setShowForm(false);
        resetForm();
        fetchInvestigations();
      }

    } catch (error: any) {
      console.error("[InvestigationsPage] Unhandled error in handleSubmit logic:", error);
      toast({
        variant: "destructive",
        title: "Erro Inesperado no Formulário",
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
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
    console.log("[InvestigationsPage] Editing. Existing media URLs loaded into form state:", investigation.mediaUrls);
    setShowForm(true);
  };

  const handleDeleteMedia = async (mediaUrlToDelete: string) => {
    if (!editingInvestigation) {
        console.warn("[InvestigationsPage] Attempted to delete media for a non-editing investigation.");
        return;
    }
    setIsSubmitting(true); 
    try {
      console.log(`[InvestigationsPage] Calling deleteFileFromSupabaseStorageUrl for URL: ${mediaUrlToDelete}`);
      const deleteResponse = await deleteFileFromSupabaseStorageUrl(mediaUrlToDelete);
      console.log("[InvestigationsPage] Response from deleteFileFromSupabaseStorageUrl server action:", deleteResponse);

      if (!deleteResponse.success) {
        toast({ variant: "destructive", title: "Erro ao Remover Mídia", description: deleteResponse.error || "Falha ao remover mídia do storage."});
        setIsSubmitting(false);
        return;
      }

      const updatedMediaUrls = existingMediaUrls.filter(url => url !== mediaUrlToDelete);
      setExistingMediaUrls(updatedMediaUrls); 

      const updatePayload = { mediaUrls: updatedMediaUrls };
      console.log(`[InvestigationsPage] Updating investigation record ${editingInvestigation.id} after media deletion. New mediaUrls:`, updatedMediaUrls);
      const recordUpdateResponse = await updateInvestigation(editingInvestigation.id, updatePayload);
      console.log("[InvestigationsPage] Response from updateInvestigation (after media deletion) server action:", recordUpdateResponse);

      if (!recordUpdateResponse.success) {
        toast({ variant: "destructive", title: "Erro ao Atualizar Investigação", description: recordUpdateResponse.error || "Não foi possível atualizar o registro após remover a mídia." });
      } else {
        toast({ title: "Mídia Removida", description: "O arquivo e sua referência foram removidos." });
        setInvestigations(prevInvestigations => 
            prevInvestigations.map(inv => 
                inv.id === editingInvestigation.id ? { ...inv, mediaUrls: updatedMediaUrls } : inv
            )
        );
        // Also update the editingInvestigation state to reflect the removed media URL
        setEditingInvestigation(prev => prev ? {...prev, mediaUrls: updatedMediaUrls} : null);
      }

    } catch (error: any) { 
        console.error("[InvestigationsPage] Error during media deletion process. Full error object:", error);
        toast({
          variant: "destructive",
          title: "Erro Inesperado na Remoção de Mídia",
          description: getErrorMessage(error) || `Verifique o console.`,
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDeleteInvestigation = async (investigation: Investigation) => {
    setIsSubmitting(true);
    try {
      console.log(`[InvestigationsPage] Calling deleteInvestigation for ID: ${investigation.id}`);
      const deleteResponse = await deleteInvestigation(investigation.id, investigation.mediaUrls);
      console.log("[InvestigationsPage] Response from deleteInvestigation server action:", deleteResponse);
      if (!deleteResponse.success) {
         toast({
            variant: "destructive",
            title: "Erro ao Remover Investigação",
            description: deleteResponse.error || `Verifique o console do servidor para detalhes.`,
          });
      } else {
        toast({ title: "Investigação Removida", description: `"${investigation.title}" e suas mídias associadas foram removidas.`, variant: "default" });
        fetchInvestigations(); 
      }
    } catch (error: any) {
      console.error("[InvestigationsPage] Critical error calling deleteInvestigation server action. Full error object:", error);
      toast({
        variant: "destructive",
        title: "Erro Crítico ao Remover Investigação",
        description: getErrorMessage(error) || `Verifique o console do servidor para detalhes.`,
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
          <NextImage src={url} alt="Mídia da investigação" layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover:scale-105" />
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
    const fileName = (() => {
        try {
            const decodedUrl = decodeURIComponent(url);
            // Extrai o nome do arquivo da URL, lidando com possíveis query strings
            let path = new URL(decodedUrl).pathname;
            // Remove a parte do bucket se presente no início do path
             if (path.startsWith(`/storage/v1/object/public/${INVESTIGATION_MEDIA_BUCKET}/`)) {
                path = path.substring(`/storage/v1/object/public/${INVESTIGATION_MEDIA_BUCKET}/`.length);
            }
            // Remove o ID da investigação e a timestamp se o padrão for conhecido
            // Ex: eeee1f76-f1c8-4089-8cad-f3bd76675949/1749846686810_image_optimized_1.png
            // Tentativa de remover o UUID/ e a timestamp_
            const nameWithoutPrefix = path.replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/\d+_/, '');
            return nameWithoutPrefix || path.split('/').pop() || 'Link de Mídia';
        } catch {
            // Fallback se a URL for malformada ou não seguir o padrão esperado
            const segments = url.split('/');
            const lastSegment = segments.pop() || 'Link de Mídia';
            const queryParamIndex = lastSegment.indexOf('?');
            return queryParamIndex !== -1 ? lastSegment.substring(0, queryParamIndex) : lastSegment;
        }
    })();

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all flex items-center p-2 bg-slate-50 rounded shadow-sm">
        <LinkIcon className="h-4 w-4 mr-1.5 shrink-0" /> {fileName.substring(0,30)}{fileName.length > 30 ? '...' : ''}
      </a>
    );
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Gerenciamento de Investigações (Supabase)"
        description="Adicione, visualize e gerencie as investigações da DIVECAR Osasco com Supabase. Uploads de mídia são feitos diretamente pelo cliente."
        icon={FolderSearch}
      />

      <Card className="p-4 bg-card shadow-md">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Uploads de mídia agora são feitos diretamente do seu navegador para o Supabase Storage. Certifique-se de que suas políticas do bucket 'investigationmedia' permitem INSERT e SELECT públicos (ou para 'authenticated' se aplicável e o bucket for público).
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
            disabled={isLoading || isSubmitting || isUploading}
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
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Investigação Furto Veículo Bairro Centro" required disabled={isSubmitting || isUploading} />
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
                      disabled={isSubmitting || isUploading}
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
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSubmitting || isUploading}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="description">Descrição Detalhada</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes sobre o caso, ocorrência inicial, etc." rows={4} disabled={isSubmitting || isUploading} />
              </div>
              <div>
                <Label htmlFor="assignedInvestigator">Investigador Responsável</Label>
                <Input id="assignedInvestigator" value={assignedInvestigator} onChange={(e) => setAssignedInvestigator(e.target.value)} placeholder="Nome do investigador" required disabled={isSubmitting || isUploading} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: Investigation['status']) => setStatus(value)} disabled={isSubmitting || isUploading}>
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

    