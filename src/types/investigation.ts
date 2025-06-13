
import type { Timestamp } from 'firebase/firestore';

export interface Investigation {
  id: string; // Firestore document ID
  title: string;
  description: string;
  assignedInvestigator: string;
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada';
  creationDate: Timestamp; // Usar Timestamp do Firestore
  roNumber?: string;
}

export interface InvestigationInput { // Para criação, sem ID e com data como Date
  title: string;
  description: string;
  assignedInvestigator: string;
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada';
  creationDate: Date;
  roNumber?: string;
}
