// src/lib/supabase/investigationService.ts
'use server';

import { supabase } from './client';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const INVESTIGATIONS_TABLE = 'investigations';
const INVESTIGATION_MEDIA_BUCKET = 'investigation_media'; // Ensure this bucket exists and is public or has correct policies

// Helper to get public URL for Supabase Storage
// Note: Ensure your bucket (INVESTIGATION_MEDIA_BUCKET) is configured for public access or use signed URLs for private buckets.
// For simplicity, this assumes public URLs.
const getPublicUrl = (filePath: string): string | null => {
  const { data } = supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
};


export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'id' | 'creationDate' | 'roNumber'>
): Promise<Investigation> {
  try {
    // Generate R.O. Number (client-side count, with caveats)
    const { count, error: countError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("Error fetching investigation count for R.O. number:", countError);
      throw new Error("Failed to fetch investigation count.");
    }
    const newRoNumber = `${(count || 0) + 1}.0`;
    console.warn("Using client-side count for R.O. number generation. This may not be robust in concurrent scenarios.");


    // 1. Insert investigation data (without mediaUrls initially)
    const payloadToInsert = {
      ...investigationData,
      ro_number: newRoNumber,
      // Supabase handles created_at automatically
      // occurrence_date is already in ISO string format if provided
      media_urls: [], // Start with empty media_urls
    };
    
    const { data: insertedData, error: insertError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .insert(payloadToInsert)
      .select()
      .single();

    if (insertError || !insertedData) {
      console.error('Error inserting investigation (step 1):', insertError);
      throw new Error('Failed to add investigation initial record.');
    }
    
    // If there are media files to upload (passed in investigationData.mediaFiles for temporary holding)
    // This part is a bit tricky if files are passed directly. The page component should handle upload first.
    // For now, assuming mediaUrls are pre-uploaded or handled by the calling component.
    // If investigationData contained temporary file objects, they need to be uploaded and URLs obtained.
    // This service function will now assume media_urls are provided if they exist from the client.
    
    // If mediaUrls were part of the initial investigationData (e.g. from client side upload that already happened)
    // and we need to update the record with them (if the model changes to allow this flow)
    if (investigationData.mediaUrls && investigationData.mediaUrls.length > 0) {
      const { data: updatedData, error: updateMediaError } = await supabase
        .from(INVESTIGATIONS_TABLE)
        .update({ media_urls: investigationData.mediaUrls })
        .eq('id', insertedData.id)
        .select()
        .single();
      
      if (updateMediaError || !updatedData) {
        console.error('Error updating investigation with media URLs (step 2):', updateMediaError);
        // Not throwing error here, as main record is created. Log and proceed.
      } else {
         return {
            id: updatedData.id,
            title: updatedData.title,
            description: updatedData.description,
            assignedInvestigator: updatedData.assigned_investigator,
            status: updatedData.status,
            roNumber: updatedData.ro_number,
            creationDate: new Date(updatedData.created_at).toISOString(),
            occurrenceDate: updatedData.occurrence_date ? new Date(updatedData.occurrence_date).toISOString() : undefined,
            mediaUrls: updatedData.media_urls || [],
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

  } catch (error) {
    console.error('Error in addInvestigation service:', error);
    throw error; // Re-throw the error to be caught by the caller
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
    // Map Investigation type fields to Supabase column names if necessary
    const supabaseUpdates: Record<string, any> = {};
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.assignedInvestigator !== undefined) supabaseUpdates.assigned_investigator = updates.assignedInvestigator;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.occurrenceDate !== undefined) supabaseUpdates.occurrence_date = updates.occurrenceDate; // Assumes ISO string
    if (updates.mediaUrls !== undefined) supabaseUpdates.media_urls = updates.mediaUrls;
    // roNumber and creationDate are not typically updated this way

    const { data, error } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating investigation:', error);
      throw new Error('Failed to update investigation.');
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

  } catch (error) {
    console.error("Error updating investigation in Supabase: ", error);
    throw new Error("Failed to update investigation.");
  }
}

export async function deleteInvestigation(id: string, mediaUrlsToDelete?: string[]): Promise<void> {
  try {
    // First, delete associated files from Supabase Storage if URLs are provided
    if (mediaUrlsToDelete && mediaUrlsToDelete.length > 0) {
      const filePaths = mediaUrlsToDelete.map(url => {
        // Extract file path from public URL. This is a bit fragile and depends on URL structure.
        // Assumes URL is like: SUPABASE_URL/storage/v1/object/public/BUCKET_NAME/FILE_PATH
        // Example: https://xyz.supabase.co/storage/v1/object/public/investigation_media/investigations_media/uuid/filename.png
        // The path stored and used for deletion should be the part after BUCKET_NAME/
        try {
          const urlObject = new URL(url);
          // Path part after /BUCKET_NAME/
          // e.g. /storage/v1/object/public/investigation_media/path/to/file.png -> path/to/file.png
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
        const { data, error: deleteStorageError } = await supabase.storage
          .from(INVESTIGATION_MEDIA_BUCKET)
          .remove(filePaths);

        if (deleteStorageError) {
          console.error('Error deleting files from Supabase Storage:', deleteStorageError);
          // Don't throw, proceed to delete Firestore record, but log the error
        } else {
          console.log('Successfully deleted files from Supabase Storage:', filePaths, data);
        }
      }
    }

    // Then, delete the investigation record from the database
    const { error: deleteDbError } = await supabase
      .from(INVESTIGATIONS_TABLE)
      .delete()
      .eq('id', id);

    if (deleteDbError) {
      console.error('Error deleting investigation from database:', deleteDbError);
      throw new Error('Failed to delete investigation from database.');
    }
  } catch (error) {
    console.error("Error deleting investigation from Supabase: ", error);
    throw new Error("Failed to delete investigation.");
  }
}


// --- File Storage Specific Functions ---

/**
 * Uploads a file to Supabase Storage.
 * @param file The file to upload.
 * @param investigationId The ID of the investigation this file belongs to.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export async function uploadFileToSupabaseStorage(file: File, investigationId: string): Promise<string> {
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`; // Sanitize and make unique
  const filePath = `public/${investigationId}/${fileName}`; // Store in a folder per investigation

  console.log(`[SupabaseStorageService] Attempting to upload ${file.name} to path: ${filePath}`);

  const { data, error: uploadError } = await supabase.storage
    .from(INVESTIGATION_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // true to overwrite, false to error if exists (consider this)
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
    // Attempt to delete the orphaned file if URL retrieval fails
    await supabase.storage.from(INVESTIGATION_MEDIA_BUCKET).remove([data.path]);
    throw new Error(`Failed to get public URL for ${file.name} after upload.`);
  }
  
  console.log(`[SupabaseStorageService] Upload of ${file.name} successful. Public URL: ${publicURL}`);
  return publicURL;
}


/**
 * Deletes a file from Supabase Storage using its full public URL.
 * @param fileUrl The full public URL of the file in Supabase Storage.
 * @returns A promise that resolves when the file is deleted.
 */
export async function deleteFileFromSupabaseStorageUrl(fileUrl: string): Promise<void> {
  if (!fileUrl || typeof fileUrl !== 'string') {
    console.warn("[SupabaseStorageService] Invalid fileUrl provided for deletion:", fileUrl);
    return Promise.resolve();
  }
  
  let filePath = '';
  try {
    const urlObject = new URL(fileUrl);
    // Path part after /BUCKET_NAME/
    // e.g., /storage/v1/object/public/investigation_media/public/uuid/filename.png -> public/uuid/filename.png
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
    // It's common for "Not found" errors if the file was already deleted or path is wrong.
    // Check for error.message or error.status for specific codes if needed.
    if (error.message.includes("Not found")) {
         console.warn(`[SupabaseStorageService] File not found, could not delete: ${filePath} (Error: ${error.message})`);
         return; // Not a critical error if file is already gone.
    }
    console.error(`[SupabaseStorageService] Error deleting file ${filePath}:`, error);
    throw error; // Re-throw other errors
  }
  console.log(`[SupabaseStorageService] File deleted successfully: ${filePath}`, data);
}
