
// src/lib/firebase/firestoreService.ts
'use server'; // Indica que estas funções podem ser Server Actions ou usadas em Server Components

import { app } from './config';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  query as firestoreQuery, // Renomeado para evitar conflito com query do react-query se usado
  serverTimestamp,
} from 'firebase/firestore';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const db = getFirestore(app);
const investigationsCollectionRef = collection(db, 'investigations');

export async function addInvestigation(investigationData: Omit<InvestigationInput, 'creationDate'>): Promise<string> {
  try {
    const docRef = await addDoc(investigationsCollectionRef, {
      ...investigationData,
      creationDate: serverTimestamp(), // Firestore gerencia o timestamp no servidor
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding investigation: ", error);
    throw new Error("Failed to add investigation.");
  }
}

export async function getInvestigations(): Promise<Investigation[]> {
  try {
    const q = firestoreQuery(investigationsCollectionRef, orderBy('creationDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as Investigation));
  } catch (error) {
    console.error("Error getting investigations: ", error);
    throw new Error("Failed to get investigations.");
  }
}

export async function updateInvestigation(id: string, updates: Partial<Omit<Investigation, 'id' | 'creationDate'>>): Promise<void> {
  try {
    const investigationDocRef = doc(db, 'investigations', id);
    await updateDoc(investigationDocRef, updates);
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
