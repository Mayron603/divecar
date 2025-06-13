// src/lib/supabase/investigationService.ts
'use server';

import { supabase } from './client';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigation_media'; // Ensure this bucket exists and is public or has correct policies

// Helper to get public URL for Supabase Storage
const getPublicUrl = (filePath: string): string | null => {
  const { data } = supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
};


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> {
  try {
    // Generate R.O. Number
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("Error fetching investigation count for R.O. number:", countError);
      throw new Error("Failed to fetch investigation count. Details: " + countError.message);
    }
    const newRoNumber = `${(count || 0) + 1}.0`;
    console.warn("Using client-side count for R.O. number generation. This may not be robust in concurrent scenarios. Current count:", count);

    // 1. Insert investigation data (without mediaUrls initially)
    // Ensure payload keys match Supabase column names (snake_case)
    const payloadToInsert = {
      title: investigationData.title,
      description: investigationData.description,
      assigned_investigator: investigationData.assignedInvestigator, // camelCase to snake_case
      status: investigationData.status,
      occurrence_date: investigationData.occurrenceDate, // camelCase to snake_case (optional)
      ro_number: newRoNumber,
      media_urls: [], // Start with empty media_urls
    };
    
    console.log("[SupabaseService] Attempting to insert investigation with payload:", payloadToInsert);

    const { data: insertedData, error: insertError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .insert(payloadToInsert)
      .select()
      .single();

    if (insertError || !insertedData) {
      console.error('Error inserting investigation (step 1). Supabase error details:', insertError);
      throw new Error(`Failed to add investigation initial record. Supabase message: ${insertError?.message || 'Unknown error'}`);
    }
    
    // This part for updating mediaUrls if they were somehow pre-uploaded and passed in investigationData
    // is currently not the primary flow as uploads happen after initial record creation.
    // However, if investigationData.mediaUrls comes populated, this attempts to update.
    if (investigationData.mediaUrls && investigationData.mediaUrls.length > 0) {
      console.log("[SupabaseService] Initial investigationData contained mediaUrls, attempting to update record:", investigationData.mediaUrls);
      const { data: updatedDataWithMedia, error: updateMediaError } = await supabase
        .from(INVESTIGATIONS_TABLE)
        .update({ media_urls: investigationData.mediaUrls })
        .eq('id', insertedData.id)
        .select()
        .single();
      
      if (updateMediaError || !updatedDataWithMedia) {
        console.error('Error updating investigation with pre-existing media URLs (step 2):', updateMediaError);
        // Not throwing error here, as main record is created. Log and proceed.
      } else {
         return {
            id: updatedDataWithMedia.id,
            title: updatedDataWithMedia.title,
            description: updatedDataWithMedia.description,
            assignedInvestigator: updatedDataWithMedia.assigned_investigator,
            status: updatedDataWithMedia.status,
            roNumber: updatedDataWithMedia.ro_number,
            creationDate: new Date(updatedDataWithMedia.created_at).toISOString(),
            occurrenceDate: updatedDataWithMedia.occurrence_date ? new Date(updatedDataWithMedia.occurrence_date).toISOString() : undefined,
            mediaUrls: updatedDataWithMedia.media_urls || [],
          };
      }
    }

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
    console.error('Error in addInvestigation service:', error);
    // Ensure the re-thrown error message is useful
    throw new Error(error.message || 'An unexpected error occurred in addInvestigation service.');
  }
}


export async function getInvestigations(): Promise<Investigation[]> {
  try {
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investigations:', error);
      throw error;
    }

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
  } catch (error) {
    console.error("Error getting investigations from Supabase: ", error);
    throw new Error("Failed to get investigations.");
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

    console.log(`[SupabaseService] Attempting to update investigation ${id} with payload:`, supabaseUpdates);
    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating investigation. Supabase error details:', error);
      throw new Error(`Failed to update investigation. Supabase message: ${error?.message || 'Unknown error'}`);
    }
    
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
    console.error("Error updating investigation in Supabase: ", error);
    throw new Error(error.message || "An unexpected error occurred in updateInvestigation service.");
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<void> {
  try {
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      const filePaths = mediaUrlsToDelete.map(url => {
        try {
          const urlObject = new URL(url);
          const parts = urlObject.pathname.split(`/${INVESTIGATION_MEDIA_BUCKET}/`);
          if (parts.length > 1) {
            return parts[1];
          }
          console.warn(`Could not extract file path from URL for deletion: ${url}`);
          return null;
        } catch (e) {
          console.warn(`Invalid URL format for deletion: ${url}`, e);
          return null;
        }
      }).filter(path => path !== null) as string[];

      if (filePaths.length > 0) {
        console.log(`[SupabaseService] Attempting to delete media files from storage:`, filePaths);
        const { data, error: deleteStorageError } = await supabase.storage
          .from(INVESTIGATION_MEDIA_BUCKET)
          .remove(filePaths);

        if (deleteStorageError) {
          console.error('Error deleting files from Supabase Storage:', deleteStorageError);
        } else {
          console.log('Successfully deleted files from Supabase Storage:', filePaths, data);
        }
      }
    }

    console.log(`[SupabaseService] Attempting to delete investigation record with id: ${id}`);
    const { error: deleteDbError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .delete()
      .eq('id', id);

    if (deleteDbError) {
      console.error('Error deleting investigation from database. Supabase error details:', deleteDbError);
      throw new Error(`Failed to delete investigation from database. Supabase message: ${deleteDbError?.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error("Error deleting investigation from Supabase: ", error);
    throw new Error(error.message || "An unexpected error occurred in deleteInvestigation service.");
  }
}


// --- File Storage Specific Functions ---

export async function uploadFileToSupabaseStorage(file: File, investigationId: string): Promise<string> {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const filePath = `public/${investigationId}/${fileName}`; 

  console.log(`[SupabaseStorageService] Attempting to upload ${file.name} to path: ${filePath}`);

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
     console.error(`[SupabaseStorageService] Supabase Storage upload error for ${filePath}: No path returned.`);
     throw new Error(`Upload failed for ${file.name}: No path returned from storage.`);
  }

  const publicURL = getPublicUrl(data.path);
  if (!publicURL) {
    console.error(`[SupabaseStorageService] Could not get public URL for ${data.path}`);
    await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([data.path]);
    throw new Error(`Failed to get public URL for ${file.name} after upload.`);
  }
  
  console.log(`[SupabaseStorageService] Upload of ${file.name} successful. Public URL: ${publicURL}`);
  return publicURL;
}

export async function deleteFileFromSupabaseStorageUrl(fileUrl: string): Promise<void> {
  if (!fileUrl || typeof fileUrl !== 'string') {
    console.warn("[SupabaseStorageService] Invalid fileUrl provided for deletion:", fileUrl);
    return Promise.resolve();
  }
  
  let filePath = '';
  try {
    const urlObject = new URL(fileUrl);
    const parts = urlObject.pathname.split(`/${INVESTIGATION_MEDIA_BUCKET}/`);
    if (parts.length > 1) {
      filePath = parts[1];
    } else {
      console.warn(`[SupabaseStorageService] Could not extract file path from URL for deletion: ${fileUrl}`);
      return;
    }
  } catch (e) {
    console.warn(`[SupabaseStorageService] Invalid URL format for deletion: ${fileUrl}`, e);
    return;
  }

  if (!filePath) return;

  console.log(`[SupabaseStorageService] Attempting to delete file from path: ${filePath}`);
  const { data, error } = await supabase.storage
    .from(INVESTIGATION_MEDIA_BUCKET)
    .remove([filePath]);

  if (error) {
    if (error.message.includes("Not found")) {
         console.warn(`[SupabaseStorageService] File not found, could not delete: ${filePath} (Error: ${error.message})`);
         return; 
    }
    console.error(`[SupabaseStorageService] Error deleting file ${filePath}:`, error);
    throw error; 
  }
  console.log(`[SupabaseStorageService] File deleted successfully: ${filePath}`, data);
}
