
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
  Timestamp, // Timestamp ainda pode ser usado internamente ou para updates
  orderBy,
  query as firestoreQuery,
  serverTimestamp,
} from 'firebase/firestore';
import type { Investigation, InvestigationInput } from '@/types/investigation';

const db = getFirestore(app);
const investigationsCollectionRef = collection(db, 'investigations');

export async function addInvestigation(investigationData: Omit<InvestigationInput, 'creationDate' | 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(investigationsCollectionRef, {
      ...investigationData,
      creationDate: serverTimestamp(),
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
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      // Converta o Timestamp para string ISO aqui
      const creationDateTimestamp = data.creationDate as Timestamp | undefined;
      return {
        id: docSnap.id,
        title: data.title,
        description: data.description,
        assignedInvestigator: data.assignedInvestigator,
        status: data.status,
        roNumber: data.roNumber,
        creationDate: creationDateTimestamp ? creationDateTimestamp.toDate().toISOString() : new Date().toISOString(), // Garante que é string
      } as Investigation;
    });
  } catch (error) {
    console.error("Error getting investigations: ", error);
    throw new Error("Failed to get investigations.");
  }
}

export async function updateInvestigation(id: string, updates: Partial<Omit<Investigation, 'id' | 'creationDate'>>): Promise<void> {
  try {
    const investigationDocRef = doc(db, 'investigations', id);
    // Se precisar atualizar 'creationDate', deve ser feito com cuidado ou não ser permitido.
    // Normalmente, creationDate não é alterado.
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
