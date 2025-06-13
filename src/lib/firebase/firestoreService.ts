
// src/lib/firebase/firestoreService.ts
'use server';

import { app } from './config';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc, // Import setDoc
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  query as firestoreQuery,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const db = getFirestore(app);
const investigationsCollectionRef = collection(db, 'investigations');

export async function addInvestigation(
  investigationData: Omit<InvestigationInput, 'creationDate' | 'id' | 'roNumber'>,
  idToUse: string // Receive the pre-generated ID
): Promise<string> {
  try {
    const snapshot = await getCountFromServer(investigationsCollectionRef);
    const count = snapshot.data().count;
    const newRoNumber = `${count + 1}.0`;

    const investigationDocRef = doc(db, 'investigations', idToUse); // Use the pre-generated ID

    await setDoc(investigationDocRef, { // Use setDoc with the pre-generated ID
      ...investigationData,
      roNumber: newRoNumber,
      creationDate: serverTimestamp(),
      mediaUrls: investigationData.mediaUrls || [],
    });
    return idToUse; // Return the ID used
  } catch (error) {
    console.error("Error adding investigation: ", error);
    throw new Error("Failed to add investigation.");
  }
}

export async function getInvestigations(): Promise<Investigation[]> {
  try {
    const q = firestoreQuery(investigationsCollectionRef, orderBy('creationDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const creationDateTimestamp = data.creationDate as Timestamp | undefined;
      return {
        id: docSnap.id,
        title: data.title,
        description: data.description,
        assignedInvestigator: data.assignedInvestigator,
        status: data.status,
        roNumber: data.roNumber || 'N/A', 
        creationDate: creationDateTimestamp ? creationDateTimestamp.toDate().toISOString() : new Date().toISOString(),
        occurrenceDate: data.occurrenceDate || undefined,
        mediaUrls: data.mediaUrls || [],
      } as Investigation;
    });
  } catch (error) {
    console.error("Error getting investigations: ", error);
    throw new Error("Failed to get investigations.");
  }
}

export async function updateInvestigation(id: string, updates: Partial<Omit<Investigation, 'id' | 'creationDate' | 'roNumber'>>): Promise<void> {
  try {
    const investigationDocRef = doc(db, 'investigations', id);
    const { roNumber, ...validUpdates } = updates as any; 
    await updateDoc(investigationDocRef, {
        ...validUpdates,
        mediaUrls: updates.mediaUrls || [], 
    });
  } catch (error) {
    console.error("Error updating investigation: ", error);
    throw new Error("Failed to update investigation.");
  }
}

export async function deleteInvestigation(id: string): Promise<void> {
  try {
    const investigationDocRef = doc(db, 'investigations', id);
    await deleteDoc(investigationDocRef);
  } catch (error) {
    console.error("Error deleting investigation: ", error);
    throw new Error("Failed to delete investigation.");
  }
}
