// src/lib/supabase/investigationService.ts
'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Use the new server client
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia';

interface UploadResponse {
  success: boolean;
  urls?: string[];
  error?: string;
}

interface GenericResponse {
    success: boolean;
    error?: string;
    data?: any;
}


// Centralized error formatting and logging
const formatSupabaseError = (error: any, functionName: string): { message: string, originalError: any } => {
  let message = `Error in ${functionName}.`;
  
  console.error(`[SupabaseService][${functionName}] Original error type: ${typeof error}. Original error object:`, error);

  if (error instanceof Error) {
    message = error.message || message;
  } else if (error && typeof error.message === 'string' && error.message.trim()) {
    message = error.message;
    if (error.details && typeof error.details === 'string' && error.details.trim()) {
      message += ` Details: ${error.details}`;
    }
    if (error.hint && typeof error.hint === 'string' && error.hint.trim()) {
      message += ` Hint: ${error.hint}`;
    }
  } else if (typeof error === 'string' && error.trim()) {
    message = error;
  } else if (error && typeof error === 'object' && error !== null) {
    const supabaseError = error as { message?: string; details?: string; hint?: string; error_description?: string, error?: string, code?: string, status?: number };
    if (supabaseError.message) message = supabaseError.message;
    else if (supabaseError.error_description) message = supabaseError.error_description;
    else if (supabaseError.error) message = supabaseError.error; // For StorageError
    else if (supabaseError.code || supabaseError.status) message = `Supabase error (Code: ${supabaseError.code}, Status: ${supabaseError.status}). Check server logs.`;
    else message = `An unexpected error of type ${typeof error} occurred in ${functionName}. Check server logs for full details.`;
  } else {
    message = `An unexpected error of type ${typeof error} occurred in ${functionName}. Check server logs for full details.`;
  }
  
  const finalMessage = String(message).trim() || `An unexpected error occurred in ${functionName}. Check server logs.`;
  console.error(`[SupabaseService][${functionName}] Formatted client-facing error message: "${finalMessage}"`);
  return { message: finalMessage, originalError: error };
};


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> { // Keep throwing for this one as client expects Investigation or error
  const functionName = "addInvestigation";
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  console.log(`[SupabaseService][${functionName}] Called with data (mediaUrls length: ${investigationData.mediaUrls?.length ?? 0})`);

  try {
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`[SupabaseService][${functionName}] Error fetching investigation count. Supabase error:`, countError);
      const { message: formattedMessage } = formatSupabaseError(countError, `${functionName} - count`);
      throw new Error(formattedMessage);
    }
    const newRoNumber = `${(count || 0) + 1}.0`;
    console.log(`[SupabaseService][${functionName}] Generated R.O. number: ${newRoNumber}.`);

    const payloadToInsert = {
      title: investigationData.title,
      description: investigationData.description,
      assigned_investigator: investigationData.assignedInvestigator,
      status: investigationData.status,
      occurrence_date: investigationData.occurrenceDate,
      ro_number: newRoNumber,
      media_urls: investigationData.mediaUrls || [],
    };

    console.log(`[SupabaseService][${functionName}] Attempting to insert investigation with payload:`, JSON.stringify(payloadToInsert, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .insert(payloadToInsert)
      .select()
      .single();

    if (insertError || !insertedData) {
      console.error(`[SupabaseService][${functionName}] Error inserting investigation into database. Supabase error details:`, insertError);
      const { message: formattedMessage } = formatSupabaseError(insertError || new Error('No data returned from insert operation.'), functionName);
      throw new Error(formattedMessage);
    }

    console.log(`[SupabaseService][${functionName}] Investigation record inserted successfully: ${insertedData.id}`);

    return {
      id: insertedData.id,
      title: insertedData.title,
      description: insertedData.description,
      assignedInvestigator: insertedData.assigned_investigator,
      status: insertedData.status,
      roNumber: insertedData.ro_number,
      creationDate: new Date(insertedData.created_at).toISOString(),
      occurrenceDate: insertedData.occurrence_date ? new Date(insertedData.occurrence_date).toISOString() : undefined,
      mediaUrls: insertedData.media_urls || [],
    };

  } catch (error: any) {
    if (error instanceof Error && error.message.startsWith('Error in')) { 
        throw error;
    }
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    throw new Error(formattedMessage);
  }
}


export async function getInvestigations(): Promise<Investigation[]> { // Keep throwing for this one
  const functionName = "getInvestigations";
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  try {
    console.log(`[SupabaseService][${functionName}] Attempting to fetch investigations.`);
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[SupabaseService][${functionName}] Error fetching investigations from database. Supabase error:`, error);
      const { message: formattedMessage } = formatSupabaseError(error, functionName);
      throw new Error(formattedMessage);
    }

    console.log(`[SupabaseService][${functionName}] Successfully fetched ${data?.length ?? 0} investigations.`);
    return data ? data.map(inv => ({
      id: inv.id,
      title: inv.title,
      description: inv.description,
      assignedInvestigator: inv.assigned_investigator,
      status: inv.status,
      roNumber: inv.ro_number || 'N/A',
      creationDate: new Date(inv.created_at).toISOString(),
      occurrenceDate: inv.occurrence_date ? new Date(inv.occurrence_date).toISOString() : undefined,
      mediaUrls: inv.media_urls || [],
    })) : [];
  } catch (error: any) {
     if (error instanceof Error && error.message.startsWith('Error in')) {
        throw error;
    }
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    throw new Error(formattedMessage);
  }
}

export async function updateInvestigation(id: string, updates: Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>>): Promise<Investigation> { // Keep throwing
  const functionName = "updateInvestigation";
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  try {
    const supabaseUpdates: Record<string, any> = {};
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.assignedInvestigator !== undefined) supabaseUpdates.assigned_investigator = updates.assignedInvestigator;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.occurrenceDate !== undefined) supabaseUpdates.occurrence_date = updates.occurrenceDate;
    if (updates.mediaUrls !== undefined) supabaseUpdates.media_urls = updates.mediaUrls;

    console.log(`[SupabaseService][${functionName}] Attempting to update investigation ${id} with payload:`, JSON.stringify(supabaseUpdates, null, 2));
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error(`[SupabaseService][${functionName}] Error updating investigation ${id} in database. Supabase error:`, error);
      const { message: formattedMessage } = formatSupabaseError(error || new Error('No data returned from update operation.'), functionName);
      throw new Error(formattedMessage);
    }
    console.log(`[SupabaseService][${functionName}] Investigation ${id} updated successfully.`);
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedInvestigator: data.assigned_investigator,
      status: data.status,
      roNumber: data.ro_number,
      creationDate: new Date(data.created_at).toISOString(),
      occurrenceDate: data.occurrence_date ? new Date(data.occurrence_date).toISOString() : undefined,
      mediaUrls: data.media_urls || [],
    };

  } catch (error: any) {
     if (error instanceof Error && error.message.startsWith('Error in')) {
        throw error;
    }
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    throw new Error(formattedMessage);
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<GenericResponse> {
  const functionName = "deleteInvestigation";
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore); // Needed for deleteFileFromSupabaseStorageUrl if it used this client
  
  console.log(`[SupabaseService][${functionName}] Called for id: ${id}`, mediaUrlsToDelete ? `with ${mediaUrlsToDelete.length} media URLs to delete.` : "with no media URLs to delete.");
  try {
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      console.log(`[SupabaseService][${functionName}] Attempting to delete ${mediaUrlsToDelete.length} media files from storage for investigation ${id}.`);
      // Pass the supabase client instance to deleteFileFromSupabaseStorageUrl
      const deletePromises = mediaUrlsToDelete.map(url => deleteFileFromSupabaseStorageUrl(url, supabase));
      
      const results = await Promise.allSettled(deletePromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`[SupabaseService][${functionName}] Failed to delete media file ${mediaUrlsToDelete[index]} during investigation deletion (promise rejected):`, result.reason);
        } else if (result.value && result.value.success === false) {
           console.warn(`[SupabaseService][${functionName}] Deletion of media file ${mediaUrlsToDelete[index]} reported failure: ${result.value.error}`);
        } else {
           console.log(`[SupabaseService][${functionName}] Successfully processed deletion for media file ${mediaUrlsToDelete[index]}.`);
        }
      });
    }

    console.log(`[SupabaseService][${functionName}] Attempting to delete investigation record with id: ${id} from database.`);
    const { error: deleteDbError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .delete()
      .eq('id', id);

    if (deleteDbError) {
      console.error(`[SupabaseService][${functionName}] Error deleting investigation from database. Supabase error details:`, deleteDbError);
      const { message: formattedMessage } = formatSupabaseError(deleteDbError, `${functionName} - DB delete`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseService][${functionName}] Investigation record ${id} deleted successfully from database.`);
    return { success: true };
  } catch (error: any) {
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}


// --- File Storage Specific Functions ---

export async function uploadFileToSupabaseStorage(formData: FormData): Promise<UploadResponse> {
  const functionName = "uploadFileToSupabaseStorage (FormData)";
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  console.log(`[SupabaseStorageService][${functionName}] Entered function.`);
  
  const loggableFormData: Record<string, any> = { files: [] };
  try {
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        loggableFormData.files.push({ name: value.name, size: value.size, type: value.type });
      } else {
        loggableFormData[key] = value;
      }
    }
    console.log(`[SupabaseStorageService][${functionName}] Received FormData, parsed investigationId and file info:`, JSON.stringify(loggableFormData, null, 2));
  } catch (e) {
      console.error(`[SupabaseStorageService][${functionName}] Error trying to log FormData entries:`, e);
  }

  try {
    const investigationId = formData.get('investigationId') as string;
    const files = formData.getAll('mediaFiles') as File[];

    if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
      const invalidIdError = `Invalid investigationId for upload. Must be a non-empty string. Received: '${investigationId}' (type: ${typeof investigationId})`;
      console.error(`[SupabaseStorageService][${functionName}] ${invalidIdError}`);
      return { success: false, error: invalidIdError };
    }
    if (!files || files.length === 0) {
      console.warn(`[SupabaseStorageService][${functionName}] No files found in FormData to upload for investigation ${investigationId}.`);
      return { success: true, urls: [] };
    }
    
    for (const file of files) {
        if (!(file instanceof File)) {
            const invalidFileError = `Invalid item encountered in 'mediaFiles'. Expected File object, got ${typeof file}.`;
            console.error(`[SupabaseStorageService][${functionName}] ${invalidFileError}`);
            return { success: false, error: `One or more media items are not valid files.` };
        }
    }
    console.log(`[SupabaseStorageService][${functionName}] Processing ${files.length} valid file(s) for investigation ID: ${investigationId}`);

    const uploadedUrls: string[] = [];

    for (const file of files) {
      console.log(`[SupabaseStorageService][${functionName}] Processing file: ${file.name} (size: ${file.size}, type: ${file.type}) for investigation ID: ${investigationId}`);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${investigationId}/${fileName}`;

      console.log(`[SupabaseStorageService][${functionName}] Attempting to upload ${file.name} to path: ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(INVESTIGATION_MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, 
        });

      if (uploadError) {
        console.error(`[SupabaseStorageService][${functionName}] Supabase storage.upload error for ${filePath}.`);
        const { message: formattedMessage } = formatSupabaseError(uploadError, `${functionName} - Supabase .upload`);
        return { success: false, error: `Upload error: ${formattedMessage}` };
      }

      if (!uploadData || !uploadData.path) {
         const noPathError = `Supabase Storage upload error for ${filePath}: No path returned.`;
         console.error(`[SupabaseStorageService][${functionName}] ${noPathError}. Upload data: ${JSON.stringify(uploadData)}`);
         return { success: false, error: noPathError };
      }

      const { data: publicUrlData } = supabase.storage // Removed error check here as getPublicUrl doesn't return an error object in the same way for V2. It throws on failure or path is bad.
         .from(INVESTIGATION_MEDIA_BUCKET)
         .getPublicUrl(uploadData.path);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        const getUrlErrorMsg = `Failed to get public URL for ${file.name} after upload. Supabase path: ${uploadData.path}`;
        console.error(`[SupabaseStorageService][${functionName}] ${getUrlErrorMsg}. Public URL Data received:`, publicUrlData);
        try {
          await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([uploadData.path]);
          console.log(`[SupabaseStorageService][${functionName}] Orphaned file ${uploadData.path} removed successfully.`);
        } catch (removeError: any) {
           console.warn(`[SupabaseStorageService][${functionName}] Failed to remove orphaned file ${uploadData.path} from bucket ${INVESTIGATION_MEDIA_BUCKET}:`, formatSupabaseError(removeError, `${functionName} - removeOrphan`).message);
        }
        return { success: false, error: `${getUrlErrorMsg}. Reason: Could not retrieve public URL.` };
      }
      const publicURL = publicUrlData.publicUrl;
      console.log(`[SupabaseStorageService][${functionName}] Upload of ${file.name} successful. Public URL: ${publicURL}`);
      uploadedUrls.push(publicURL);
    }
    console.log(`[SupabaseStorageService][${functionName}] All files uploaded successfully. Returning URLs:`, uploadedUrls);
    return { success: true, urls: uploadedUrls };

  } catch (error: any) { 
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    console.error(`[SupabaseStorageService][${functionName}] UNHANDLED EXCEPTION in main try-catch. Error: ${formattedMessage}.`);
    return { success: false, error: `Upload error (unhandled exception): ${formattedMessage}` };
  }
}


// Modified to accept supabase client instance
export async function deleteFileFromSupabaseStorageUrl(fileUrl: string, supabaseClient?: any): Promise<GenericResponse> {
  const functionName = "deleteFileFromSupabaseStorageUrl";
  const supabase = supabaseClient || createSupabaseServerClient(cookies()); // Use passed client or create new

  console.log(`[SupabaseStorageService][${functionName}] Called for URL: ${fileUrl}`);
  try {
    if (!fileUrl || typeof fileUrl !== 'string') {
      const warningMsg = `Invalid fileUrl provided for deletion: ${fileUrl}`;
      console.warn(`[SupabaseStorageService][${functionName}] ${warningMsg}`);
      return { success: false, error: warningMsg };
    }

    let filePathKey = '';
    try {
        const urlObject = new URL(fileUrl);
        const pathSegments = urlObject.pathname.split('/');
        const bucketNameIndex = pathSegments.findIndex(segment => segment === INVESTIGATION_MEDIA_BUCKET);
        if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length -1) {
            filePathKey = pathSegments.slice(bucketNameIndex + 1).join('/');
            filePathKey = decodeURIComponent(filePathKey);
            const queryIndex = filePathKey.indexOf('?');
            if (queryIndex !== -1) {
                filePathKey = filePathKey.substring(0, queryIndex);
            }
        } else {
            console.warn(`[SupabaseStorageService][${functionName}] Could not reliably extract file path key from URL: ${fileUrl} using bucket name '${INVESTIGATION_MEDIA_BUCKET}'.`);
            throw new Error(`Could not determine file path from URL for deletion: ${fileUrl}`);
        }
    } catch (e: any) {
      const { message: formattedMessage } = formatSupabaseError(e, `${functionName} - URL parsing`);
      return { success: false, error: formattedMessage };
    }

    if (!filePathKey || filePathKey.trim() === '') {
      const errMsg =`Extracted file path is empty from URL, cannot delete: ${fileUrl}`;
      console.warn(`[SupabaseStorageService][${functionName}] ${errMsg}`);
      return { success: false, error: errMsg };
    }

    console.log(`[SupabaseStorageService][${functionName}] Attempting to delete file from path: '${filePathKey}' in bucket '${INVESTIGATION_MEDIA_BUCKET}'`);
    const { data, error: deleteStorageError } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .remove([filePathKey]);

    if (deleteStorageError) {
      const errString = JSON.stringify(deleteStorageError).toLowerCase();
      const errMessage = (deleteStorageError as any).message?.toLowerCase();
      if (errString.includes("not found") || errString.includes("no object exists") || errMessage?.includes("not found") || (deleteStorageError as any).statusCode === 404 || (deleteStorageError as any).status === 404 ) {
           console.warn(`[SupabaseStorageService][${functionName}] File not found in bucket ${INVESTIGATION_MEDIA_BUCKET} at path '${filePathKey}', considered successful deletion. (Error: ${(deleteStorageError as any).message})`);
           return { success: true };
      }
      console.error(`[SupabaseStorageService][${functionName}] Supabase storage deletion error for path '${filePathKey}'.`);
      const { message: formattedMessage } = formatSupabaseError(deleteStorageError, `${functionName} - Supabase .remove`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseStorageService][${functionName}] File deleted successfully from bucket ${INVESTIGATION_MEDIA_BUCKET}: ${filePathKey}`, data);
    return { success: true };
  } catch (error: any) { 
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: `Delete file error (unhandled exception): ${formattedMessage}` };
  }
}
