
// src/lib/supabase/investigationService.ts
'use server';

import { supabase } from './client';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia';

// Helper to format Supabase (or other) errors for client-facing messages and detailed server logging
const formatSupabaseError = (error: any, functionName: string): string => {
  let message = `Error in ${functionName}.`;
  let logDetails = error;

  console.error(`[SupabaseService][${functionName}] Original error type: ${typeof error}. Original error object:`, logDetails);

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
    // Attempt to get a message from common Supabase error structures
    const supabaseError = error as { message?: string; details?: string; hint?: string; error_description?: string, error?: string };
    if (supabaseError.message) message = supabaseError.message;
    else if (supabaseError.error_description) message = supabaseError.error_description;
    else if (supabaseError.error) message = supabaseError.error;
    else message = `An unexpected error of type ${typeof error} occurred in ${functionName}. Check server logs for full details.`;
  } else {
    message = `An unexpected error of type ${typeof error} occurred in ${functionName}. Check server logs for full details.`;
  }
  
  console.error(`[SupabaseService][${functionName}] Formatted client-facing error message: "${String(message)}"`);
  return String(message);
};


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> {
  const functionName = "addInvestigation";
  console.log(`[SupabaseService][${functionName}] Called with data (mediaUrls length: ${investigationData.mediaUrls?.length ?? 0})`);

  try {
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`[SupabaseService][${functionName}] Error fetching investigation count. Supabase error:`, countError);
      throw countError;
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
      throw insertError || new Error('No data returned from insert operation.');
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
    const messageString = formatSupabaseError(error, functionName);
    throw new Error(messageString);
  }
}


export async function getInvestigations(): Promise<Investigation[]> {
  const functionName = "getInvestigations";
  try {
    console.log(`[SupabaseService][${functionName}] Attempting to fetch investigations.`);
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[SupabaseService][${functionName}] Error fetching investigations from database. Supabase error:`, error);
      throw error;
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
    const messageString = formatSupabaseError(error, functionName);
    throw new Error(messageString);
  }
}

export async function updateInvestigation(id: string, updates: Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>>): Promise<Investigation> {
  const functionName = "updateInvestigation";
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
      throw error || new Error('No data returned from update operation.');
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
    const messageString = formatSupabaseError(error, functionName);
    throw new Error(messageString);
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<void> {
  const functionName = "deleteInvestigation";
  console.log(`[SupabaseService][${functionName}] Called for id: ${id}`, mediaUrlsToDelete ? `with ${mediaUrlsToDelete.length} media URLs to delete.` : "with no media URLs to delete.");
  try {
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      console.log(`[SupabaseService][${functionName}] Attempting to delete ${mediaUrlsToDelete.length} media files from storage for investigation ${id}.`);
      const deletePromises = mediaUrlsToDelete.map(url => deleteFileFromSupabaseStorageUrl(url));
      
      const results = await Promise.allSettled(deletePromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Log warning, but don't let a single file deletion failure stop the whole process if others succeed.
          // The main record deletion is the most critical part.
          console.warn(`[SupabaseService][${functionName}] Failed to delete media file ${mediaUrlsToDelete[index]} during investigation deletion:`, result.reason);
        } else {
          // result.value will be true if successfully deleted, or contain an error object if handled that way by deleteFileFromSupabaseStorageUrl
          if (result.value && (result.value as any).success === false) {
             console.warn(`[SupabaseService][${functionName}] Deletion of media file ${mediaUrlsToDelete[index]} reported failure: ${(result.value as any).error}`);
          } else {
             console.log(`[SupabaseService][${functionName}] Successfully processed deletion for media file ${mediaUrlsToDelete[index]}.`);
          }
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
      throw deleteDbError; 
    }
    console.log(`[SupabaseService][${functionName}] Investigation record ${id} deleted successfully from database.`);
  } catch (error: any) {
    const messageString = formatSupabaseError(error, functionName);
    throw new Error(messageString);
  }
}


// --- File Storage Specific Functions ---

interface UploadFileResponse {
  success: boolean;
  urls?: string[];
  error?: string;
}

export async function uploadFileToSupabaseStorage(formData: FormData): Promise<UploadFileResponse> {
  const functionName = "uploadFileToSupabaseStorage (FormData)";
  console.log(`[SupabaseStorageService][${functionName}] Entered function.`);

  try {
    const loggableFormData: Record<string, any> = {};
    // @ts-ignore
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        loggableFormData[key] = { name: value.name, size: value.size, type: value.type, lastModified: value.lastModified };
      } else {
        loggableFormData[key] = value;
      }
    }
    console.log(`[SupabaseStorageService][${functionName}] Received FormData with entries (files logged with basic info):`, JSON.stringify(loggableFormData, null, 2));

    const investigationId = formData.get('investigationId') as string;
    const files = formData.getAll('mediaFiles') as File[];

    if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
      const invalidIdError = `Invalid investigationId for upload. Must be a non-empty string. Received: ${investigationId}`;
      console.error(`[SupabaseStorageService][${functionName}] ${invalidIdError}`);
      return { success: false, error: invalidIdError };
    }
    if (!files || files.length === 0) {
      console.warn(`[SupabaseStorageService][${functionName}] No files found in FormData to upload for investigation ${investigationId}.`);
      return { success: true, urls: [] }; // No error, but no files uploaded
    }
    console.log(`[SupabaseStorageService][${functionName}] Processing ${files.length} file(s) for investigation ID: ${investigationId}`);

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        console.warn(`[SupabaseStorageService][${functionName}] Encountered non-File item in FormData 'mediaFiles':`, file);
        continue; 
      }

      console.log(`[SupabaseStorageService][${functionName}] Processing file: ${file.name} (size: ${file.size}, type: ${file.type}) for investigation ID: ${investigationId}`);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${investigationId}/${fileName}`;

      console.log(`[SupabaseStorageService][${functionName}] Attempting to upload ${file.name} to path: ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(INVESTIGATION_MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Set to true if you want to overwrite, false to error on conflict
        });

      if (uploadError) {
        console.error(`[SupabaseStorageService][${functionName}] Supabase upload error for ${filePath}. Details:`, uploadError);
        // Let the main catch block handle formatting and re-throwing
        throw uploadError; 
      }

      if (!uploadData || !uploadData.path) {
         const noPathError = `Supabase Storage upload error for ${filePath}: No path returned from Supabase. Upload data: ${JSON.stringify(uploadData)}`;
         console.error(`[SupabaseStorageService][${functionName}] ${noPathError}`);
         throw new Error(noPathError); // This will be caught by the main try-catch
      }

      const publicURL = getPublicUrl(uploadData.path);
      if (!publicURL) {
        const getUrlErrorMsg = `Failed to get public URL for ${file.name} after upload. Supabase path: ${uploadData.path}`;
        console.error(`[SupabaseStorageService][${functionName}] ${getUrlErrorMsg}. Attempting to remove orphaned file.`);
        try {
          await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([uploadData.path]);
          console.log(`[SupabaseStorageService][${functionName}] Orphaned file ${uploadData.path} removed successfully.`);
        } catch (removeError: any) {
           console.warn(`[SupabaseStorageService][${functionName}] Failed to remove orphaned file ${uploadData.path} from bucket ${INVESTIGATION_MEDIA_BUCKET}:`, formatSupabaseError(removeError, `${functionName} - removeOrphan`));
        }
        throw new Error(getUrlErrorMsg); // This will be caught by the main try-catch
      }
      console.log(`[SupabaseStorageService][${functionName}] Upload of ${file.name} successful. Public URL: ${publicURL}`);
      uploadedUrls.push(publicURL);
    }
    return { success: true, urls: uploadedUrls };

  } catch (error: any) {
    // This catch block now formats the error and returns it in the structured response
    const messageString = formatSupabaseError(error, functionName);
    console.error(`[SupabaseStorageService][${functionName}] Returning error response: "Upload error: ${String(messageString)}"`);
    return { success: false, error: `Upload error: ${String(messageString)}` };
  }
}


interface DeleteFileResponse {
  success: boolean;
  error?: string;
}

export async function deleteFileFromSupabaseStorageUrl(fileUrl: string): Promise<DeleteFileResponse> {
  const functionName = "deleteFileFromSupabaseStorageUrl";
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
        // Path relative to bucket: e.g., /storage/v1/object/public/investigationmedia/investigation_id/file_name.png
        // We need: investigation_id/file_name.png
        // Split by bucket name and take the part after it.
        const pathParts = urlObject.pathname.split(`/${INVESTIGATION_MEDIA_BUCKET}/`);
        if (pathParts.length > 1) {
            filePathKey = decodeURIComponent(pathParts[1]);
            // Remove query parameters if any (often from image transformations)
            const queryIndex = filePathKey.indexOf('?');
            if (queryIndex !== -1) {
                filePathKey = filePathKey.substring(0, queryIndex);
            }
        } else {
            console.warn(`[SupabaseStorageService][${functionName}] Could not reliably extract file path key from URL: ${fileUrl} using bucket name '${INVESTIGATION_MEDIA_BUCKET}'. Path segments: ${urlObject.pathname.split('/').join(', ')}.`);
            throw new Error(`Could not determine file path from URL for deletion: ${fileUrl}`);
        }
    } catch (e: any) {
      const errMsg = `Invalid URL format or issue extracting path for deletion: ${fileUrl}. Details: ${e.message || e}`;
      console.warn(`[SupabaseStorageService][${functionName}] ${errMsg}`);
      throw new Error(errMsg); // Will be caught by outer try-catch
    }

    if (!filePathKey || filePathKey.trim() === '') {
      const errMsg =`Extracted file path is empty from URL, cannot delete: ${fileUrl}`;
      console.warn(`[SupabaseStorageService][${functionName}] ${errMsg}`);
      throw new Error(errMsg); // Will be caught by outer try-catch
    }

    console.log(`[SupabaseStorageService][${functionName}] Attempting to delete file from path: '${filePathKey}' in bucket '${INVESTIGATION_MEDIA_BUCKET}'`);
    const { data, error: deleteStorageError } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .remove([filePathKey]);

    if (deleteStorageError) {
      // Check if the error is "File not found" (Supabase might return different error structures)
      const errString = JSON.stringify(deleteStorageError).toLowerCase();
      if (errString.includes("not found") || errString.includes("no object exists") || (deleteStorageError as any).statusCode === 404 || (deleteStorageError as any).status === 404 ) {
           console.warn(`[SupabaseStorageService][${functionName}] File not found in bucket ${INVESTIGATION_MEDIA_BUCKET} at path '${filePathKey}', considered successful deletion. (Error: ${deleteStorageError.message})`);
           return { success: true }; // Not an error if file is already gone
      }
      console.error(`[SupabaseStorageService][${functionName}] Supabase storage deletion error for path '${filePathKey}'. Details:`, deleteStorageError);
      throw deleteStorageError; // Will be caught by outer try-catch
    }
    console.log(`[SupabaseStorageService][${functionName}] File deleted successfully from bucket ${INVESTIGATION_MEDIA_BUCKET}: ${filePathKey}`, data);
    return { success: true };
  } catch (error: any) {
    const messageString = formatSupabaseError(error, functionName);
    console.error(`[SupabaseStorageService][${functionName}] Returning error response: "Delete file error: ${String(messageString)}"`);
    return { success: false, error: `Delete file error: ${String(messageString)}` };
  }
}
