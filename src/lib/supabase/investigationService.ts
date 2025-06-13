
// src/lib/supabase/investigationService.ts
'use server';

import { supabase } from './client';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia'; // Corrected bucket name

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

const formatSupabaseError = (error: any, functionName: string): string => {
    console.error(`[SupabaseService][${functionName}] Original error:`, error); // Log the original complex error
    let message = `Error in ${functionName}.`;
    if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
        message = error.message;
    } else if (error && typeof error.message === 'string' && error.message.trim()) {
        // This handles Supabase error objects which aren't instanceof Error
        message = error.message;
        if (typeof error.details === 'string' && error.details.trim()) {
            message += ` Details: ${error.details}`;
        }
        if (typeof error.hint === 'string' && error.hint.trim()) {
            message += ` Hint: ${error.hint}`;
        }
    } else if (typeof error === 'string' && error.trim()) {
        message = error;
    } else {
        message = `An unexpected error occurred in ${functionName}. Check server logs for full details.`;
    }
    console.error(`[SupabaseService][${functionName}] Formatted client-facing error message: "${message}"`);
    return message;
};

export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> {
  const functionName = "addInvestigation";
  console.log(`[SupabaseService][${functionName}] Called with data:`, JSON.stringify(investigationData, null, 2));
  try {
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`[SupabaseService][${functionName}] Error fetching investigation count for R.O. number:`, countError);
      // Let formatSupabaseError handle this for consistent error propagation
      throw countError;
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
      media_urls: investigationData.mediaUrls || [], // Initialize with empty array if not provided
    };
    
    console.log(`[SupabaseService][${functionName}] Attempting to insert investigation with payload:`, JSON.stringify(payloadToInsert, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .insert(payloadToInsert)
      .select()
      .single();

    if (insertError || !insertedData) {
      // Let formatSupabaseError handle this
      throw insertError || new Error('No data returned from insert operation.');
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
    throw new Error(formatSupabaseError(error, functionName));
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
      throw error;
    }
    console.log(`[SupabaseService][${functionName}] Successfully fetched ${data.length} investigations.`);
    return data.map(inv => ({
      id: inv.id,
      title: inv.title,
      description: inv.description,
      assignedInvestigator: inv.assigned_investigator,
      status: inv.status,
      roNumber: inv.ro_number || 'N/A',
      creationDate: new Date(inv.created_at).toISOString(),
      occurrenceDate: inv.occurrence_date ? new Date(inv.occurrence_date).toISOString() : undefined,
      mediaUrls: inv.media_urls || [],
    }));
  } catch (error: any) {
    throw new Error(formatSupabaseError(error, functionName));
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
    throw new Error(formatSupabaseError(error, functionName));
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
          // Do not re-throw here to allow DB deletion attempt
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
      throw deleteDbError; // Let formatSupabaseError handle this in the outer catch
    }
    console.log(`[SupabaseService][${functionName}] Investigation record ${id} deleted successfully from database.`);
  } catch (error: any) {
    throw new Error(formatSupabaseError(error, functionName));
  }
}


// --- File Storage Specific Functions ---

export async function uploadFileToSupabaseStorage(file: File, investigationId: string): Promise<string> {
  const functionName = "uploadFileToSupabaseStorage";
  console.log(`[SupabaseStorageService][${functionName}] Called for file: ${file.name} (size: ${file.size}, type: ${file.type}), investigationId: ${investigationId}`);
  try {
    if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
        const invalidIdError = `Invalid investigationId for upload. Must be a non-empty string. Received: ${investigationId}`;
        console.error(`[SupabaseStorageService][${functionName}] ${invalidIdError}`);
        throw new Error(invalidIdError); // This is a simple error, should be serializable
    }

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
      // This will be caught by the main catch block and formatted
      throw uploadError;
    }

    if (!data || !data.path) {
       const noPathError = `Supabase Storage upload error for ${filePath}: No path returned from Supabase.`;
       console.error(`[SupabaseStorageService][${functionName}] ${noPathError}`);
       throw new Error(noPathError); // Simple error
    }

    const publicURL = getPublicUrl(data.path);
    if (!publicURL) {
      const getUrlErrorMsg = `Failed to get public URL for ${file.name} after upload. Supabase path: ${data.path}`;
      console.error(`[SupabaseStorageService][${functionName}] ${getUrlErrorMsg}. Attempting to remove orphaned file.`);
      try {
        await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([data.path]);
        console.log(`[SupabaseStorageService][${functionName}] Orphaned file ${data.path} removed successfully.`);
      } catch (removeError: any) {
        console.warn(`[SupabaseStorageService][${functionName}] Failed to remove orphaned file ${data.path} from bucket ${INVESTIGATION_MEDIA_BUCKET}:`, removeError.message || removeError);
      }
      throw new Error(getUrlErrorMsg); // Simple error
    }
    
    console.log(`[SupabaseStorageService][${functionName}] Upload of ${file.name} successful. Public URL: ${publicURL}`);
    return publicURL;

  } catch (error: any) {
    // Enhanced catch block for uploadFileToSupabaseStorage
    const originalErrorType = Object.prototype.toString.call(error);
    console.error(`[SupabaseStorageService][${functionName}] CAUGHT ERROR. Type: ${originalErrorType}. Original error object:`, error);
    
    let clientMessage = `Upload failed for ${file ? file.name : 'unknown file'}. Check server logs for details.`;
    if (error && typeof error.message === 'string' && error.message.trim()) {
      clientMessage = `Upload error: ${error.message}`;
    } else if (typeof error === 'string' && error.trim()) {
      clientMessage = `Upload error: ${error}`;
    } else if (error && error.details && typeof error.details === 'string') { // Catch Supabase specific details
      clientMessage = `Upload error: ${error.details}`;
    }
    
    console.error(`[SupabaseStorageService][${functionName}] Throwing new Error with message: "${clientMessage}"`);
    throw new Error(clientMessage); // Throw a very simple, new Error object.
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
      // More robustly find the bucket name and slice after it.
      // e.g. /storage/v1/object/public/investigationmedia/investigation_id/file.png
      let bucketNameIndex = pathSegments.indexOf(INVESTIGATION_MEDIA_BUCKET);

      // Check if path includes /public/ before bucket name (common in public URLs)
      if (bucketNameIndex === -1 && pathSegments.includes('public')) {
          const publicIndex = pathSegments.indexOf('public');
          if (pathSegments[publicIndex + 1] === INVESTIGATION_MEDIA_BUCKET) {
              bucketNameIndex = publicIndex + 1;
          }
      }
      
      if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length -1) {
        filePathKey = decodeURIComponent(pathSegments.slice(bucketNameIndex + 1).join('/'));
      } else {
         console.warn(`[SupabaseStorageService][${functionName}] Could not reliably extract file path from URL structure for deletion: ${fileUrl}. Expected bucket '${INVESTIGATION_MEDIA_BUCKET}' in path segments: ${pathSegments.join(', ')}`);
         // Attempt a more direct extraction if the above fails, assuming common URL structure
         const searchString = `/object/public/${INVESTIGATION_MEDIA_BUCKET}/`;
         const searchStringIndex = urlObject.pathname.indexOf(searchString);
         if (searchStringIndex !== -1) {
            filePathKey = decodeURIComponent(urlObject.pathname.substring(searchStringIndex + searchString.length));
         } else {
            console.error(`[SupabaseStorageService][${functionName}] Path extraction completely failed for ${fileUrl}. Cannot proceed with deletion.`);
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
      // Re-throw other errors to be caught by the main catch block and formatted
      throw deleteStorageError;
    }
    console.log(`[SupabaseStorageService][${functionName}] File deleted successfully from bucket ${INVESTIGATION_MEDIA_BUCKET}: ${filePathKey}`, data);
  } catch (error: any) {
    // Ensure this also throws a simple error for the client
    const originalErrorType = Object.prototype.toString.call(error);
    console.error(`[SupabaseStorageService][${functionName}] CAUGHT ERROR. Type: ${originalErrorType}. Original error object:`, error);
    let clientMessage = `Failed to delete media from ${fileUrl}. Check server logs.`;
     if (error && typeof error.message === 'string' && error.message.trim()) {
      clientMessage = `Media deletion error: ${error.message}`;
    } else if (typeof error === 'string' && error.trim()) {
      clientMessage = `Media deletion error: ${error}`;
    }
    console.error(`[SupabaseStorageService][${functionName}] Throwing new Error with message: "${clientMessage}"`);
    throw new Error(clientMessage);
  }
}
