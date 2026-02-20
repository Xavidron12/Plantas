import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map, shareReplay } from 'rxjs';
import { AppAction } from './app.actions';
import { appReducer } from './app.reducer';
import { AppState, initialAppState } from './app-state';

@Injectable({ providedIn: 'root' })
export class AppStoreService {
  private stateSubject = new BehaviorSubject<AppState>(initialAppState);

  state$ = this.stateSubject.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true }));

  dispatch(action: AppAction): void {
    const current = this.stateSubject.value;
    const next = appReducer(current, action);
    this.stateSubject.next(next);
  }

  snapshot(): AppState {
    return this.stateSubject.value;
  }

  select<T>(selector: (state: AppState) => T): Observable<T> {
    return this.state$.pipe(map(selector), distinctUntilChanged());
  }
}
