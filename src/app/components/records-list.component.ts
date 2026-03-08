import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PlantRecord } from '../core/records.service';
import { WattsFormatPipe } from '../pipes/watts-format.pipe';

@Component({
  standalone: true,
  selector: 'app-records-list',
  imports: [CommonModule, WattsFormatPipe],
  template: `
    <div class="card records-list-card">
      <div class="card-body">
        <div class="records-list__header">
          <h5 class="mb-0">Ultimos 20 registros</h5>
          <span class="badge text-bg-secondary">{{ records().length }} items</span>
        </div>

        @if (records().length === 0) {
          <div class="alert alert-warning mb-0 mt-3">Aun no hay registros.</div>
        } @else {
          <div class="records-list__stats mt-3">
            <div class="records-list__stat">
              <div class="records-list__stat-label">Consumo medio</div>
              <div class="records-list__stat-value">{{ avgConsumption() | wattsFormat:1 }}</div>
            </div>
            <div class="records-list__stat">
              <div class="records-list__stat-label">Generacion media</div>
              <div class="records-list__stat-value">{{ avgGeneration() | wattsFormat:1 }}</div>
            </div>
            <div class="records-list__stat">
              <div class="records-list__stat-label">Ultimo balance</div>
              <div
                class="records-list__stat-value"
                [ngClass]="{
                  'text-success': latestBalance() >= 0,
                  'text-danger': latestBalance() < 0
                }"
              >
                {{ latestBalance() >= 0 ? '+' : '' }}{{ latestBalance() | wattsFormat:1 }}
              </div>
            </div>
          </div>

          <div class="table-responsive mt-3">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Consumo</th>
                  <th>Generacion</th>
                  <th>Balance</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (r of sortedRecords(); track r.id) {
                  <tr>
                    <td>{{ r.createdAt | date:'short' }}</td>
                    <td>{{ r.consumptionW | wattsFormat:1 }}</td>
                    <td>{{ r.generationW | wattsFormat:1 }}</td>
                    <td
                      [ngClass]="{
                        'text-success': r.generationW >= r.consumptionW,
                        'text-danger': r.generationW < r.consumptionW
                      }"
                      [ngStyle]="{
                        'font-weight': r.generationW >= r.consumptionW ? '700' : '600'
                      }"
                    >
                      {{ r.generationW - r.consumptionW | wattsFormat:1 }}
                    </td>
                    <td>
                      <span
                        class="badge"
                        [class.bg-success]="r.generationW >= r.consumptionW"
                        [class.bg-danger]="r.generationW < r.consumptionW"
                      >
                        {{ r.generationW >= r.consumptionW ? 'Estable' : 'Deficit' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .records-list-card {
      border: 1px solid rgba(15, 23, 42, 0.1);
    }

    .records-list__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .records-list__stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .records-list__stat {
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 12px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.72);
    }

    .records-list__stat-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.75;
    }

    .records-list__stat-value {
      margin-top: 3px;
      font-weight: 700;
      line-height: 1.2;
    }

    :host-context(body[data-theme='dark']) .records-list-card {
      border-color: rgba(255, 255, 255, 0.16);
    }

    :host-context(body[data-theme='dark']) .records-list__stat {
      border-color: rgba(255, 255, 255, 0.16);
      background: rgba(15, 23, 42, 0.5);
    }

    @media (max-width: 768px) {
      .records-list__stats {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsListComponent {
  records = input.required<PlantRecord[]>();

  sortedRecords(): PlantRecord[] {
    return this.records().slice().reverse();
  }

  avgConsumption(): number {
    const list = this.records();
    if (!list.length) return 0;
    return Math.round(list.reduce((sum, r) => sum + r.consumptionW, 0) / list.length);
  }

  avgGeneration(): number {
    const list = this.records();
    if (!list.length) return 0;
    return Math.round(list.reduce((sum, r) => sum + r.generationW, 0) / list.length);
  }

  latestBalance(): number {
    const list = this.records();
    if (!list.length) return 0;
    const last = list[list.length - 1];
    return last.generationW - last.consumptionW;
  }
}
