
export interface SuspiciousVehicle {
  id: string;
  createdAt: string; // ISO string
  vehicleModel: string;
  licensePlate: string;
  suspectName?: string;
  suspectPhone?: string;
  photoUrl?: string;
  spottedDate?: string; // ISO string
  notes?: string;
}

export interface SuspiciousVehicleInput {
  vehicleModel: string;
  licensePlate: string;
  suspectName?: string;
  suspectPhone?: string;
  // photoUrl will be handled by upload logic
  spottedDate?: string; // ISO string
  notes?: string;
}
