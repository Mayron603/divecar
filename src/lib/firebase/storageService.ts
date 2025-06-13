
// src/lib/firebase/storageService.ts
import { app } from './config';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file should be saved (e.g., "investigations/investigationId/filename.jpg").
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export async function uploadFileToStorage(file: File, path: string): Promise<string> {
  const fileRef = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(fileRef, file);

  console.log(`[StorageService] Attempting to upload ${file.name} to path: ${path}`);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`[StorageService] Upload of ${file.name} is ${progress.toFixed(2)}% done`);
      },
      (error) => {
        console.error(`[StorageService] Firebase Storage upload error for ${path}:`, {
          code: error.code,
          message: error.message,
          serverResponse: error.serverResponse,
          name: error.name,
        });
        
        let description = "Ocorreu um erro desconhecido durante o upload.";
        switch (error.code) {
          case 'storage/unauthorized':
            description = "Sem permissão para enviar o arquivo. Verifique as regras de segurança do Firebase Storage.";
            break;
          case 'storage/canceled':
            description = "O upload foi cancelado.";
            break;
          case 'storage/object-not-found':
             description = "Arquivo não encontrado no storage (erro inesperado durante o upload).";
             break;
          case 'storage/quota-exceeded':
            description = "Cota de armazenamento excedida. Não há mais espaço para novos arquivos.";
            break;
          case 'storage/retry-limit-exceeded':
            description = "Limite de tentativas de upload excedido. Verifique sua conexão com a internet.";
            break;
        }
        const enhancedError = new Error(`Upload failed for ${file.name}: ${description}`);
        (enhancedError as any).originalError = error;
        reject(enhancedError);
      },
      async () => {
        try {
          console.log(`[StorageService] Upload of ${file.name} successful. Getting download URL...`);
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log(`[StorageService] Download URL for ${file.name}: ${downloadURL}`);
          resolve(downloadURL);
        } catch (downloadError) {
          console.error(`[StorageService] Firebase Storage getDownloadURL error for ${path}:`, downloadError);
          const enhancedError = new Error(`Failed to get download URL for ${file.name} after upload.`);
          (enhancedError as any).originalError = downloadError;
          reject(enhancedError);
        }
      }
    );
  });
}

/**
 * Deletes a file from Firebase Storage.
 * @param filePath The full path to the file in Firebase Storage (e.g., "investigations/investigationId/filename.jpg").
 * @returns A promise that resolves when the file is deleted.
 */
export async function deleteFileFromStorage(filePath: string): Promise<void> {
  if (!filePath || typeof filePath !== 'string') {
    console.warn("[StorageService] Invalid filePath provided for deletion:", filePath);
    return Promise.resolve(); // Do nothing if path is invalid
  }
  const fileRef = storageRef(storage, filePath);
  try {
    await deleteObject(fileRef);
    console.log(`[StorageService] File deleted successfully: ${filePath}`);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`[StorageService] File not found, could not delete: ${filePath}`);
      return; // It's okay if the file was already deleted or never existed.
    }
    console.error(`[StorageService] Error deleting file ${filePath}:`, error);
    throw error; // Re-throw other errors
  }
}
