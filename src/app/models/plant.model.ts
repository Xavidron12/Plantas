export interface Plant {
  id: string;         // uuid
  ownerId: string;    // uuid
  name: string;
  description?: string | null;
  lat: number;
  lng: number;
  photoUrl?: string | null;
  createdAt: string;
}
