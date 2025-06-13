// src/lib/supabase/investigationService.ts
'use server';

import { supabase } from './client';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigationmedia'; // <--- ATUALIZADO AQUI

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


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> {
  console.log("[SupabaseService] addInvestigation called with data:", JSON.stringify(investigationData, null, 2));
  try {
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("[SupabaseService] Error fetching investigation count for R.O. number:", countError);
      throw new Error(`Failed to fetch investigation count. Supabase message: ${countError.message}`);
    }
    const newRoNumber = `${(count || 0) + 1}.0`;
    console.warn(`[SupabaseService] Using client-side count for R.O. number generation. This may not be robust in concurrent scenarios. Current count: ${count}, New R.O.: ${newRoNumber}`);

    const payloadToInsert = {
      title: investigationData.title,
      description: investigationData.description,
      assigned_investigator: investigationData.assignedInvestigator, // snake_case for Supabase
      status: investigationData.status,
      occurrence_date: investigationData.occurrenceDate, // snake_case for Supabase
      ro_number: newRoNumber,
      media_urls: investigationData.mediaUrls || [],
    };
    
    console.log("[SupabaseService] Attempting to insert investigation with payload:", JSON.stringify(payloadToInsert, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .insert(payloadToInsert)
      .select()
      .single();

    if (insertError || !insertedData) {
      console.error('[SupabaseService] Error inserting investigation (step 1). Supabase error details:', insertError);
      // Construct a more informative error message
      let errorMessage = 'Failed to add investigation initial record.';
      if (insertError) {
        errorMessage += ` Supabase message: ${insertError.message}`;
        if ((insertError as any).details) errorMessage += ` Details: ${(insertError as any).details}`;
        if ((insertError as any).hint) errorMessage += ` Hint: ${(insertError as any).hint}`;
      }
      throw new Error(errorMessage);
    }
    
    console.log("[SupabaseService] Investigation record inserted successfully:", insertedData.id);

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
    console.error('[SupabaseService] FATAL ERROR in addInvestigation service:', error);
    // Ensure the re-thrown error message is useful and a simple string
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || 'An unexpected error occurred in addInvestigation service.');
  }
}


export async function getInvestigations(): Promise<Investigation[]> {
  try {
    console.log("[SupabaseService] Attempting to fetch investigations.");
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseService] Error fetching investigations. Supabase error:', error);
      throw new Error(`Failed to fetch investigations. Supabase: ${error.message}`);
    }
    console.log(`[SupabaseService] Successfully fetched ${data.length} investigations.`);
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
    console.error("[SupabaseService] FATAL ERROR in getInvestigations service from Supabase: ", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || "Failed to get investigations due to an unexpected error.");
  }
}

export async function updateInvestigation(id: string, updates: Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>>): Promise<Investigation> {
  try {
    const supabaseUpdates: Record<string, any> = {};
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.assignedInvestigator !== undefined) supabaseUpdates.assigned_investigator = updates.assignedInvestigator;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.occurrenceDate !== undefined) supabaseUpdates.occurrence_date = updates.occurrenceDate;
    if (updates.mediaUrls !== undefined) supabaseUpdates.media_urls = updates.mediaUrls;

    console.log(`[SupabaseService] Attempting to update investigation ${id} with payload:`, JSON.stringify(supabaseUpdates, null, 2));
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[SupabaseService] Error updating investigation. Supabase error details:', error);
      throw new Error(`Failed to update investigation. Supabase message: ${error?.message || 'Unknown error during update'}`);
    }
    
    console.log(`[SupabaseService] Investigation ${id} updated successfully.`);
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
    console.error("[SupabaseService] FATAL ERROR updating investigation in Supabase: ", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || "An unexpected error occurred in updateInvestigation service.");
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<void> {
  console.log(`[SupabaseService] deleteInvestigation called for id: ${id}`, mediaUrlsToDelete);
  try {
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      console.log(`[SupabaseService] Attempting to delete ${mediaUrlsToDelete.length} media files from storage for investigation ${id}.`);
      const deletePromises = mediaUrlsToDelete.map(url => deleteFileFromSupabaseStorageUrl(url));
      
      const results = await Promise.allSettled(deletePromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`[SupabaseService] Failed to delete media file ${mediaUrlsToDelete[index]} during investigation deletion:`, result.reason);
          // Non-critical, log and continue to delete DB record.
        } else {
          console.log(`[SupabaseService] Successfully processed deletion for media file ${mediaUrlsToDelete[index]}.`);
        }
      });
    }

    console.log(`[SupabaseService] Attempting to delete investigation record with id: ${id} from database.`);
    const { error: deleteDbError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .delete()
      .eq('id', id);

    if (deleteDbError) {
      console.error('[SupabaseService] Error deleting investigation from database. Supabase error details:', deleteDbError);
      throw new Error(`Failed to delete investigation from database. Supabase message: ${deleteDbError?.message || 'Unknown error during DB delete'}`);
    }
    console.log(`[SupabaseService] Investigation record ${id} deleted successfully from database.`);
  } catch (error: any) {
    console.error("[SupabaseService] FATAL ERROR deleting investigation from Supabase: ", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || "An unexpected error occurred in deleteInvestigation service.");
  }
}


// --- File Storage Specific Functions ---

export async function uploadFileToSupabaseStorage(file: File, investigationId: string): Promise<string> {
  console.log(`[SupabaseStorageService] uploadFileToSupabaseStorage called for file: ${file.name}, investigationId: ${investigationId}`);
  try {
    if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
        const invalidIdError = '[SupabaseStorageService] Invalid investigationId for upload. Must be a non-empty string.';
        console.error(invalidIdError, 'Received:', investigationId);
        throw new Error(invalidIdError);
    }

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `public/${investigationId}/${fileName}`; 

    console.log(`[SupabaseStorageService] Attempting to upload ${file.name} to path: ${filePath} in bucket ${INVESTIGATION_MEDIA_BUCKET}`);

    const { data, error: uploadError } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, 
      });

    if (uploadError) {
      console.error(`[SupabaseStorageService] Supabase Storage upload error for ${filePath}:`, uploadError);
      throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
    }

    if (!data || !data.path) {
       const noPathError = `[SupabaseStorageService] Supabase Storage upload error for ${filePath}: No path returned.`;
       console.error(noPathError);
       throw new Error(noPathError);
    }

    const publicURL = getPublicUrl(data.path);
    if (!publicURL) {
      console.error(`[SupabaseStorageService] Could not get public URL for ${data.path} in bucket ${INVESTIGATION_MEDIA_BUCKET}. Attempting to remove orphaned file.`);
      try {
        await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([data.path]);
        console.log(`[SupabaseStorageService] Orphaned file ${data.path} removed successfully.`);
      } catch (removeError: any) {
        console.warn(`[SupabaseStorageService] Failed to remove orphaned file ${data.path} from bucket ${INVESTIGATION_MEDIA_BUCKET}:`, removeError.message);
      }
      throw new Error(`Failed to get public URL for ${file.name} after upload.`);
    }
    
    console.log(`[SupabaseStorageService] Upload of ${file.name} successful. Public URL: ${publicURL}`);
    return publicURL;

  } catch (error: any) {
    console.error(`[SupabaseStorageService] FATAL ERROR during uploadFileToSupabaseStorage. Original error:`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || 'An unexpected error occurred during file upload service operation.');
  }
}

export async function deleteFileFromSupabaseStorageUrl(fileUrl: string): Promise<void> {
  console.log(`[SupabaseStorageService] deleteFileFromSupabaseStorageUrl called for URL: ${fileUrl}`);
 try {
    if (!fileUrl || typeof fileUrl !== 'string') {
      console.warn("[SupabaseStorageService] Invalid fileUrl provided for deletion:", fileUrl);
      return Promise.resolve();
    }
    
    let filePath = '';
    try {
      const urlObject = new URL(fileUrl);
      // Path extraction logic: /object/public/bucket_name/actual_file_path...
      const pathSegments = urlObject.pathname.split('/'); 
      const objectPublicIndex = pathSegments.indexOf('public'); // Supabase public URLs often look like /object/public/bucket_name/...
      
      if (objectPublicIndex !== -1 && pathSegments.length > objectPublicIndex + 2) {
        // The segment after 'public' should be the bucket name, and then the rest is the file path.
        const bucketNameInUrl = pathSegments[objectPublicIndex + 1];
        if (bucketNameInUrl !== INVESTIGATION_MEDIA_BUCKET) {
            console.warn(`[SupabaseStorageService] Mismatch: Bucket name in URL ('${bucketNameInUrl}') does not match expected bucket ('${INVESTIGATION_MEDIA_BUCKET}'). Path extraction might be incorrect for: ${fileUrl}`);
            // Fallback or more generic extraction might be needed if URL structure varies widely.
            // For now, let's assume a structure that includes the bucket name explicitly after /public/
        }
        filePath = decodeURIComponent(pathSegments.slice(objectPublicIndex + 2).join('/'));
      } else {
        console.warn(`[SupabaseStorageService] Could not reliably extract file path from URL structure for deletion: ${fileUrl}. Expected '/object/public/${INVESTIGATION_MEDIA_BUCKET}/...' structure.`);
        return;
      }
    } catch (e) {
      console.warn(`[SupabaseStorageService] Invalid URL format for deletion, cannot parse: ${fileUrl}`, e);
      return;
    }

    if (!filePath) {
      console.warn("[SupabaseStorageService] Extracted file path is empty from URL, cannot delete:", fileUrl);
      return;
    }

    console.log(`[SupabaseStorageService] Attempting to delete file from path: '${filePath}' in bucket '${INVESTIGATION_MEDIA_BUCKET}'`);
    const { data, error } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .remove([filePath]);

    if (error) {
      // Common error: "The resource was not found" (e.g. if already deleted or path is wrong)
      if (error.message && (error.message.includes("Not found") || error.message.includes("The resource was not found"))) { 
           console.warn(`[SupabaseStorageService] File not found in bucket ${INVESTIGATION_MEDIA_BUCKET} at path '${filePath}', could not delete (Error: ${error.message})`);
           return; // Not a critical error if file is already gone
      }
      console.error(`[SupabaseStorageService] Error deleting file '${filePath}' from bucket ${INVESTIGATION_MEDIA_BUCKET}:`, error);
      throw new Error(`Failed to delete file from storage: ${error.message}`); 
    }
    console.log(`[SupabaseStorageService] File deleted successfully from bucket ${INVESTIGATION_MEDIA_BUCKET}: ${filePath}`, data);
  } catch (error: any) {
    console.error('[SupabaseStorageService] FATAL ERROR in deleteFileFromSupabaseStorageUrl service function:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || 'An unexpected error occurred while deleting file from storage url.');
  }
}
