import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { BehaviorSubject, Observable, distinctUntilChanged, map, shareReplay } from 'rxjs';

type RecordRow = {
  id: string;
  plant_id: string;
  consumption_w: number;
  generation_w: number;
  created_at: string;
};

type AdminRecordRow = RecordRow & {
  plants?: { name?: string | null } | { name?: string | null }[] | null;
};

export type PlantRecord = {
  id: string;
  plantId: string;
  consumptionW: number;
  generationW: number;
  createdAt: string;
};

export type AdminRecord = PlantRecord & {
  plantName: string;
};

export type RealtimeChannelState =
  | 'closed'
  | 'connecting'
  | 'subscribed'
  | 'timed_out'
  | 'channel_error';

function sameAdminList(a: AdminRecord[], b: AdminRecord[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (
      a[i]?.id !== b[i]?.id ||
      a[i]?.consumptionW !== b[i]?.consumptionW ||
      a[i]?.generationW !== b[i]?.generationW
    ) {
      return false;
    }
  }
  return true;
}

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private readonly LATEST_KEY = '__latest__';
  private readonly MAX_PER_PLANT = 20;
  private channels = new Map<string, any>();
  private byPlantSubjects = new Map<string, BehaviorSubject<PlantRecord[]>>();
  private statusByPlant = new Map<string, BehaviorSubject<RealtimeChannelState>>();
  private latestSubject = new BehaviorSubject<AdminRecord[]>([]);
  private latestLimit = 200;

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

  private toAdminRecord(r: AdminRecordRow): AdminRecord {
    const plants = r.plants;
    const plantName = Array.isArray(plants)
      ? (plants[0]?.name ?? '')
      : (plants?.name ?? '');

    return {
      id: r.id,
      plantId: r.plant_id,
      consumptionW: r.consumption_w,
      generationW: r.generation_w,
      createdAt: r.created_at,
      plantName,
    };
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

  private statusSubjectForPlant(plantId: string): BehaviorSubject<RealtimeChannelState> {
    let s = this.statusByPlant.get(plantId);
    if (!s) {
      s = new BehaviorSubject<RealtimeChannelState>('closed');
      this.statusByPlant.set(plantId, s);
    }
    return s;
  }

  // Stream de registros por planta.
  recordsByPlant$(plantId: string): Observable<PlantRecord[]> {
    return this.subjectForPlant(plantId).asObservable().pipe(
      map(list => list ?? []),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  latestRecords$(): Observable<AdminRecord[]> {
    return this.latestSubject.asObservable().pipe(distinctUntilChanged(sameAdminList));
  }

  realtimeStatus$(plantId: string): Observable<RealtimeChannelState> {
    return this.statusSubjectForPlant(plantId).asObservable().pipe(distinctUntilChanged());
  }

  // Carga inicial de registros de una planta.
  async refreshPlant(plantId: string): Promise<void> {
    const { data, error } = await this.sb.supabase
      .from('records')
      .select('id, plant_id, consumption_w, generation_w, created_at')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })
      .limit(this.MAX_PER_PLANT);

    if (error) throw error;

    const newestFirst = (data ?? []).map(r => this.toRecord(r as RecordRow));
    this.subjectForPlant(plantId).next(newestFirst.reverse());
  }

  async refreshLatest(limit = 200): Promise<void> {
    this.latestLimit = limit;

    const { data, error } = await this.sb.supabase
      .from('records')
      .select('id, plant_id, consumption_w, generation_w, created_at, plants(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    this.latestSubject.next((data ?? []).map(r => this.toAdminRecord(r as AdminRecordRow)));
  }

  latestRealtimeStatus$(): Observable<RealtimeChannelState> {
    return this.statusSubjectForPlant(this.LATEST_KEY).asObservable().pipe(distinctUntilChanged());
  }

  startLatestRealtime() {
    if (this.channels.has(this.LATEST_KEY)) return;

    this.statusSubjectForPlant(this.LATEST_KEY).next('connecting');

    const ch = this.sb.supabase
      .channel('records:latest')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'records',
        },
        payload => {
          void this.handleLatestInsert(payload.new as RecordRow);
        }
      )
      .subscribe((status: string) => {
        this.statusSubjectForPlant(this.LATEST_KEY).next(this.normalizeStatus(status));
      });

    this.channels.set(this.LATEST_KEY, ch);
  }

  stopLatestRealtime() {
    const ch = this.channels.get(this.LATEST_KEY);
    if (ch) {
      this.sb.supabase.removeChannel(ch);
      this.channels.delete(this.LATEST_KEY);
    }
    this.statusSubjectForPlant(this.LATEST_KEY).next('closed');
  }

  // Activa realtime para inserciones de una planta.
  startRealtime(plantId: string) {
    if (this.channels.has(plantId)) return;

    this.statusSubjectForPlant(plantId).next('connecting');

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
          const next = [...current, this.toRecord(row)];
          this.subjectForPlant(plantId).next(next.slice(-this.MAX_PER_PLANT));
        }
      )
      .subscribe((status: string) => {
        this.statusSubjectForPlant(plantId).next(this.normalizeStatus(status));
      });

    this.channels.set(plantId, ch);
  }

  stopRealtime(plantId: string) {
    const ch = this.channels.get(plantId);
    if (ch) {
      this.sb.supabase.removeChannel(ch);
      this.channels.delete(plantId);
    }
    this.statusSubjectForPlant(plantId).next('closed');
  }

  async createRecord(plantId: string, consumptionW: number, generationW: number): Promise<void> {
    const payload = this.toRow({ plantId, consumptionW, generationW });
    const { error } = await this.sb.supabase.from('records').insert(payload);
    if (error) throw error;
  }

  async updateRecord(
    recordId: string,
    changes: { consumptionW: number; generationW: number }
  ): Promise<void> {
    const { error } = await this.sb.supabase
      .from('records')
      .update({
        consumption_w: changes.consumptionW,
        generation_w: changes.generationW,
      })
      .eq('id', recordId);

    if (error) throw error;
  }

  async deleteRecord(recordId: string): Promise<void> {
    const { error } = await this.sb.supabase.from('records').delete().eq('id', recordId);
    if (error) throw error;
  }

  private normalizeStatus(status: string): RealtimeChannelState {
    switch ((status || '').toUpperCase()) {
      case 'SUBSCRIBED':
        return 'subscribed';
      case 'TIMED_OUT':
        return 'timed_out';
      case 'CHANNEL_ERROR':
        return 'channel_error';
      case 'CLOSED':
        return 'closed';
      default:
        return 'connecting';
    }
  }

  private async handleLatestInsert(row: RecordRow) {
    const plantName = await this.resolvePlantName(row.plant_id);
    const record: AdminRecord = {
      id: row.id,
      plantId: row.plant_id,
      consumptionW: row.consumption_w,
      generationW: row.generation_w,
      createdAt: row.created_at,
      plantName,
    };

    const next = [record, ...this.latestSubject.value].slice(0, this.latestLimit);
    this.latestSubject.next(next);
  }

  private async resolvePlantName(plantId: string): Promise<string> {
    const { data } = await this.sb.supabase
      .from('plants')
      .select('name')
      .eq('id', plantId)
      .maybeSingle();

    return (data as { name?: string } | null)?.name ?? plantId;
  }
}
