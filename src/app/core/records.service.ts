import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { BehaviorSubject, Observable, map, shareReplay } from 'rxjs';

type RecordRow = {
  id: string;
  plant_id: string;
  consumption_w: number;
  generation_w: number;
  created_at: string;
};

export type PlantRecord = {
  id: string;
  plantId: string;
  consumptionW: number;
  generationW: number;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private channels = new Map<string, any>();
  private byPlantSubjects = new Map<string, BehaviorSubject<PlantRecord[]>>();
  private mockTimers = new Map<string, any>();

  constructor(private sb: SupabaseService) {}

  // -------------------------
  // MAPPERS (DB <-> MODEL)
  // -------------------------

  private toRecord(r: RecordRow): PlantRecord {
    return {
      id: r.id,
      plantId: r.plant_id,
      consumptionW: r.consumption_w,
      generationW: r.generation_w,
      createdAt: r.created_at,
    };
  }

  private toRow(partial: Partial<PlantRecord> & { plantId: string }): any {
    const p: any = partial ?? {};
    const row: any = {
      plant_id: p.plantId,
    };

    if ('consumptionW' in p) row.consumption_w = p.consumptionW;
    if ('generationW' in p) row.generation_w = p.generationW;

    return row;
  }

  // =========================
  // Subject por planta
  // =========================
  private subjectForPlant(plantId: string): BehaviorSubject<PlantRecord[]> {
    let s = this.byPlantSubjects.get(plantId);
    if (!s) {
      s = new BehaviorSubject<PlantRecord[]>([]);
      this.byPlantSubjects.set(plantId, s);
    }
    return s;
  }

  // ✅ Observable “de libro”
  recordsByPlant$(plantId: string): Observable<PlantRecord[]> {
    return this.subjectForPlant(plantId).asObservable().pipe(
      map(list => list ?? []),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  // ✅ carga inicial
  async refreshPlant(plantId: string): Promise<void> {
    const { data, error } = await this.sb.supabase
      .from('records')
      .select('id, plant_id, consumption_w, generation_w, created_at')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    this.subjectForPlant(plantId).next((data ?? []).map(r => this.toRecord(r as RecordRow)));
  }

  // ✅ activa realtime (INSERT)
  startRealtime(plantId: string) {
    if (this.channels.has(plantId)) return;

    const ch = this.sb.supabase
      .channel(`records:${plantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'records',
          filter: `plant_id=eq.${plantId}`,
        },
        (payload: any) => {
          const row = payload.new as RecordRow;
          const current = this.subjectForPlant(plantId).value;
          this.subjectForPlant(plantId).next([...current, this.toRecord(row)]);
        }
      )
      .subscribe();

    this.channels.set(plantId, ch);
  }

  stopRealtime(plantId: string) {
    const ch = this.channels.get(plantId);
    if (ch) {
      this.sb.supabase.removeChannel(ch);
      this.channels.delete(plantId);
    }
  }

  // =========================
  // DEMO inserts (mock)
  // =========================
  async insertMock(plantId: string) {
    const consumption = Math.floor(200 + Math.random() * 600);
    const generation = Math.floor(100 + Math.random() * 800);

    const payload = this.toRow({
      plantId,
      consumptionW: consumption,
      generationW: generation,
    });

    const { error } = await this.sb.supabase.from('records').insert(payload);

    if (error) throw error;
  }

  startMockInserts(plantId: string, ms = 2000) {
    this.stopMockInserts(plantId);
    const t = setInterval(() => {
      this.insertMock(plantId).catch(() => {});
    }, ms);
    this.mockTimers.set(plantId, t);
  }

  stopMockInserts(plantId: string) {
    const t = this.mockTimers.get(plantId);
    if (t) {
      clearInterval(t);
      this.mockTimers.delete(plantId);
    }
  }
}
