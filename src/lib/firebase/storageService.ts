
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

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Optional: Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Error uploading file:", error);
        reject(error);
      },
      () => {
        // Handle successful uploads on complete
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
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
  const fileRef = storageRef(storage, filePath);
  try {
    await deleteObject(fileRef);
  } catch (error) {
    // https://firebase.google.com/docs/storage/web/delete-files#handle_errors
    // We can ignore "object-not-found" error if we are trying to delete a non-existent file
    if ((error as any).code === 'storage/object-not-found') {
      console.warn(`File not found, could not delete: ${filePath}`);
      return;
    }
    console.error("Error deleting file:", error);
    throw error;
  }
}
