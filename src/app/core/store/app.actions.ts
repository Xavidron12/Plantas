import { Plant } from '../../models/plant.model';
import { AdminRecordState, AdminUserState, RoleState } from './app-state';

export type AppAction =
  | {
      type: 'auth/setSession';
      payload: { userId: string; role: Exclude<RoleState, null> };
    }
  | {
      type: 'auth/clearSession';
    }
  | {
      type: 'auth/setReady';
      payload: { ready: boolean };
    }
  | {
      type: 'plants/setAll';
      payload: { plants: Plant[] };
    }
  | {
      type: 'plants/setByOwner';
      payload: { ownerId: string; plants: Plant[] };
    }
  | {
      type: 'plants/setFilters';
      payload: { term: string; onlyFavs: boolean };
    }
  | {
      type: 'admin/setUsers';
      payload: { users: AdminUserState[] };
    }
  | {
      type: 'admin/setRecords';
      payload: { records: AdminRecordState[] };
    };
