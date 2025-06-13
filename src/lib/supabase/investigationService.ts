
// src/lib/supabase/investigationService.ts
'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Investigation, InvestigationInput } from '@/types/investigation';
import type { Comment, CommentInput } from '@/types/comment';

const INVESTIGATIONS_TABLE = 'investigations';
const COMMENTS_TABLE = 'comments';
const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia';

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Centralized error formatting and logging
const formatSupabaseError = (error: any, functionName: string): { message: string, originalError: any } => {
  let message = `Error in ${functionName}.`;
  
  console.error(`[SupabaseService][${functionName}] === ERROR DETAILS ===`);
  console.error(`[SupabaseService][${functionName}] Original error type: ${typeof error}.`);
  try {
    const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    console.error(`[SupabaseService][${functionName}] Original error (stringified, partial if too long): ${errorString.substring(0, 1000)}${errorString.length > 1000 ? '...' : ''}`);
  } catch (e) {
    console.error(`[SupabaseService][${functionName}] Could not stringify original error: ${(e as Error).message}`);
  }
  console.error(`[SupabaseService][${functionName}] Original error object:`, error);


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
    else if (supabaseError.error) message = supabaseError.error; 
    else if (supabaseError.code || supabaseError.status) message = `Supabase error (Code: ${supabaseError.code}, Status: ${supabaseError.status}). Check server logs.`;
    else message = `An unexpected error of type ${typeof error} occurred in ${functionName}. Check server logs for full details.`;
  } else {
    message = `An unexpected error of type ${typeof error} occurred in ${functionName}. Check server logs for full details.`;
  }
  
  let finalMessage = String(message).trim() || `An unexpected error occurred in ${functionName}. Check server logs.`;

  const lowerCaseMessage = finalMessage.toLowerCase();
  const lowerCaseDetails = (error?.details || '').toLowerCase();
  const isNotFoundError = lowerCaseMessage.includes("0 rows") || lowerCaseDetails.includes("0 rows") || lowerCaseMessage.includes("not found") || lowerCaseDetails.includes("not found");

  if (isNotFoundError) {
    finalMessage += " This often indicates the record was not found (possibly due to RLS policies or it was already deleted). Please check Row Level Security policies for SELECT and UPDATE on the table.";
  }
  
  console.error(`[SupabaseService][${functionName}] Client-facing error message: "${finalMessage}"`);
  console.error(`[SupabaseService][${functionName}] === END ERROR DETAILS ===`);
  return { message: finalMessage, originalError: error };
};


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber' | 'mediaUrls'>
): Promise<ServiceResponse<{ id: string; roNumber: string; creationDate: string }>> {
  const functionName = "addInvestigation";
  console.log(`[SupabaseService][${functionName}] Called with data (excluding media):`, investigationData);
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`[SupabaseService][${functionName}] Error fetching investigation count.`);
      const { message: formattedMessage } = formatSupabaseError(countError, `${functionName} - count`);
      return { success: false, error: formattedMessage };
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
      media_urls: [], 
    };

    console.log(`[SupabaseService][${functionName}] Attempting to insert investigation with payload:`, JSON.stringify(payloadToInsert, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .insert(payloadToInsert)
      .select('id, ro_number, created_at') 
      .single();

    if (insertError || !insertedData) {
      console.error(`[SupabaseService][${functionName}] Error inserting investigation into database.`);
      const { message: formattedMessage } = formatSupabaseError(insertError || new Error('No data returned from insert operation.'), `${functionName} - DB insert`);
      return { success: false, error: formattedMessage };
    }

    console.log(`[SupabaseService][${functionName}] Investigation record inserted successfully: ID: ${insertedData.id}, RO: ${insertedData.ro_number}. Returning success response.`);
    return { 
      success: true, 
      data: { 
        id: insertedData.id, 
        roNumber: insertedData.ro_number,
        creationDate: new Date(insertedData.created_at).toISOString()
      } 
    };

  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}


export async function getInvestigations(): Promise<Investigation[]> {
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
      console.error(`[SupabaseService][${functionName}] Error fetching investigations from database.`);
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
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    throw new Error(formattedMessage);
  }
}

export async function updateInvestigation(id: string, updates: Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>>): Promise<ServiceResponse<Investigation>> {
  const functionName = "updateInvestigation";
  console.log(`[SupabaseService][${functionName}] Called for id: ${id}`);
  console.log(`[SupabaseService][${functionName}] Raw updates payload received by server action:`, JSON.stringify(updates, null, 2));
  console.log(`[SupabaseService][${functionName}] Received mediaUrls for update:`, updates.mediaUrls);
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    
    const supabaseUpdates: Record<string, any> = {};
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.assignedInvestigator !== undefined) supabaseUpdates.assigned_investigator = updates.assignedInvestigator;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.occurrenceDate !== undefined) supabaseUpdates.occurrence_date = updates.occurrenceDate;
    if (updates.mediaUrls !== undefined) supabaseUpdates.media_urls = updates.mediaUrls;

    console.log(`[SupabaseService][${functionName}] Mapped Supabase updates payload:`, JSON.stringify(supabaseUpdates, null, 2));

    if (Object.keys(supabaseUpdates).length === 0) {
      console.warn(`[SupabaseService][${functionName}] No updatable fields provided for investigation ${id}. Fetching current record.`);
      const { data: currentData, error: fetchError } = await supabase
        .from(INVESTIGATIONS_TABLE)
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError || !currentData) {
         console.error(`[SupabaseService][${functionName}] Error fetching record ${id} during no-op update attempt.`);
         const { message: formattedMessage } = formatSupabaseError(fetchError || new Error(`Failed to fetch current record for ID ${id} after no-op update.`), `${functionName} - fetch no-op`);
         return { success: false, error: formattedMessage };
      }
       console.log(`[SupabaseService][${functionName}] No-op update, returning current record for ID ${id}.`);
       return { 
        success: true, 
        data: {
          id: currentData.id,
          title: currentData.title,
          description: currentData.description,
          assignedInvestigator: currentData.assigned_investigator,
          status: currentData.status,
          roNumber: currentData.ro_number,
          creationDate: new Date(currentData.created_at).toISOString(),
          occurrenceDate: currentData.occurrence_date ? new Date(currentData.occurrence_date).toISOString() : undefined,
          mediaUrls: currentData.media_urls || [],
        }
      };
    }

    console.log(`[SupabaseService][${functionName}] Attempting to update investigation ${id} in database.`);
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error(`[SupabaseService][${functionName}] Error updating investigation ${id} in database. Error object:`, error);
      const { message: formattedMessage } = formatSupabaseError(error || new Error('No data returned from update operation.'), `${functionName} - DB update`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseService][${functionName}] Investigation ${id} updated successfully. Returning success response.`);
    const resultData: Investigation = {
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
    return { success: true, data: resultData };

  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<ServiceResponse> {
  const functionName = "deleteInvestigation";
  console.log(`[SupabaseService][${functionName}] Called for id: ${id}`, mediaUrlsToDelete ? `with ${mediaUrlsToDelete.length} media URLs to delete.` : "with no media URLs to delete.");
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      console.log(`[SupabaseService][${functionName}] Attempting to delete ${mediaUrlsToDelete.length} media files from storage for investigation ${id}.`);
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
      console.error(`[SupabaseService][${functionName}] Error deleting investigation from database.`);
      const { message: formattedMessage } = formatSupabaseError(deleteDbError, `${functionName} - DB delete`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseService][${functionName}] Investigation record ${id} deleted successfully from database. Returning success response.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}


// OBSOLETE - Client-side uploads are now preferred. Kept for reference or if server-side upload is needed later.
export async function OBSOLETE_uploadFileToServerAction(formData: FormData): Promise<ServiceResponse<{ urls: string[] }>> {
  const functionName = "OBSOLETE_uploadFileToServerAction";
  console.log(`[SupabaseStorageService][${functionName}] === SERVER ACTION ENTRY POINT ===`);
  
  let files: File[] = [];
  let investigationId: string | null = null;
  let supabase;

  try {
    const cookieStore = cookies();
    supabase = createSupabaseServerClient(cookieStore);
    console.log(`[SupabaseStorageService][${functionName}] Supabase server client instantiated successfully.`);
  } catch(e: any) {
    console.error(`[SupabaseStorageService][${functionName}] Failed to instantiate Supabase client.`);
    const { message: formattedMessage } = formatSupabaseError(e, `${functionName} - client instantiation`);
    return { success: false, error: `Server setup error: ${formattedMessage}` };
  }
  
  console.log(`[SupabaseStorageService][${functionName}] Using bucket: ${INVESTIGATION_MEDIA_BUCKET}`);

  try {
    console.log(`[SupabaseStorageService][${functionName}] Attempting to parse FormData...`);
    const rawFiles = formData.getAll('mediaFiles');
    const rawInvestigationId = formData.get('investigationId');
    
    let loggableRawFilesInfo = "Not available or not files";
    if (rawFiles && rawFiles.length > 0 && rawFiles[0] instanceof File) {
        loggableRawFilesInfo = rawFiles.map((f, index) => f instanceof File ? `File ${index}: ${f.name} (${f.size} bytes, type: ${f.type})` : `Item at index ${index} is not a File`).join(', ');
    }
    const filesDetailsForLog = rawFiles.map((f, index) => {
        if (f instanceof File) return { name: f.name, size: f.size, type: f.type, index };
        return { type: typeof f, index };
    });

    console.log(`[SupabaseStorageService][${functionName}] Raw FormData content - investigationId type: ${typeof rawInvestigationId}, value: '${rawInvestigationId}', rawFiles count: ${rawFiles.length}, filesDetails:`, JSON.stringify(filesDetailsForLog));


    if (rawInvestigationId instanceof File) {
        const invalidIdError = "Invalid investigationId format: received a file instead of a string.";
        console.error(`[SupabaseStorageService][${functionName}] ${invalidIdError}`);
        return { success: false, error: invalidIdError };
    }
    investigationId = rawInvestigationId as string | null;

    const parsedFiles: File[] = [];
    if (rawFiles && rawFiles.length > 0) {
        rawFiles.forEach(file => {
            if (file instanceof File) {
                parsedFiles.push(file);
            } else {
                 console.warn(`[SupabaseStorageService][${functionName}] Encountered an item in 'mediaFiles' that is not a File object. Type: ${typeof file}. Skipping.`);
            }
        });
    }
    files = parsedFiles;

    const filesDetails = files.map((f, index) => ({ name: f.name, size: f.size, type: f.type, index }));
    const parsedInfo = {
        investigationIdReceived: typeof investigationId,
        mediaFilesReceivedCount: rawFiles.length,
        parsedInvestigationId: investigationId,
        validFilesCount: files.length,
        filesDetails: filesDetails
    };
    console.log(`[SupabaseStorageService][${functionName}] FormData parsing complete. Parsed info:`, JSON.stringify(parsedInfo));


    if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
      const invalidIdError = `Invalid or missing investigationId for upload. Must be a non-empty string. Received: '${investigationId}' (type: ${typeof investigationId})`;
      console.error(`[SupabaseStorageService][${functionName}] ${invalidIdError}`);
      return { success: false, error: invalidIdError };
    }
    
    if (files.length === 0) {
      console.warn(`[SupabaseStorageService][${functionName}] No valid files found in FormData to upload for investigation ${investigationId}.`);
      return { success: true, data: { urls: [] } }; 
    }
  
    const uploadedUrls: string[] = [];

    for (const file of files) {
      console.log(`[SupabaseStorageService][${functionName}] Processing file: Name: ${file.name}, Size: ${file.size}, Type: ${file.type} for investigation ID: ${investigationId}`);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`; 
      const filePath = `${investigationId}/${fileName}`;
      console.log(`[SupabaseStorageService][${functionName}] Constructed filePath: ${filePath}`);

      console.log(`[SupabaseStorageService][${functionName}] Attempting to upload ${file.name} to path: ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(INVESTIGATION_MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, 
        });
      
      console.log(`[SupabaseStorageService][${functionName}] Raw Supabase storage.upload response for ${filePath}: uploadData=${JSON.stringify(uploadData)}, uploadError=${JSON.stringify(uploadError)}`);

      if (uploadError) {
        console.error(`[SupabaseStorageService][${functionName}] Supabase storage.upload error for ${filePath}.`);
        const { message: formattedMessage } = formatSupabaseError(uploadError, `${functionName} - Supabase .upload for ${filePath}`);
        // Do not return immediately, try other files if possible, or decide on error strategy
        // For now, let's assume we stop on first error for simplicity of response
        return { success: false, error: `Upload error for ${file.name}: ${formattedMessage}` };
      }

      if (!uploadData || !uploadData.path) {
         const noPathError = `Supabase Storage upload error for ${filePath}: No path returned after successful-looking upload. This should not happen.`;
         console.error(`[SupabaseStorageService][${functionName}] ${noPathError}. Upload data: ${JSON.stringify(uploadData)}`);
         return { success: false, error: noPathError };
      }
      console.log(`[SupabaseStorageService][${functionName}] Upload of ${file.name} to path ${uploadData.path} appears successful. UploadData:`, uploadData);

      console.log(`[SupabaseStorageService][${functionName}] Attempting to get public URL for path: ${uploadData.path} from bucket ${INVESTIGATION_MEDIA_BUCKET}`);
      const { data: publicUrlData } = supabase.storage
         .from(INVESTIGATION_MEDIA_BUCKET)
         .getPublicUrl(uploadData.path);
      
      console.log(`[SupabaseStorageService][${functionName}] Response from getPublicUrl for ${uploadData.path}:`, JSON.stringify(publicUrlData));

      if (!publicUrlData || !publicUrlData.publicUrl) {
        const getUrlErrorMsg = `Failed to get public URL for ${file.name} after upload. Supabase path: ${uploadData.path}. Public URL Data: ${JSON.stringify(publicUrlData)}`;
        console.error(`[SupabaseStorageService][${functionName}] ${getUrlErrorMsg}.`);
        try {
          console.warn(`[SupabaseStorageService][${functionName}] Attempting to remove orphaned file: ${uploadData.path}`);
          await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([uploadData.path]);
        } catch (removeError: any) {
           console.warn(`[SupabaseStorageService][${functionName}] Failed to remove orphaned file ${uploadData.path}:`, formatSupabaseError(removeError, `${functionName} - removeOrphan`).message);
        }
        return { success: false, error: getUrlErrorMsg }; 
      }
      const publicURL = publicUrlData.publicUrl;
      console.log(`[SupabaseStorageService][${functionName}] Successfully got public URL for ${file.name}: ${publicURL}`);
      uploadedUrls.push(publicURL);
    }
    
    const successResponse = { success: true, data: { urls: uploadedUrls } };
    console.log(`[SupabaseStorageService][${functionName}] All files processed successfully. Returning success response:`, JSON.stringify(successResponse));
    return successResponse;

  } catch (error: any) { 
    console.error(`[SupabaseStorageService][${functionName}] UNHANDLED EXCEPTION in main try-catch for file processing.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    const errorResponse = { success: false, error: `Upload error (unhandled exception): ${formattedMessage}` };
    console.log(`[SupabaseStorageService][${functionName}] Returning error response from unhandled exception:`, JSON.stringify(errorResponse));
    return errorResponse;
  }
}


export async function deleteFileFromSupabaseStorageUrl(fileUrl: string, supabaseClientParam?: ReturnType<typeof createSupabaseServerClient>): Promise<ServiceResponse> {
  const functionName = "deleteFileFromSupabaseStorageUrl";
  const cookieStore = cookies(); 
  const supabase = supabaseClientParam || createSupabaseServerClient(cookieStore);

  console.log(`[SupabaseStorageService][${functionName}] Called for URL: ${fileUrl}. Using bucket: ${INVESTIGATION_MEDIA_BUCKET}`);
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
            const queryIndex = filePathKey.indexOf('?');
            if (queryIndex !== -1) {
                filePathKey = filePathKey.substring(0, queryIndex);
            }
            filePathKey = decodeURIComponent(filePathKey); 
        } else {
            const objectPublicPattern = `/object/public/${INVESTIGATION_MEDIA_BUCKET}/`;
            if (urlObject.pathname.includes(objectPublicPattern)) {
                filePathKey = urlObject.pathname.substring(urlObject.pathname.indexOf(objectPublicPattern) + objectPublicPattern.length);
                const queryIndex = filePathKey.indexOf('?');
                if (queryIndex !== -1) {
                    filePathKey = filePathKey.substring(0, queryIndex);
                }
                filePathKey = decodeURIComponent(filePathKey);
            } else {
                 const malformedUrlError = `Could not reliably extract file path key from URL: ${fileUrl} using bucket name '${INVESTIGATION_MEDIA_BUCKET}'. Pathname: ${urlObject.pathname}`;
                console.warn(`[SupabaseStorageService][${functionName}] ${malformedUrlError}`);
                return { success: false, error: malformedUrlError };
            }
        }
    } catch (e: any) {
      console.error(`[SupabaseStorageService][${functionName}] Error parsing file URL or extracting path key.`);
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
      const statusCode = (deleteStorageError as any).statusCode || (deleteStorageError as any).status;

      if (errString.includes("not found") || errString.includes("no object exists") || errMessage?.includes("not found") || statusCode === 404 || statusCode === 400 && errMessage?.includes("object not found")) {
           console.warn(`[SupabaseStorageService][${functionName}] File not found in bucket ${INVESTIGATION_MEDIA_BUCKET} at path '${filePathKey}', considered successful deletion for idempotency. (Error: ${(deleteStorageError as any).message})`);
           return { success: true }; 
      }

      console.error(`[SupabaseStorageService][${functionName}] Supabase storage deletion error for path '${filePathKey}'.`);
      const { message: formattedMessage } = formatSupabaseError(deleteStorageError, `${functionName} - Supabase .remove`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseStorageService][${functionName}] File deleted successfully from bucket ${INVESTIGATION_MEDIA_BUCKET}: ${filePathKey}`, data);
    return { success: true };
  } catch (error: any) { 
    console.error(`[SupabaseStorageService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: `Delete file error (unhandled exception): ${formattedMessage}` };
  }
}

// Comments Service Functions
export async function addComment(commentData: CommentInput): Promise<ServiceResponse<Comment>> {
  const functionName = "addComment";
  console.log(`[SupabaseService][${functionName}] Called with data:`, commentData);
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    const payloadToInsert = {
      investigation_id: commentData.investigationId,
      author_name: commentData.authorName,
      content: commentData.content,
    };

    console.log(`[SupabaseService][${functionName}] Attempting to insert comment with payload:`, JSON.stringify(payloadToInsert, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from(COMMENTS_TABLE)
      .insert(payloadToInsert)
      .select()
      .single();

    if (insertError || !insertedData) {
      console.error(`[SupabaseService][${functionName}] Error inserting comment into database.`);
      const { message: formattedMessage } = formatSupabaseError(insertError || new Error('No data returned from comment insert operation.'), `${functionName} - DB insert`);
      return { success: false, error: formattedMessage };
    }

    console.log(`[SupabaseService][${functionName}] Comment record inserted successfully: ID: ${insertedData.id}. Returning success response.`);
    return {
      success: true,
      data: {
        id: insertedData.id,
        investigationId: insertedData.investigation_id,
        authorName: insertedData.author_name,
        content: insertedData.content,
        createdAt: new Date(insertedData.created_at).toISOString(),
      },
    };

  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}

export async function getCommentsByInvestigationId(investigationId: string): Promise<ServiceResponse<Comment[]>> {
  const functionName = "getCommentsByInvestigationId";
  console.log(`[SupabaseService][${functionName}] Called for investigationId: ${investigationId}`);
  try {
    const cookieStore = cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    const { data, error } = await supabase
      .from(COMMENTS_TABLE)
      .select('*')
      .eq('investigation_id', investigationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`[SupabaseService][${functionName}] Error fetching comments for investigation ${investigationId}.`);
      const { message: formattedMessage } = formatSupabaseError(error, functionName);
      return { success: false, error: formattedMessage };
    }

    console.log(`[SupabaseService][${functionName}] Successfully fetched ${data?.length ?? 0} comments for investigation ${investigationId}.`);
    const comments: Comment[] = data ? data.map(c => ({
      id: c.id,
      investigationId: c.investigation_id,
      authorName: c.author_name,
      content: c.content,
      createdAt: new Date(c.created_at).toISOString(),
    })) : [];
    
    return { success: true, data: comments };

  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}
