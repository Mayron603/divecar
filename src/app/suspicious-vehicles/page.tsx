
'use client';

import { useState, useEffect, type FormEvent, useRef } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, AlertTriangle, PlusCircle, Trash2, Edit3, User, Phone, Image as ImageIcon, VideoIcon, FileText, Loader2, CalendarIcon, KeyRound, Link as LinkIcon, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SuspiciousVehicle, SuspiciousVehicleInput } from '@/types/suspiciousVehicle';

import {
  addSuspiciousVehicle,
  updateSuspiciousVehicle,
  deleteSuspiciousVehicle,
  getSuspiciousVehicles,
  deleteFileFromSupabaseStorageUrl,
} from '@/lib/supabase/suspiciousVehicleService';
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


const SUSPICIOUS_VEHICLE_PHOTOS_BUCKET = 'suspiciousvehiclephotos';
const PASSWORD_FOR_CREATE_SUSPICIOUS = "Mayr0n@2025!";
const PASSWORD_FOR_DELETE_SUSPICIOUS = "Mayr0n*19@X!";


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


export default function SuspiciousVehiclesPage() {
  const { toast } = useToast();
  const [suspiciousVehicles, setSuspiciousVehicles] = useState<SuspiciousVehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<SuspiciousVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [suspectName, setSuspectName] = useState('');
  const [suspectPhone, setSuspectPhone] = useState('');
  const [spottedDate, setSpottedDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<FileList | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | undefined>(undefined);
  
  const supabaseBrowserClient: SupabaseClient = createSupabaseBrowserClient();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogType, setPasswordDialogType] = useState<'create' | 'delete' | null>(null);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [itemPendingAction, setItemPendingAction] = useState<SuspiciousVehicle | null>(null);
  const [formSubmitPendingData, setFormSubmitPendingData] = useState<(() => Promise<void>) | null>(null);

  const fetchSuspiciousVehicles = async () => {
    setIsLoading(true);
    try {
      const fetchedVehicles = await getSuspiciousVehicles();
      setSuspiciousVehicles(fetchedVehicles);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Carregar Veículos Suspeitos",
        description: getErrorMessage(error) || `Não foi possível buscar os dados. Verifique suas políticas RLS e a conexão.`,
      });
      console.error("[SuspiciousVehiclesPage] Error fetching vehicles. Full error object:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspiciousVehicles();
  }, []);

  const resetForm = () => {
    setVehicleModel('');
    setLicensePlate('');
    setSuspectName('');
    setSuspectPhone('');
    setSpottedDate(undefined);
    setNotes('');
    setSelectedPhoto(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
    setEditingVehicle(null);
    setExistingPhotoUrl(undefined);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPhoto(event.target.files);
  };

  const executeSubmitVehicle = async () => {
    setIsSubmitting(true);
    let currentVehicleId = editingVehicle?.id;
    let finalPhotoUrl: string | undefined = editingVehicle ? editingVehicle.photoUrl : undefined;

    try {
      if (!editingVehicle) {
        console.log("[SuspiciousVehiclesPage] Creating new initial vehicle record...");
        const initialPayload: SuspiciousVehicleInput = {
            vehicleModel,
            licensePlate,
            suspectName: suspectName || undefined,
            suspectPhone: suspectPhone || undefined,
            spottedDate: spottedDate ? spottedDate.toISOString() : undefined,
            notes: notes || undefined,
        };
        const addResponse = await addSuspiciousVehicle(initialPayload);
        console.log("[SuspiciousVehiclesPage] Response from addSuspiciousVehicle server action:", addResponse);

        if (!addResponse.success || !addResponse.data?.id) {
            toast({
                variant: "destructive",
                title: "Erro ao Adicionar Veículo",
                description: addResponse.error || "Falha ao criar registro base do veículo.",
            });
            setIsSubmitting(false);
            return;
        }
        currentVehicleId = addResponse.data.id;
        console.log(`[SuspiciousVehiclesPage] Initial vehicle record created successfully. ID: ${currentVehicleId}`);
        toast({ title: "Registro Base Criado", description: `Veículo "${vehicleModel}" iniciado. Processando foto se houver...` });
      } else {
        currentVehicleId = editingVehicle.id;
        finalPhotoUrl = existingPhotoUrl; 
        console.log(`[SuspiciousVehiclesPage] Editing existing vehicle. ID: ${currentVehicleId}, Existing photo URL:`, finalPhotoUrl);
      }

      if (!currentVehicleId) {
        toast({ variant: "destructive", title: "Erro Crítico", description: "ID do veículo não encontrado para prosseguir com a foto." });
        setIsSubmitting(false);
        return;
      }
      
      if (selectedPhoto && selectedPhoto.length > 0) {
        setIsUploading(true);
        const file = selectedPhoto[0];
        toast({ title: "Upload de Foto", description: `Enviando ${file.name}...` });

        const sanitizedFileNameBase = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_.\-]/g, '_');
        const fileNameWithTimestamp = `${Date.now()}_${sanitizedFileNameBase}`;
        const filePath = `${currentVehicleId}/${fileNameWithTimestamp}`;

        console.log(`[SuspiciousVehiclesPage] Client-side upload: Attempting to upload ${file.name} (sanitized path: ${filePath}) to bucket ${SUSPICIOUS_VEHICLE_PHOTOS_BUCKET}`);
        
        const { data: uploadData, error: uploadError } = await supabaseBrowserClient.storage
          .from(SUSPICIOUS_VEHICLE_PHOTOS_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false, 
          });

        if (uploadError) {
          let detailedError = getErrorMessage(uploadError);
          console.error(`[SuspiciousVehiclesPage] Client-side upload error for ${file.name}: "${detailedError}"`, uploadError);
          toast({ variant: "destructive", title: `Erro no Upload de ${file.name}`, description: detailedError });
          setIsUploading(false);
          setIsSubmitting(false);
          return; 
        }

        if (uploadData?.path) {
          const { data: publicUrlData } = supabaseBrowserClient.storage
            .from(SUSPICIOUS_VEHICLE_PHOTOS_BUCKET)
            .getPublicUrl(uploadData.path);
          
          if (publicUrlData?.publicUrl) {
            console.log(`[SuspiciousVehiclesPage] Client-side upload success for ${file.name}. URL: ${publicUrlData.publicUrl}`);
            finalPhotoUrl = publicUrlData.publicUrl;
            if (editingVehicle && editingVehicle.photoUrl && editingVehicle.photoUrl !== finalPhotoUrl) {
                console.log(`[SuspiciousVehiclesPage] New photo uploaded for editing vehicle. Deleting old photo: ${editingVehicle.photoUrl}`);
                await deleteFileFromSupabaseStorageUrl(editingVehicle.photoUrl);
            }
          } else {
            console.error(`[SuspiciousVehiclesPage] Client-side upload: Failed to get public URL for ${uploadData.path}`);
            toast({ variant: "destructive", title: `Erro ao obter URL para ${file.name}`, description: "Upload bem-sucedido, mas URL não obtida." });
          }
        }
        setIsUploading(false);
        if (finalPhotoUrl && selectedPhoto) { 
            toast({ title: "Foto Enviada", description: "Foto processada com sucesso."});
        }
      }

      console.log(`[SuspiciousVehiclesPage] Final photo URL to be saved for ID ${currentVehicleId}:`, finalPhotoUrl);

      const vehiclePayload: Partial<Omit<SuspiciousVehicle, 'id' | 'createdAt'>> = {
        vehicleModel,
        licensePlate,
        suspectName: suspectName || undefined,
        suspectPhone: suspectPhone || undefined,
        spottedDate: spottedDate ? spottedDate.toISOString() : undefined,
        notes: notes || undefined,
        photoUrl: finalPhotoUrl,
      };

      console.log(`[SuspiciousVehiclesPage] Attempting to save/update final vehicle record with ID: ${currentVehicleId}, Payload:`, JSON.stringify(vehiclePayload));
      const updateOpResponse = await updateSuspiciousVehicle(currentVehicleId, vehiclePayload);
      console.log("[SuspiciousVehiclesPage] Response from final updateSuspiciousVehicle server action:", updateOpResponse);

      if (!updateOpResponse.success || !updateOpResponse.data) {
        console.error("[SuspiciousVehiclesPage] Error saving/updating vehicle (final step). Server error:", updateOpResponse.error);
        toast({ variant: "destructive", title: "Erro ao Salvar Veículo", description: updateOpResponse.error || `Verifique o console do servidor.` });
      } else {
        toast({ title: editingVehicle ? "Veículo Atualizado" : "Veículo Adicionado", description: `Veículo "${vehiclePayload.vehicleModel} - ${vehiclePayload.licensePlate}" foi salvo.` });
        setShowForm(false);
        resetForm();
        fetchSuspiciousVehicles();
      }

    } catch (error: any) {
      console.error("[SuspiciousVehiclesPage] Unhandled error in handleSubmit logic:", error);
      toast({ variant: "destructive", title: "Erro Inesperado no Formulário", description: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vehicleModel || !licensePlate) {
      toast({ variant: "destructive", title: "Erro de Validação", description: "Modelo e Placa do Veículo são obrigatórios." });
      return;
    }

    if (editingVehicle) {
      // If editing, execute submit directly without password
      await executeSubmitVehicle();
    } else {
      // If creating a new vehicle, prompt for password
      setPasswordDialogType('create');
      setFormSubmitPendingData(() => executeSubmitVehicle); 
      setShowPasswordDialog(true);
    }
  };

  const handleEdit = (vehicle: SuspiciousVehicle) => {
    resetForm();
    setEditingVehicle(vehicle);
    setVehicleModel(vehicle.vehicleModel);
    setLicensePlate(vehicle.licensePlate);
    setSuspectName(vehicle.suspectName || '');
    setSuspectPhone(vehicle.suspectPhone || '');
    setSpottedDate(vehicle.spottedDate ? new Date(vehicle.spottedDate) : undefined);
    setNotes(vehicle.notes || '');
    setExistingPhotoUrl(vehicle.photoUrl);
    setShowForm(true);
  };

  const handleDeletePhoto = async () => {
    if (!editingVehicle || !existingPhotoUrl) {
        console.warn("[SuspiciousVehiclesPage] Attempted to delete photo for a non-editing vehicle or no photo exists.");
        return;
    }
    setIsSubmitting(true); 
    try {
      console.log(`[SuspiciousVehiclesPage] Calling deleteFileFromSupabaseStorageUrl for URL: ${existingPhotoUrl}`);
      const deleteResponse = await deleteFileFromSupabaseStorageUrl(existingPhotoUrl);
      console.log("[SuspiciousVehiclesPage] Response from deleteFileFromSupabaseStorageUrl server action:", deleteResponse);

      if (!deleteResponse.success) {
        toast({ variant: "destructive", title: "Erro ao Remover Foto", description: deleteResponse.error || "Falha ao remover foto do storage."});
        setIsSubmitting(false);
        return;
      }

      setExistingPhotoUrl(undefined); 

      const updatePayload = { photoUrl: null }; 
      console.log(`[SuspiciousVehiclesPage] Updating vehicle record ${editingVehicle.id} after photo deletion. New photoUrl: null`);
      const recordUpdateResponse = await updateSuspiciousVehicle(editingVehicle.id, updatePayload);
      console.log("[SuspiciousVehiclesPage] Response from updateSuspiciousVehicle (after photo deletion) server action:", recordUpdateResponse);

      if (!recordUpdateResponse.success) {
        toast({ variant: "destructive", title: "Erro ao Atualizar Veículo", description: recordUpdateResponse.error || "Não foi possível atualizar o registro após remover a foto." });
      } else {
        toast({ title: "Foto Removida", description: "A foto e sua referência foram removidas." });
        setSuspiciousVehicles(prevVehicles => 
            prevVehicles.map(v => 
                v.id === editingVehicle.id ? { ...v, photoUrl: undefined } : v
            )
        );
        setEditingVehicle(prev => prev ? {...prev, photoUrl: undefined} : null);
      }
    } catch (error: any) { 
        console.error("[SuspiciousVehiclesPage] Error during photo deletion process. Full error object:", error);
        toast({ variant: "destructive", title: "Erro Inesperado na Remoção de Foto", description: getErrorMessage(error) });
    } finally {
        setIsSubmitting(false);
    }
  };


  const executeDeleteVehicle = async (vehicle: SuspiciousVehicle) => {
    setIsSubmitting(true);
    try {
      console.log(`[SuspiciousVehiclesPage] Calling deleteSuspiciousVehicle for ID: ${vehicle.id}`);
      const deleteResponse = await deleteSuspiciousVehicle(vehicle.id, vehicle.photoUrl);
      console.log("[SuspiciousVehiclesPage] Response from deleteSuspiciousVehicle server action:", deleteResponse);
      if (!deleteResponse.success) {
         toast({ variant: "destructive", title: "Erro ao Remover Veículo", description: deleteResponse.error });
      } else {
        toast({ title: "Veículo Suspeito Removido", description: `"${vehicle.vehicleModel} - ${vehicle.licensePlate}" e sua foto foram removidos.`, variant: "default" });
        fetchSuspiciousVehicles(); 
      }
    } catch (error: any) {
      console.error("[SuspiciousVehiclesPage] Critical error calling deleteSuspiciousVehicle server action:", error);
      toast({ variant: "destructive", title: "Erro Crítico ao Remover Veículo", description: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
      setItemPendingAction(null);
    }
  };
  
  const handleDeleteVehicleClick = (vehicle: SuspiciousVehicle) => {
    setItemPendingAction(vehicle);
    setPasswordDialogType('delete');
    setShowPasswordDialog(true);
  };


  const handlePasswordDialogConfirm = async () => {
    if (passwordDialogType === 'create') {
      if (currentPasswordInput === PASSWORD_FOR_CREATE_SUSPICIOUS) {
        setShowPasswordDialog(false);
        setCurrentPasswordInput('');
        if (formSubmitPendingData) {
          await formSubmitPendingData(); 
          setFormSubmitPendingData(null);
        }
      } else {
        toast({ variant: "destructive", title: "Senha Incorreta", description: "A senha para registrar o veículo está incorreta." });
      }
    } else if (passwordDialogType === 'delete' && itemPendingAction) {
      if (currentPasswordInput === PASSWORD_FOR_DELETE_SUSPICIOUS) {
        setShowPasswordDialog(false);
        setCurrentPasswordInput('');
        await executeDeleteVehicle(itemPendingAction);
      } else {
        toast({ variant: "destructive", title: "Senha Incorreta", description: "A senha para excluir o veículo está incorreta." });
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

  const handleDateSelection = (selectedDay: Date | undefined) => {
    if (!selectedDay) {
      setSpottedDate(undefined);
      return;
    }
    const currentTime = spottedDate ? { h: spottedDate.getHours(), m: spottedDate.getMinutes() } : { h: 0, m: 0 };
    const newDateTime = new Date(
      selectedDay.getFullYear(),
      selectedDay.getMonth(),
      selectedDay.getDate(),
      currentTime.h,
      currentTime.m
    );
    setSpottedDate(newDateTime);
  };

  const handleTimeSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value; 
    if (!spottedDate || !timeValue) {
      if (spottedDate && !timeValue) {
          const resetTimeDate = new Date(spottedDate);
          resetTimeDate.setHours(0,0,0,0);
          setSpottedDate(resetTimeDate);
      }
      return;
    }
    const [hours, minutes] = timeValue.split(':').map(Number);
    const newDateTime = new Date(spottedDate); 
    newDateTime.setHours(hours, minutes, 0, 0); 
    setSpottedDate(newDateTime);
  };


  const renderMedia = (url: string | undefined) => {
    if (!url) return <div className="flex items-center justify-center h-32 bg-muted rounded text-muted-foreground"><ImageIcon className="h-8 w-8" /> Sem foto</div>;
    
    const isImage = /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(url);

    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block relative w-full h-40 overflow-hidden rounded group shadow">
          <NextImage src={url} alt="Foto do veículo suspeito" layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover:scale-105" data-ai-hint="vehicle car" />
           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-opacity duration-300">
            <ImageIcon className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all flex items-center p-2 bg-slate-50 rounded shadow-sm">
        <LinkIcon className="h-4 w-4 mr-1.5 shrink-0" /> Ver Arquivo
      </a>
    );
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Veículos Suspeitos"
        description="Registre e consulte informações sobre veículos suspeitos."
        icon={Car}
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
            <PlusCircle className="mr-2 h-5 w-5" /> Registrar Veículo Suspeito
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle>{editingVehicle ? `Editando Veículo Suspeito` : 'Novo Veículo Suspeito'}</CardTitle>
            <CardDescription>
              {editingVehicle ? 'Modifique os detalhes do veículo existente.' : 'Preencha os dados para registrar um novo veículo suspeito.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="vehicleModel">Modelo do Veículo</Label>
                <Input id="vehicleModel" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Ex: Honda Civic Preto" required disabled={isSubmitting || isUploading} />
              </div>
              <div>
                <Label htmlFor="licensePlate">Placa</Label>
                <Input id="licensePlate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} placeholder="Ex: BRA2E19" required disabled={isSubmitting || isUploading} />
              </div>
              <div>
                <Label htmlFor="spottedDateTime">Data e Hora em que foi Visto</Label>
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={`flex-1 justify-start text-left font-normal ${!spottedDate && "text-muted-foreground"}`}
                        disabled={isSubmitting || isUploading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {spottedDate ? format(spottedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolha a data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={spottedDate}
                        onSelect={handleDateSelection}
                        initialFocus
                        locale={ptBR}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSubmitting || isUploading}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={spottedDate ? format(spottedDate, "HH:mm") : ""}
                    onChange={handleTimeSelection}
                    className="w-[120px]"
                    disabled={isSubmitting || isUploading || !spottedDate}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="suspectName">Nome do Suspeito</Label>
                <Input id="suspectName" value={suspectName} onChange={(e) => setSuspectName(e.target.value)} placeholder="Nome ou apelido" disabled={isSubmitting || isUploading} />
              </div>
              <div>
                <Label htmlFor="suspectPhone">Contato do Suspeito</Label>
                <Input id="suspectPhone" type="tel" value={suspectPhone} onChange={(e) => setSuspectPhone(e.target.value)} placeholder="Telefone ou outro contato" disabled={isSubmitting || isUploading} />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais, comportamento, local frequente, etc." rows={3} disabled={isSubmitting || isUploading} />
              </div>

              <div>
                <Label htmlFor="vehiclePhoto">Foto do Veículo (Opcional)</Label>
                <Input
                  id="vehiclePhoto"
                  type="file"
                  onChange={handleFileChange}
                  ref={photoInputRef}
                  disabled={isSubmitting || isUploading}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  accept="image/*"
                />
                {isUploading && (
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando foto...
                  </div>
                )}
                {selectedPhoto && selectedPhoto.length > 0 && !isUploading && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>Foto selecionada: {selectedPhoto[0].name} ({(selectedPhoto[0].size / (1024*1024)).toFixed(2)} MB)</p>
                  </div>
                )}
              </div>

              {editingVehicle && existingPhotoUrl && (
                <div>
                  <Label>Foto Existente</Label>
                  <div className="mt-1 border p-3 rounded-md bg-muted/20 relative">
                     {renderMedia(existingPhotoUrl)}
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto z-10"
                        onClick={handleDeletePhoto}
                        disabled={isSubmitting || isUploading}
                        title="Remover foto existente"
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
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
                  {isUploading ? 'Enviando Foto...' : (editingVehicle ? 'Salvar Alterações' : 'Salvar Veículo')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Carregando veículos...</p>
        </div>
      )}

      {!isLoading && suspiciousVehicles.length === 0 && !showForm && (
         <Card className="text-center py-12 shadow-lg bg-card">
          <CardContent className="flex flex-col items-center justify-center">
            <Car className="h-20 w-20 text-muted-foreground mb-6 opacity-50" />
            <p className="text-xl font-semibold text-muted-foreground">Nenhum veículo suspeito registrado.</p>
            <p className="text-muted-foreground mt-1">Clique em "Registrar Veículo Suspeito" para começar.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && suspiciousVehicles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {suspiciousVehicles.map((v) => (
            <Card key={v.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-primary mb-1 line-clamp-2">{v.vehicleModel}</CardTitle>
                <p className="text-lg text-secondary font-semibold">{v.licensePlate}</p>
                <p className="text-xs text-muted-foreground pt-1">Registrado em: {formatDateString(v.createdAt, true)}</p>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                {renderMedia(v.photoUrl)}
                {v.spottedDate && (
                  <div className="flex items-center text-sm text-foreground pt-2">
                    <CalendarIcon className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <strong>Visto em:</strong>&nbsp;{formatDateString(v.spottedDate, true)}
                  </div>
                )}
                {v.suspectName && (
                  <div className="flex items-center text-sm text-foreground">
                    <User className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <strong>Suspeito:</strong>&nbsp;<span className="truncate">{v.suspectName}</span>
                  </div>
                )}
                {v.suspectPhone && (
                  <div className="flex items-center text-sm text-foreground">
                    <Phone className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <strong>Contato:</strong>&nbsp;<span className="truncate">{v.suspectPhone}</span>
                  </div>
                )}
                {v.notes && (
                  <div className="pt-2 border-t mt-2">
                    <Label className="text-xs text-muted-foreground font-semibold">Observações:</Label>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                      {v.notes}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap justify-end items-center gap-x-2 gap-y-2 border-t pt-4 mt-auto">
                <Button variant="outline" size="sm" onClick={() => handleEdit(v)} disabled={isSubmitting || isUploading}>
                    <Edit3 className="mr-1.5 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteVehicleClick(v)} disabled={isSubmitting || isUploading}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                </Button>
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
              {passwordDialogType === 'create' ? 'Senha para Registrar Veículo' : 'Senha para Excluir Veículo'}
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
    </div>
  );
}
