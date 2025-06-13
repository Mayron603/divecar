
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

const formatSupabaseError = (error: any, functionName: string): string => {
    console.error(`[SupabaseService][${functionName}] Original error:`, error);
    let message = `Error in ${functionName}.`;
    if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
        message = error.message;
    } else if (error && typeof error.message === 'string' && error.message.trim()) {
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
    console.error(`[SupabaseService][${functionName}] Throwing client-facing error:`, message);
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
      throw new Error(`Failed to fetch investigation count. Supabase message: ${countError.message}`);
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
      throw deleteDbError;
    }
    console.log(`[SupabaseService][${functionName}] Investigation record ${id} deleted successfully from database.`);
  } catch (error: any) {
    throw new Error(formatSupabaseError(error, functionName));
  }
}


// --- File Storage Specific Functions ---

export async function uploadFileToSupabaseStorage(file: File, investigationId: string): Promise<string> {
  const functionName = "uploadFileToSupabaseStorage";
  console.log(`[SupabaseStorageService][${functionName}] Called for file: ${file.name}, investigationId: ${investigationId}`);
  try {
    if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
        const invalidIdError = `[SupabaseStorageService][${functionName}] Invalid investigationId for upload. Must be a non-empty string. Received: ${investigationId}`;
        console.error(invalidIdError);
        throw new Error(invalidIdError);
    }

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    // Ensure the path within the bucket is just investigationId/fileName, without 'public/' prefix here
    // The 'public/' part is handled by how Supabase constructs public URLs, not in the storage path itself.
    const filePath = `${investigationId}/${fileName}`; 

    console.log(`[SupabaseStorageService][${functionName}] Attempting to upload ${file.name} to path: ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}`);

    const { data, error: uploadError } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, 
      });

    if (uploadError) {
      throw uploadError;
    }

    if (!data || !data.path) {
       const noPathError = `[SupabaseStorageService][${functionName}] Supabase Storage upload error for ${filePath}: No path returned from Supabase.`;
       console.error(noPathError);
       throw new Error(noPathError);
    }

    const publicURL = getPublicUrl(data.path);
    if (!publicURL) {
      console.error(`[SupabaseStorageService][${functionName}] Could not get public URL for ${data.path} in bucket ${INVESTIGATION_MEDIA_BUCKET}. Attempting to remove orphaned file.`);
      try {
        await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([data.path]);
        console.log(`[SupabaseStorageService][${functionName}] Orphaned file ${data.path} removed successfully.`);
      } catch (removeError: any) {
        console.warn(`[SupabaseStorageService][${functionName}] Failed to remove orphaned file ${data.path} from bucket ${INVESTIGATION_MEDIA_BUCKET}:`, removeError.message);
      }
      throw new Error(`Failed to get public URL for ${file.name} after upload.`);
    }
    
    console.log(`[SupabaseStorageService][${functionName}] Upload of ${file.name} successful. Public URL: ${publicURL}`);
    return publicURL;

  } catch (error: any) {
    throw new Error(formatSupabaseError(error, functionName));
  }
}

export async function deleteFileFromSupabaseStorageUrl(fileUrl: string): Promise<void> {
  const functionName = "deleteFileFromSupabaseStorageUrl";
  console.log(`[SupabaseStorageService][${functionName}] Called for URL: ${fileUrl}`);
  try {
    if (!fileUrl || typeof fileUrl !== 'string') {
      console.warn(`[SupabaseStorageService][${functionName}] Invalid fileUrl provided for deletion:`, fileUrl);
      return; // Not an error, just can't proceed
    }
    
    let filePathKey = ''; // This is the key/path of the object within the bucket
    try {
      const urlObject = new URL(fileUrl);
      // Example public URL: https://<project_ref>.supabase.co/storage/v1/object/public/<bucket_name>/<folder_path>/<file_name.ext>
      // The path part we need is after `/public/<bucket_name>/` or `/object/public/<bucket_name>`
      const pathSegments = urlObject.pathname.split('/');
      const bucketNameIndex = pathSegments.indexOf(INVESTIGATION_MEDIA_BUCKET);

      if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length -1) {
        filePathKey = decodeURIComponent(pathSegments.slice(bucketNameIndex + 1).join('/'));
      } else {
        // Fallback for slightly different URL structures or if bucket name is not in path as expected
        // This might happen if the URL is not a direct public URL from Supabase but constructed differently.
        // A more robust solution might involve knowing the exact base path of your storage URLs.
        // For now, let's try a common pattern assuming /storage/v1/object/public/bucket_name/ is present
        const objectPublicPath = `/storage/v1/object/public/${INVESTIGATION_MEDIA_BUCKET}/`;
        if (urlObject.pathname.includes(objectPublicPath)) {
            filePathKey = decodeURIComponent(urlObject.pathname.substring(urlObject.pathname.indexOf(objectPublicPath) + objectPublicPath.length));
        } else {
             console.warn(`[SupabaseStorageService][${functionName}] Could not reliably extract file path from URL structure for deletion: ${fileUrl}. Expected bucket '${INVESTIGATION_MEDIA_BUCKET}' in path.`);
             return; // Cannot proceed if path is not extractable
        }
      }
    } catch (e: any) {
      console.warn(`[SupabaseStorageService][${functionName}] Invalid URL format, cannot parse for deletion: ${fileUrl}`, e.message);
      return; // Cannot proceed if URL is invalid
    }

    if (!filePathKey || filePathKey.trim() === '') {
      console.warn(`[SupabaseStorageService][${functionName}] Extracted file path is empty from URL, cannot delete: ${fileUrl}`);
      return; // Cannot proceed
    }

    console.log(`[SupabaseStorageService][${functionName}] Attempting to delete file from path: '${filePathKey}' in bucket '${INVESTIGATION_MEDIA_BUCKET}'`);
    const { data, error } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .remove([filePathKey]);

    if (error) {
      // Common error: "The resource was not found" (e.g. if already deleted or path is wrong)
      // Supabase storage client might return error with a specific status or message for "Not Found"
      if (error.message && (error.message.toLowerCase().includes("not found") || (error as any).statusCode === 404 || (error as any).statusCode === '404')) { 
           console.warn(`[SupabaseStorageService][${functionName}] File not found in bucket ${INVESTIGATION_MEDIA_BUCKET} at path '${filePathKey}', could not delete (Error: ${error.message})`);
           return; // Not a critical error if file is already gone or path was slightly off due to URL parsing
      }
      throw error; // Re-throw other errors
    }
    console.log(`[SupabaseStorageService][${functionName}] File deleted successfully from bucket ${INVESTIGATION_MEDIA_BUCKET}: ${filePathKey}`, data);
  } catch (error: any) {
    throw new Error(formatSupabaseError(error, functionName));
  }
}

    