
import type { Timestamp } from 'firebase/firestore'; // Timestamp ainda é usado em InvestigationInput para consistência com o que o Firestore espera na escrita inicial

export interface Investigation {
  id: string; // Firestore document ID
  title: string;
  description: string;
  assignedInvestigator: string;
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada';
  creationDate: string; // Alterado de Timestamp para string (ISO string)
  roNumber?: string;
}

export interface InvestigationInput { // Para criação, sem ID e com data como Date
  title: string;
  description: string;
  assignedInvestigator: string;
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Arquivada';
  creationDate?: Timestamp; // Firestore serverTimestamp será usado, mas mantendo para referência
  roNumber?: string;
}
