import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, map, Subject } from 'rxjs';
import { PlantRecord } from '../models/record.model';

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private records$ = new BehaviorSubject<PlantRecord[]>([]);
  private live$ = new Subject<PlantRecord>();

  // stream “en vivo” (como si fuera websocket)
  liveRecord$ = this.live$.asObservable();

  getByPlant(plantId: string) {
    return this.records$.asObservable().pipe(
      map(all => all.filter(r => r.plantId === plantId).sort((a,b) => a.createdAt.localeCompare(b.createdAt)))
    );
  }

  startMockEmitter(plantId: string) {
    interval(2000).subscribe(() => {
      const rec: PlantRecord = {
        id: crypto.randomUUID(),
        plantId,
        createdAt: new Date().toISOString(),
        consumptionW: Math.floor(200 + Math.random() * 300),
        generationW: Math.floor(100 + Math.random() * 500),
      };

      this.records$.next([...this.records$.value, rec]);
      this.live$.next(rec);
    });
  }
}
