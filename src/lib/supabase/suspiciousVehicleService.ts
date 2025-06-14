
// src/lib/supabase/suspiciousVehicleService.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SuspiciousVehicle, SuspiciousVehicleInput } from '@/types/suspiciousVehicle';

const SUSPICIOUS_VEHICLES_TABLE = 'suspicious_vehicles';
const SUSPICIOUS_VEHICLE_PHOTOS_BUCKET = 'suspiciousvehiclephotos'; // Updated bucket name

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Centralized error formatting and logging (similar to investigationService)
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


export async function addSuspiciousVehicle(
  vehicleData: Omit<SuspiciousVehicleInput, 'id' | 'createdAt' | 'photoUrl'>
): Promise<ServiceResponse<{ id: string; createdAt: string }>> {
  const functionName = "addSuspiciousVehicle";
  console.log(`[SupabaseService][${functionName}] Called with data (excluding photo):`, vehicleData);
  try {
    const supabase = createSupabaseServerClient(); // Não passa mais cookieStore

    const payloadToInsert = {
      vehicle_model: vehicleData.vehicleModel,
      license_plate: vehicleData.licensePlate,
      suspect_name: vehicleData.suspectName,
      suspect_phone: vehicleData.suspectPhone,
      spotted_date: vehicleData.spottedDate,
      notes: vehicleData.notes,
      photo_url: null, // Initially null, will be updated after photo upload
    };

    console.log(`[SupabaseService][${functionName}] Attempting to insert suspicious vehicle with payload:`, JSON.stringify(payloadToInsert, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from(SUSPICIOUS_VEHICLES_TABLE)
      .insert(payloadToInsert)
      .select('id, created_at') 
      .single();

    if (insertError || !insertedData) {
      console.error(`[SupabaseService][${functionName}] Error inserting suspicious vehicle into database.`);
      const { message: formattedMessage } = formatSupabaseError(insertError || new Error('No data returned from insert operation.'), `${functionName} - DB insert`);
      return { success: false, error: formattedMessage };
    }

    console.log(`[SupabaseService][${functionName}] Suspicious vehicle record inserted successfully: ID: ${insertedData.id}. Returning success response.`);
    return { 
      success: true, 
      data: { 
        id: insertedData.id, 
        createdAt: new Date(insertedData.created_at).toISOString()
      } 
    };

  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}

export async function getSuspiciousVehicles(): Promise<SuspiciousVehicle[]> {
  const functionName = "getSuspiciousVehicles";
  const supabase = createSupabaseServerClient(); // Não passa mais cookieStore
  try {
    console.log(`[SupabaseService][${functionName}] Attempting to fetch suspicious vehicles.`);
    const { data, error } = await supabase
      .from(SUSPICIOUS_VEHICLES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[SupabaseService][${functionName}] Error fetching suspicious vehicles from database.`);
      const { message: formattedMessage } = formatSupabaseError(error, functionName);
      throw new Error(formattedMessage);
    }

    console.log(`[SupabaseService][${functionName}] Successfully fetched ${data?.length ?? 0} suspicious vehicles.`);
    return data ? data.map(v => ({
      id: v.id,
      createdAt: new Date(v.created_at).toISOString(),
      vehicleModel: v.vehicle_model,
      licensePlate: v.license_plate,
      suspectName: v.suspect_name,
      suspectPhone: v.suspect_phone,
      photoUrl: v.photo_url,
      spottedDate: v.spotted_date ? new Date(v.spotted_date).toISOString() : undefined,
      notes: v.notes,
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

export async function updateSuspiciousVehicle(id: string, updates: Partial<Omit<SuspiciousVehicle, 'id' | 'createdAt'>>): Promise<ServiceResponse<SuspiciousVehicle>> {
  const functionName = "updateSuspiciousVehicle";
  console.log(`[SupabaseService][${functionName}] Called for id: ${id}`);
  console.log(`[SupabaseService][${functionName}] Raw updates payload received:`, JSON.stringify(updates, null, 2));
  try {
    const supabase = createSupabaseServerClient(); // Não passa mais cookieStore
    
    const supabaseUpdates: Record<string, any> = {};
    if (updates.vehicleModel !== undefined) supabaseUpdates.vehicle_model = updates.vehicleModel;
    if (updates.licensePlate !== undefined) supabaseUpdates.license_plate = updates.licensePlate;
    if (updates.suspectName !== undefined) supabaseUpdates.suspect_name = updates.suspectName;
    if (updates.suspectPhone !== undefined) supabaseUpdates.suspect_phone = updates.suspectPhone;
    if (updates.photoUrl !== undefined) supabaseUpdates.photo_url = updates.photoUrl;
    if (updates.spottedDate !== undefined) supabaseUpdates.spotted_date = updates.spottedDate;
    if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;


    console.log(`[SupabaseService][${functionName}] Mapped Supabase updates payload:`, JSON.stringify(supabaseUpdates, null, 2));

    if (Object.keys(supabaseUpdates).length === 0) {
      console.warn(`[SupabaseService][${functionName}] No updatable fields provided for suspicious vehicle ${id}. Fetching current record.`);
      const { data: currentData, error: fetchError } = await supabase
        .from(SUSPICIOUS_VEHICLES_TABLE)
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
          createdAt: new Date(currentData.created_at).toISOString(),
          vehicleModel: currentData.vehicle_model,
          licensePlate: currentData.license_plate,
          suspectName: currentData.suspect_name,
          suspectPhone: currentData.suspect_phone,
          photoUrl: currentData.photo_url,
          spottedDate: currentData.spotted_date ? new Date(currentData.spotted_date).toISOString() : undefined,
          notes: currentData.notes,
        }
      };
    }

    console.log(`[SupabaseService][${functionName}] Attempting to update suspicious vehicle ${id} in database.`);
    const { data, error } = await supabase
      .from(SUSPICIOUS_VEHICLES_TABLE)
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error(`[SupabaseService][${functionName}] Error updating suspicious vehicle ${id} in database. Error object:`, error);
      const { message: formattedMessage } = formatSupabaseError(error || new Error('No data returned from update operation.'), `${functionName} - DB update`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseService][${functionName}] Suspicious vehicle ${id} updated successfully. Returning success response.`);
    const resultData: SuspiciousVehicle = {
      id: data.id,
      createdAt: new Date(data.created_at).toISOString(),
      vehicleModel: data.vehicle_model,
      licensePlate: data.license_plate,
      suspectName: data.suspect_name,
      suspectPhone: data.suspect_phone,
      photoUrl: data.photo_url,
      spottedDate: data.spotted_date ? new Date(data.spotted_date).toISOString() : undefined,
      notes: data.notes,
    };
    return { success: true, data: resultData };

  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}

export async function deleteFileFromSupabaseStorageUrl(fileUrl: string, supabaseClientParam?: ReturnType<typeof createSupabaseServerClient>): Promise<ServiceResponse> {
  const functionName = "deleteFileFromSupabaseStorageUrl (SuspiciousVehicles)";
  const supabase = supabaseClientParam || createSupabaseServerClient(); // Não passa mais cookieStore

  console.log(`[SupabaseStorageService][${functionName}] Called for URL: ${fileUrl}. Using bucket: ${SUSPICIOUS_VEHICLE_PHOTOS_BUCKET}`);
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
        const bucketNameIndex = pathSegments.findIndex(segment => segment === SUSPICIOUS_VEHICLE_PHOTOS_BUCKET);

        if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length -1) {
            filePathKey = pathSegments.slice(bucketNameIndex + 1).join('/');
            const queryIndex = filePathKey.indexOf('?');
            if (queryIndex !== -1) {
                filePathKey = filePathKey.substring(0, queryIndex);
            }
            filePathKey = decodeURIComponent(filePathKey); 
        } else {
            const objectPublicPattern = `/object/public/${SUSPICIOUS_VEHICLE_PHOTOS_BUCKET}/`;
            if (urlObject.pathname.includes(objectPublicPattern)) {
                filePathKey = urlObject.pathname.substring(urlObject.pathname.indexOf(objectPublicPattern) + objectPublicPattern.length);
                const queryIndex = filePathKey.indexOf('?');
                if (queryIndex !== -1) {
                    filePathKey = filePathKey.substring(0, queryIndex);
                }
                filePathKey = decodeURIComponent(filePathKey);
            } else {
                const malformedUrlError = `Could not reliably extract file path key from URL: ${fileUrl} using bucket name '${SUSPICIOUS_VEHICLE_PHOTOS_BUCKET}'. Pathname: ${urlObject.pathname}`;
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

    console.log(`[SupabaseStorageService][${functionName}] Attempting to delete file from path: '${filePathKey}' in bucket '${SUSPICIOUS_VEHICLE_PHOTOS_BUCKET}'`);
    const { data, error: deleteStorageError } = await supabase.storage
      .from(SUSPICIOUS_VEHICLE_PHOTOS_BUCKET) 
      .remove([filePathKey]); 

    if (deleteStorageError) {
      const errString = JSON.stringify(deleteStorageError).toLowerCase();
      const errMessage = (deleteStorageError as any).message?.toLowerCase();
      const statusCode = (deleteStorageError as any).statusCode || (deleteStorageError as any).status;

      if (errString.includes("not found") || errString.includes("no object exists") || errMessage?.includes("not found") || statusCode === 404 || statusCode === 400 && errMessage?.includes("object not found")) {
           console.warn(`[SupabaseStorageService][${functionName}] File not found in bucket ${SUSPICIOUS_VEHICLE_PHOTOS_BUCKET} at path '${filePathKey}', considered successful deletion for idempotency. (Error: ${(deleteStorageError as any).message})`);
           return { success: true }; 
      }

      console.error(`[SupabaseStorageService][${functionName}] Supabase storage deletion error for path '${filePathKey}'.`);
      const { message: formattedMessage } = formatSupabaseError(deleteStorageError, `${functionName} - Supabase .remove`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseStorageService][${functionName}] File deleted successfully from bucket ${SUSPICIOUS_VEHICLE_PHOTOS_BUCKET}: ${filePathKey}`, data);
    return { success: true };
  } catch (error: any) { 
    console.error(`[SupabaseStorageService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: `Delete file error (unhandled exception): ${formattedMessage}` };
  }
}


export async function deleteSuspiciousVehicle(id: string, photoUrlToDelete?: string): Promise<ServiceResponse> {
  const functionName = "deleteSuspiciousVehicle";
  console.log(`[SupabaseService][${functionName}] Called for id: ${id}`, photoUrlToDelete ? `with photo URL ${photoUrlToDelete} to delete.` : "with no photo URL to delete.");
  try {
    const supabase = createSupabaseServerClient(); // Não passa mais cookieStore
    if (photoUrlToDelete) {
      console.log(`[SupabaseService][${functionName}] Attempting to delete photo file from storage for vehicle ${id}. URL: ${photoUrlToDelete}`);
      const deletePhotoResponse = await deleteFileFromSupabaseStorageUrl(photoUrlToDelete, supabase);
      if (!deletePhotoResponse.success) {
        console.warn(`[SupabaseService][${functionName}] Failed to delete photo file ${photoUrlToDelete} during vehicle deletion: ${deletePhotoResponse.error}`);
      } else {
        console.log(`[SupabaseService][${functionName}] Successfully processed deletion for photo file ${photoUrlToDelete}.`);
      }
    }

    console.log(`[SupabaseService][${functionName}] Attempting to delete suspicious vehicle record with id: ${id} from database.`);
    const { error: deleteDbError } = await supabase
      .from(SUSPICIOUS_VEHICLES_TABLE)
      .delete()
      .eq('id', id);

    if (deleteDbError) {
      console.error(`[SupabaseService][${functionName}] Error deleting suspicious vehicle from database.`);
      const { message: formattedMessage } = formatSupabaseError(deleteDbError, `${functionName} - DB delete`);
      return { success: false, error: formattedMessage };
    }
    console.log(`[SupabaseService][${functionName}] Suspicious vehicle record ${id} deleted successfully from database. Returning success response.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[SupabaseService][${functionName}] UNHANDLED EXCEPTION in main try-catch.`);
    const { message: formattedMessage } = formatSupabaseError(error, functionName);
    return { success: false, error: formattedMessage };
  }
}
