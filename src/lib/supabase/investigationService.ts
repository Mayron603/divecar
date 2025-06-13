// src/lib/supabase/investigationService.ts
'use server';

import { supabase } from './client';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigation_media';

// Helper to get public URL for Supabase Storage
const getPublicUrl = (filePath: string): string | null => {
  const { data } = supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
};


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> {
  try {
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("[SupabaseService] Error fetching investigation count for R.O. number:", countError);
      throw new Error("Failed to fetch investigation count. Details: " + countError.message);
    }
    const newRoNumber = `${(count || 0) + 1}.0`;
    console.warn("[SupabaseService] Using client-side count for R.O. number generation. This may not be robust in concurrent scenarios. Current count:", count);

    const payloadToInsert = {
      title: investigationData.title,
      description: investigationData.description,
      assigned_investigator: investigationData.assignedInvestigator,
      status: investigationData.status,
      occurrence_date: investigationData.occurrenceDate,
      ro_number: newRoNumber,
      media_urls: investigationData.mediaUrls || [], // Start with passed media_urls or empty
    };
    
    console.log("[SupabaseService] Attempting to insert investigation with payload:", JSON.stringify(payloadToInsert));

    const { data: insertedData, error: insertError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .insert(payloadToInsert)
      .select()
      .single();

    if (insertError || !insertedData) {
      console.error('[SupabaseService] Error inserting investigation (step 1). Supabase error details:', insertError);
      throw new Error(`Failed to add investigation initial record. Supabase message: ${insertError?.message || 'Unknown error during insert'}`);
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
    console.error('[SupabaseService] Error in addInvestigation service:', error.message, error);
    throw new Error(error.message || 'An unexpected error occurred in addInvestigation service.');
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
    console.error("[SupabaseService] Error in getInvestigations service from Supabase: ", error.message, error);
    throw new Error(error.message || "Failed to get investigations due to an unexpected error.");
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

    console.log(`[SupabaseService] Attempting to update investigation ${id} with payload:`, JSON.stringify(supabaseUpdates));
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
    console.error("[SupabaseService] Error updating investigation in Supabase: ", error.message, error);
    throw new Error(error.message || "An unexpected error occurred in updateInvestigation service.");
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<void> {
  try {
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      const filePaths = mediaUrlsToDelete.map(url => {
        try {
          const urlObject = new URL(url);
          // More robustly extract path after the bucket name part
          const pathSegments = urlObject.pathname.split('/');
          const bucketIndex = pathSegments.indexOf(INVESTIGATION_MEDIA_BUCKET);
          if (bucketIndex !== -1 && bucketIndex < pathSegments.length -1) {
            return pathSegments.slice(bucketIndex + 1).join('/');
          }
          console.warn(`[SupabaseService] Could not reliably extract file path from URL for deletion: ${url}`);
          return null;
        } catch (e) {
          console.warn(`[SupabaseService] Invalid URL format for deletion: ${url}`, e);
          return null;
        }
      }).filter(path => path !== null) as string[];

      if (filePaths.length > 0) {
        console.log(`[SupabaseService] Attempting to delete media files from storage:`, filePaths);
        const { error: deleteStorageError } = await supabase.storage
          .from(INVESTIGATION_MEDIA_BUCKET)
          .remove(filePaths);

        if (deleteStorageError) {
          console.error('[SupabaseService] Error deleting files from Supabase Storage:', deleteStorageError.message, deleteStorageError);
          // Decide if this should be a critical error. For now, log and continue to delete DB record.
        } else {
          console.log('[SupabaseService] Successfully deleted files from Supabase Storage:', filePaths);
        }
      }
    }

    console.log(`[SupabaseService] Attempting to delete investigation record with id: ${id}`);
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
    console.error("[SupabaseService] Error deleting investigation from Supabase: ", error.message, error);
    throw new Error(error.message || "An unexpected error occurred in deleteInvestigation service.");
  }
}


// --- File Storage Specific Functions ---

export async function uploadFileToSupabaseStorage(file: File, investigationId: string): Promise<string> {
  try {
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    
    if (!investigationId || typeof investigationId !== 'string' || investigationId.trim() === '') {
        console.error('[SupabaseStorageService] Invalid investigationId for upload:', investigationId);
        throw new Error('Invalid Investigation ID provided for file upload.');
    }
    const filePath = `public/${investigationId}/${fileName}`; 

    console.log(`[SupabaseStorageService] Attempting to upload ${file.name} to path: ${filePath}`);

    const { data, error: uploadError } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, 
      });

    if (uploadError) {
      console.error(`[SupabaseStorageService] Supabase Storage upload error for ${filePath}:`, uploadError.message, uploadError);
      throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
    }

    if (!data || !data.path) {
       console.error(`[SupabaseStorageService] Supabase Storage upload error for ${filePath}: No path returned.`);
       throw new Error(`Upload failed for ${file.name}: No path returned from storage.`);
    }

    const publicURL = getPublicUrl(data.path);
    if (!publicURL) {
      console.error(`[SupabaseStorageService] Could not get public URL for ${data.path}`);
      try {
        await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([data.path]);
      } catch (removeError: any) {
        console.warn(`[SupabaseStorageService] Failed to remove orphaned file ${data.path}:`, removeError.message);
      }
      throw new Error(`Failed to get public URL for ${file.name} after upload.`);
    }
    
    console.log(`[SupabaseStorageService] Upload of ${file.name} successful. Public URL: ${publicURL}`);
    return publicURL;

  } catch (error: any) {
    // Catch any error from within the function, log it, and re-throw a simple Error
    console.error('[SupabaseStorageService] Error in uploadFileToSupabaseStorage service function:', error.message, error);
    throw new Error(error.message || 'An unexpected error occurred during file upload service operation.');
  }
}

export async function deleteFileFromSupabaseStorageUrl(fileUrl: string): Promise<void> {
 try {
    if (!fileUrl || typeof fileUrl !== 'string') {
      console.warn("[SupabaseStorageService] Invalid fileUrl provided for deletion:", fileUrl);
      return Promise.resolve();
    }
    
    let filePath = '';
    try {
      const urlObject = new URL(fileUrl);
      const pathSegments = urlObject.pathname.split('/');
      const bucketIndex = pathSegments.indexOf(INVESTIGATION_MEDIA_BUCKET);
      if (bucketIndex !== -1 && bucketIndex < pathSegments.length -1) {
        filePath = decodeURIComponent(pathSegments.slice(bucketIndex + 1).join('/')); // decode URI component for special chars
      } else {
        console.warn(`[SupabaseStorageService] Could not extract file path from URL for deletion: ${fileUrl}`);
        return;
      }
    } catch (e) {
      console.warn(`[SupabaseStorageService] Invalid URL format for deletion: ${fileUrl}`, e);
      return;
    }

    if (!filePath) {
      console.warn("[SupabaseStorageService] Extracted file path is empty, cannot delete.");
      return;
    }

    console.log(`[SupabaseStorageService] Attempting to delete file from path: ${filePath}`);
    const { data, error } = await supabase.storage
      .from(INVESTIGATION_MEDIA_BUCKET)
      .remove([filePath]);

    if (error) {
      if (error.message.includes("Not found") || (error as any).statusCode === 404) { // More specific check for not found
           console.warn(`[SupabaseStorageService] File not found, could not delete: ${filePath} (Error: ${error.message})`);
           return; 
      }
      console.error(`[SupabaseStorageService] Error deleting file ${filePath}:`, error.message, error);
      throw new Error(`Failed to delete file from storage: ${error.message}`); 
    }
    console.log(`[SupabaseStorageService] File deleted successfully: ${filePath}`, data);
  } catch (error: any) {
    console.error('[SupabaseStorageService] Error in deleteFileFromSupabaseStorageUrl service function:', error.message, error);
    throw new Error(error.message || 'An unexpected error occurred while deleting file from storage url.');
  }
}
