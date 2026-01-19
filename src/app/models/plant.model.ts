export interface Plant {
  id: string;         // uuid
  ownerId: string;    // uuid
  name: string;
  description?: string;
  lat: number;
  lng: number;
  photoUrl?: string;
  createdAt: string;
}
