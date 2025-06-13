
// src/lib/supabase/investigationService.ts
'use server';

import { supabase } from './client';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia';

// Helper to get public URL for Supabase Storage
const getPublicUrl = (filePath: string): string | null => {
  try {
    const { data } = supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (error) {
    console.error(`[SupabaseService] Error getting public URL for ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}:`, error);
    return null;
  }
};

// Helper to format Supabase (or other) errors for client-facing messages and detailed server logging
const formatSupabaseError = (error: any, functionName: string): string => {
  try {
    // Attempt to log the original error. If logging fails, we still want to return a message.
    console.error(`[SupabaseService][${functionName}] Original error:`, error);
  } catch (logError) {
    console.error(`[SupabaseService][${functionName}] Failed to log original error:`, logError);
  }

  let message = `Error in ${functionName}.`; // Default message

  if (error instanceof Error) {
    if (typeof error.message === 'string' && error.message.trim()) {
      message = error.message;
    }
  } else if (error && typeof error.message === 'string' && error.message.trim()) {
    message = error.message; // Handles Supabase error objects
    if (error.details && typeof error.details === 'string' && error.details.trim()) {
      message += ` Details: ${error.details}`;
    }
    if (error.hint && typeof error.hint === 'string' && error.hint.trim()) {
      message += ` Hint: ${error.hint}`;
    }
  } else if (typeof error === 'string' && error.trim()) {
    message = error;
  } else {
    // Fallback if the error is not an Error instance and doesn't have a message property
    message = `An unexpected error of type ${typeof error} occurred in ${functionName}. Check server logs.`;
  }
  
  // Ensure the final message is a string.
  const finalMessage = String(message);
  console.error(`[SupabaseService][${functionName}] Formatted client-facing error message: "${finalMessage}"`);
  return finalMessage;
};


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> {
  const functionName = "addInvestigation";
  console.log(`[SupabaseService][${functionName}] Called with data (omitting mediaFiles for brevity if present):`, 
    JSON.stringify({ ...investigationData, mediaFiles: investigationData.mediaUrls ? `${investigationData.mediaUrls.length} URLs` : 'No URLs' }, null, 2)
  );

  try {
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`[SupabaseService][${functionName}] Error fetching investigation count for R.O. number:`, countError);
      throw countError; // Caught by outer catch
    }
    const newRoNumber = `${(count || 0) + 1}.0`;
    console.warn(`[SupabaseService][${functionName}] Using client-side count for R.O. number generation. This may not be robust in concurrent scenarios. Current count: ${count}, New R.O.: ${newRoNumber}`);

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
      console.error(`[SupabaseService][${functionName}] Error inserting investigation. Supabase error details:`, insertError);
      throw insertError || new Error('No data returned from insert operation.'); // Caught by outer catch
    }
    
    console.log(`[SupabaseService][${functionName}] Investigation record inserted successfully:`, insertedData.id);

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
    throw new Error(String(messageString));
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
      throw error; // Caught by outer catch
    }
    console.log(`[SupabaseService][${functionName}] Successfully fetched ${data ? data.length : 0} investigations.`);
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
    throw new Error(String(messageString));
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
      throw error || new Error('No data returned from update operation.'); // Caught by outer catch
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
    throw new Error(String(messageString));
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<void> {
  const functionName = "deleteInvestigation";
  console.log(`[SupabaseService][${functionName}] Called for id: ${id}`, mediaUrlsToDelete);
  try {
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      console.log(`[SupabaseService][${functionName}] Attempting to delete ${mediaUrlsToDelete.length} media files from storage for investigation ${id}.`);
      const deletePromises = mediaUrlsToDelete.map(url => deleteFileFromSupabaseStorageUrl(url));
      
      const results = await Promise.allSettled(deletePromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`[SupabaseService][${functionName}] Failed to delete media file ${mediaUrlsToDelete[index]} during investigation deletion:`, result.reason);
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
      throw deleteDbError; // Caught by outer catch
    }
    console.log(`[SupabaseService][${functionName}] Investigation record ${id} deleted successfully from database.`);
  } catch (error: any) {
    const messageString = formatSupabaseError(error, functionName);
    throw new Error(String(messageString));
  }
}


// --- File Storage Specific Functions ---

export async function uploadFileToSupabaseStorage(file: File, investigationId: string): Promise<string> {
  const functionName = "uploadFileToSupabaseStorage";
  console.log(`[SupabaseStorageService][${functionName}] Called for file: ${file ? file.name : 'undefined_file'} (size: ${file ? file.size : 'N/A'}, type: ${file ? file.type : 'N/A'}), investigationId: ${investigationId}`);

  // Parameter validation upfront
  if (!(file instanceof File)) {
    const invalidFileError = `Invalid file parameter for upload. Expected a File object. Received type: ${typeof file}, value: ${String(file)}`;
    console.error(`[SupabaseStorageService][${functionName}] ${invalidFileError}`);
    throw new Error(invalidFileError);
  }
  if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
    const invalidIdError = `Invalid investigationId for upload. Must be a non-empty string. Received: ${investigationId}`;
    console.error(`[SupabaseStorageService][${functionName}] ${invalidIdError}`);
    throw new Error(invalidIdError); 
  }

  try {
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${investigationId}/${fileName}`; 

    console.log(`[SupabaseStorageService][${functionName}] Attempting to upload ${file.name} to path: ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}`);

    const { data, error: uploadError } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, 
      });

    if (uploadError) {
      console.error(`[SupabaseStorageService][${functionName}] Supabase upload error for ${filePath}:`, uploadError);
      throw uploadError; 
    }

    if (!data || !data.path) {
       const noPathError = `Supabase Storage upload error for ${filePath}: No path returned from Supabase.`;
       console.error(`[SupabaseStorageService][${functionName}] ${noPathError}`);
       throw new Error(noPathError);
    }

    const publicURL = getPublicUrl(data.path);
    if (!publicURL) {
      const getUrlErrorMsg = `Failed to get public URL for ${file.name} after upload. Supabase path: ${data.path}`;
      console.error(`[SupabaseStorageService][${functionName}] ${getUrlErrorMsg}. Attempting to remove orphaned file.`);
      try {
        await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([data.path]);
        console.log(`[SupabaseStorageService][${functionName}] Orphaned file ${data.path} removed successfully.`);
      } catch (removeError: any) {
         console.warn(`[SupabaseStorageService][${functionName}] Failed to remove orphaned file ${data.path} from bucket ${INVESTIGATION_MEDIA_BUCKET}:`, formatSupabaseError(removeError, `${functionName} - removeOrphan`));
      }
      throw new Error(getUrlErrorMsg);
    }
    
    console.log(`[SupabaseStorageService][${functionName}] Upload of ${file.name} successful. Public URL: ${publicURL}`);
    return publicURL;

  } catch (error: any) {
    const messageString = formatSupabaseError(error, functionName);
    throw new Error(String(messageString));
  }
}

export async function deleteFileFromSupabaseStorageUrl(fileUrl: string): Promise<void> {
  const functionName = "deleteFileFromSupabaseStorageUrl";
  console.log(`[SupabaseStorageService][${functionName}] Called for URL: ${fileUrl}`);
  try {
    if (!fileUrl || typeof fileUrl !== 'string') {
      console.warn(`[SupabaseStorageService][${functionName}] Invalid fileUrl provided for deletion:`, fileUrl);
      return; 
    }
    
    let filePathKey = ''; 
    try {
      const urlObject = new URL(fileUrl);
      const pathSegments = urlObject.pathname.split('/');
      let bucketNameIndex = pathSegments.indexOf(INVESTIGATION_MEDIA_BUCKET);

      if (bucketNameIndex === -1 && pathSegments.includes('public')) {
          const publicIndex = pathSegments.indexOf('public');
          if (pathSegments[publicIndex + 1] === INVESTIGATION_MEDIA_BUCKET) {
              bucketNameIndex = publicIndex + 1;
          }
      }
      
      if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length -1) {
        filePathKey = decodeURIComponent(pathSegments.slice(bucketNameIndex + 1).join('/'));
      } else {
         const searchString = `/object/public/${INVESTIGATION_MEDIA_BUCKET}/`;
         const searchStringIndex = urlObject.pathname.indexOf(searchString);
         if (searchStringIndex !== -1) {
            filePathKey = decodeURIComponent(urlObject.pathname.substring(searchStringIndex + searchString.length));
         } else {
            console.warn(`[SupabaseStorageService][${functionName}] Could not reliably extract file path from URL structure for deletion: ${fileUrl}. Path segments: ${pathSegments.join(', ')}. Bucket expected: ${INVESTIGATION_MEDIA_BUCKET}`);
            // If Supabase ever changes its public URL structure significantly, this might need updating.
            // For now, if extraction fails, we warn and cannot proceed.
            return;
         }
      }
    } catch (e: any) {
      console.warn(`[SupabaseStorageService][${functionName}] Invalid URL format, cannot parse for deletion: ${fileUrl}`, e.message || e);
      return; 
    }

    if (!filePathKey || filePathKey.trim() === '') {
      console.warn(`[SupabaseStorageService][${functionName}] Extracted file path is empty from URL, cannot delete: ${fileUrl}`);
      return; 
    }

    console.log(`[SupabaseStorageService][${functionName}] Attempting to delete file from path: '${filePathKey}' in bucket '${INVESTIGATION_MEDIA_BUCKET}'`);
    const { data, error: deleteStorageError } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .remove([filePathKey]);

    if (deleteStorageError) {
      if (deleteStorageError.message && (deleteStorageError.message.toLowerCase().includes("not found") || (deleteStorageError as any).statusCode === 404 || (deleteStorageError as any).statusCode === '404' || deleteStorageError.message.includes("No object exists")) ) { 
           console.warn(`[SupabaseStorageService][${functionName}] File not found in bucket ${INVESTIGATION_MEDIA_BUCKET} at path '${filePathKey}', could not delete (Error: ${deleteStorageError.message})`);
           return; 
      }
      throw deleteStorageError; // Caught by outer catch
    }
    console.log(`[SupabaseStorageService][${functionName}] File deleted successfully from bucket ${INVESTIGATION_MEDIA_BUCKET}: ${filePathKey}`, data);
  } catch (error: any) {
    const messageString = formatSupabaseError(error, functionName);
    throw new Error(String(messageString));
  }
}
