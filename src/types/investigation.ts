
import type { Timestamp } from 'firebase/firestore';

export interface Investigation {
  id: string; // Firestore document ID
  title: string;
  description: string;
  assignedInvestigator: string;
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada';
  creationDate: string; // ISO string
  roNumber: string; // Gerado automaticamente, não mais opcional
  occurrenceDate?: string; // ISO string, opcional
  mediaUrls?: string[]; // Array de URLs para imagens/vídeos
}

export interface InvestigationInput {
  title: string;
  description: string;
  assignedInvestigator: string;
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada';
  creationDate?: Timestamp; // Firestore serverTimestamp será usado
  roNumber?: string; // Será gerado pelo backend/service
  occurrenceDate?: string; // ISO string
  mediaUrls?: string[];
}

