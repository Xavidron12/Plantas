import { AppAction } from './app.actions';
import { AppState, initialAppState } from './app-state';

export function appReducer(state: AppState = initialAppState, action: AppAction): AppState {
  switch (action.type) {
    case 'auth/setSession':
      return {
        ...state,
        auth: {
          ...state.auth,
          userId: action.payload.userId,
          role: action.payload.role,
        },
      };

    case 'auth/clearSession':
      return {
        ...state,
        auth: {
          ...state.auth,
          userId: null,
          role: null,
        },
      };

    case 'auth/setReady':
      return {
        ...state,
        auth: {
          ...state.auth,
          ready: action.payload.ready,
        },
      };

    case 'plants/setAll':
      return {
        ...state,
        plants: {
          ...state.plants,
          all: action.payload.plants,
        },
      };

    case 'plants/setByOwner':
      return {
        ...state,
        plants: {
          ...state.plants,
          byOwner: {
            ...state.plants.byOwner,
            [action.payload.ownerId]: action.payload.plants,
          },
        },
      };

    case 'plants/setFilters':
      return {
        ...state,
        plants: {
          ...state.plants,
          filters: {
            term: action.payload.term,
            onlyFavs: action.payload.onlyFavs,
          },
        },
      };

    case 'admin/setUsers':
      return {
        ...state,
        admin: {
          ...state.admin,
          users: action.payload.users,
        },
      };

    case 'admin/setRecords':
      return {
        ...state,
        admin: {
          ...state.admin,
          records: action.payload.records,
        },
      };

    default:
      return state;
  }
}
