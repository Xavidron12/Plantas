import { Plant } from '../../models/plant.model';

export type RoleState = 'admin' | 'client' | null;

export type AdminUserState = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  createdAt: string;
};

export type AdminRecordState = {
  id: string;
  plantId: string;
  plantName: string;
  consumptionW: number;
  generationW: number;
  createdAt: string;
};

export type AppState = {
  auth: {
    userId: string | null;
    role: RoleState;
    ready: boolean;
  };
  plants: {
    all: Plant[];
    byOwner: Record<string, Plant[]>;
    filters: {
      term: string;
      onlyFavs: boolean;
    };
  };
  admin: {
    users: AdminUserState[];
    records: AdminRecordState[];
  };
};

export const initialAppState: AppState = {
  auth: {
    userId: null,
    role: null,
    ready: false,
  },
  plants: {
    all: [],
    byOwner: {},
    filters: {
      term: '',
      onlyFavs: false,
    },
  },
  admin: {
    users: [],
    records: [],
  },
};
