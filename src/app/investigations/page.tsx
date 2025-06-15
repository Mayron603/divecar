
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FolderSearch, PlusCircle, Trash2, Edit3, User, ShieldCheck, CalendarClock, ListChecks, Loader2, CalendarIcon, Link as LinkIcon, FileUp, Image as ImageIcon, VideoIcon, XCircle, KeyRound, MessageCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Investigation, InvestigationInput } from '@/types/investigation';
import type { Comment, CommentInput } from '@/types/comment';

import {
  addInvestigation,
  updateInvestigation,
  deleteInvestigation,
  deleteFileFromSupabaseStorageUrl,
  getInvestigations,
  addComment,
  getCommentsByInvestigationId,
} from '@/lib/supabase/investigationService';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import NextImage from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia';
const PASSWORD_FOR_CREATE = "Mayr0n@2025!";
const PASSWORD_FOR_DELETE = "Mayr0n*19@X!";


const getErrorMessage = (error: any): string => {
  if (!error) return "Ocorreu um erro desconhecido.";
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as { message?: string; details?: string; hint?: string; error_description?: string, error?: string, code?: string, status?: number, name?: string };
    if (supabaseError.message) return supabaseError.message;
    if (supabaseError.error_description) return supabaseError.error_description;
    if (supabaseError.error && typeof supabaseError.error === 'string') return supabaseError.error;
    if (supabaseError.name && supabaseError.status) return `${supabaseError.name} (Status: ${supabaseError.status})`;
    try {
      const stringifiedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      if (stringifiedError !== '{}' && stringifiedError !== 'null') return stringifiedError;
    } catch (e) {
      // Ignore stringify error
    }
    return "Não foi possível carregar esta mídia ou processar a solicitação. Verifique o console para detalhes.";
  }
  return "Não foi possível carregar esta mídia ou processar a solicitação. Verifique o console para detalhes.";
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

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogType, setPasswordDialogType] = useState<'create' | 'delete' | null>(null);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [itemPendingAction, setItemPendingAction] = useState<Investigation | null>(null);
  const [formSubmitPendingData, setFormSubmitPendingData] = useState<(() => Promise<void>) | null>(null);

  // States for Comments Dialog
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [commentsDialogInvestigation, setCommentsDialogInvestigation] = useState<Investigation | null>(null);
  const [currentComments, setCurrentComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);


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
    if (event.target.files && event.target.files.length > 0) {
      Array.from(event.target.files).forEach((file, index) => {
        console.log(`[InvestigationsPage] Selected file ${index + 1}: Name: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
      });
    }
    setSelectedFiles(event.target.files);
  };

  const executeSubmitInvestigation = async () => {
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
          const sanitizedFileNameBase = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_.\-]/g, '_');
          const fileNameWithTimestamp = `${Date.now()}_${sanitizedFileNameBase}`;
          const filePath = `${currentInvestigationId}/${fileNameWithTimestamp}`;

          console.log(`[InvestigationsPage] Client-side upload: Attempting to upload ${file.name} (sanitized path: ${filePath}) to bucket ${INVESTIGATION_MEDIA_BUCKET}`);
          
          const { data: uploadData, error: uploadError } = await supabaseBrowserClient.storage
            .from(INVESTIGATION_MEDIA_BUCKET)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            let detailedError = getErrorMessage(uploadError);
            console.error(`[InvestigationsPage] Client-side upload error for ${file.name}: "${detailedError}"`, uploadError);
            console.error(`[InvestigationsPage] Client-side upload error for ${file.name} (stringified):`, JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError)));

            toast({
              variant: "destructive",
              title: `Erro no Upload de ${file.name}`,
              description: detailedError,
            });
            setIsUploading(false);
            setIsSubmitting(false);
            return; 
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
        toast({ title: editingInvestigation ? "Investigação Atualizada" : "Investigação Adicionada", description: `R.O. ${roNumber || updateOpResponse.data.roNumber} "${investigationPayload.title}" foi salva com sucesso.` });
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

    if (!editingInvestigation) { 
      setPasswordDialogType('create');
      setFormSubmitPendingData(() => executeSubmitInvestigation); 
      setShowPasswordDialog(true);
    } else {
      await executeSubmitInvestigation(); 
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


  const executeDeleteInvestigation = async (investigation: Investigation) => {
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
      setItemPendingAction(null);
    }
  };
  
  const handleDeleteInvestigationClick = (investigation: Investigation) => {
    setItemPendingAction(investigation);
    setPasswordDialogType('delete');
    setShowPasswordDialog(true);
  };


  const handlePasswordDialogConfirm = async () => {
    if (passwordDialogType === 'create') {
      if (currentPasswordInput === PASSWORD_FOR_CREATE) {
        setShowPasswordDialog(false);
        setCurrentPasswordInput('');
        if (formSubmitPendingData) {
          await formSubmitPendingData(); 
          setFormSubmitPendingData(null);
        }
      } else {
        toast({ variant: "destructive", title: "Senha Incorreta", description: "A senha para criar a investigação está incorreta." });
      }
    } else if (passwordDialogType === 'delete' && itemPendingAction) {
      if (currentPasswordInput === PASSWORD_FOR_DELETE) {
        setShowPasswordDialog(false);
        setCurrentPasswordInput('');
        await executeDeleteInvestigation(itemPendingAction);
      } else {
        toast({ variant: "destructive", title: "Senha Incorreta", description: "A senha para excluir a investigação está incorreta." });
      }
    }
  };

  const handlePasswordDialogCancel = () => {
    setShowPasswordDialog(false);
    setCurrentPasswordInput('');
    setPasswordDialogType(null);
    setItemPendingAction(null);
    setFormSubmitPendingData(null);
  };


  const handleOpenCommentsDialog = async (investigation: Investigation) => {
    setCommentsDialogInvestigation(investigation);
    setShowCommentsDialog(true);
    setIsLoadingComments(true);
    setCurrentComments([]);
    setNewCommentAuthor('');
    setNewCommentContent('');
    try {
      const response = await getCommentsByInvestigationId(investigation.id);
      if (response.success && response.data) {
        setCurrentComments(response.data);
      } else {
        toast({ variant: "destructive", title: "Erro ao Carregar Comentários", description: response.error || "Não foi possível buscar os comentários." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Carregar Comentários", description: getErrorMessage(error) });
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!commentsDialogInvestigation || !newCommentAuthor.trim() || !newCommentContent.trim()) {
      toast({ variant: "destructive", title: "Erro de Validação", description: "Nome do autor e conteúdo do comentário são obrigatórios." });
      return;
    }
    setIsSubmittingComment(true);
    try {
      const commentInput: CommentInput = {
        investigationId: commentsDialogInvestigation.id,
        authorName: newCommentAuthor,
        content: newCommentContent,
      };
      const response = await addComment(commentInput);
      if (response.success && response.data) {
        setCurrentComments(prevComments => [...prevComments, response.data!]);
        setNewCommentAuthor('');
        setNewCommentContent('');
        toast({ title: "Comentário Adicionado", description: "Seu comentário foi salvo." });
      } else {
        toast({ variant: "destructive", title: "Erro ao Adicionar Comentário", description: response.error || "Não foi possível salvar o comentário." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Adicionar Comentário", description: getErrorMessage(error) });
    } finally {
      setIsSubmittingComment(false);
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
      return includeTime ? format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : format(date, "dd/MM/yyyy", { locale: ptBR });
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
            let path = new URL(decodedUrl).pathname;
             if (path.startsWith(`/storage/v1/object/public/${INVESTIGATION_MEDIA_BUCKET}/`)) {
                path = path.substring(`/storage/v1/object/public/${INVESTIGATION_MEDIA_BUCKET}/`.length);
            }
            const nameWithoutPrefix = path.replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/\d+_/, '');
            return nameWithoutPrefix || path.split('/').pop() || 'Link de Mídia';
        } catch {
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
        title="Gerenciamento de Investigações"
        description="Adicione, visualize, gerencie as investigações e adicione comentários."
        icon={FolderSearch}
      />

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
                <Label htmlFor="mediaFiles">Adicionar Mídias (Opcional)</Label>
                <Input
                  id="mediaFiles"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  disabled={isSubmitting || isUploading}
                  className="py-2.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
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
            <Card key={inv.id} className={`shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out flex flex-col border-l-4 ${statusColors[inv.status]?.split(' ')[2] ?? 'border-gray-300'} bg-card hover:-translate-y-1`}>
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
              <CardFooter className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 border-t pt-4 mt-auto">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenCommentsDialog(inv)}
                    disabled={isSubmitting || isUploading}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Comentários
                </Button>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(inv)} disabled={isSubmitting || isUploading}>
                        <Edit3 className="mr-1.5 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteInvestigationClick(inv)} disabled={isSubmitting || isUploading}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                    </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
       <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5 text-primary" />
              {passwordDialogType === 'create' ? 'Senha para Criar Investigação' : 'Senha para Excluir Investigação'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, insira a senha para continuar com esta ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="password-prompt" className="sr-only">Senha</Label>
            <Input
              id="password-prompt"
              type="password"
              placeholder="Digite a senha"
              value={currentPasswordInput}
              onChange={(e) => setCurrentPasswordInput(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handlePasswordDialogCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordDialogConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {commentsDialogInvestigation && (
        <Dialog open={showCommentsDialog} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setShowCommentsDialog(false);
                setCommentsDialogInvestigation(null);
            }
        }}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Comentários para R.O.: {commentsDialogInvestigation.roNumber}</DialogTitle>
              <DialogDescription>Veja e adicione comentários para esta investigação.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Carregando comentários...</p>
                  </div>
                ) : currentComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">Nenhum comentário ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {currentComments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-muted/50 rounded-md shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold text-primary">{comment.authorName}</p>
                          <p className="text-xs text-muted-foreground">{formatDateString(comment.createdAt, true)}</p>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <form onSubmit={handleAddComment} className="space-y-3 pt-4 border-t">
                <div>
                  <Label htmlFor="commentAuthorName" className="text-sm font-medium">Seu Nome</Label>
                  <Input
                    id="commentAuthorName"
                    value={newCommentAuthor}
                    onChange={(e) => setNewCommentAuthor(e.target.value)}
                    placeholder="Digite seu nome"
                    disabled={isSubmittingComment}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="commentContent" className="text-sm font-medium">Seu Comentário</Label>
                  <Textarea
                    id="commentContent"
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    placeholder="Digite seu comentário aqui..."
                    rows={3}
                    disabled={isSubmittingComment}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmittingComment || !newCommentAuthor.trim() || !newCommentContent.trim()} className="w-full">
                  {isSubmittingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" /> Adicionar Comentário
                </Button>
              </form>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setShowCommentsDialog(false)}>
                  Fechar
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

