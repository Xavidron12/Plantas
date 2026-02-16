import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { PlantRecord } from '../core/records.service';

@Component({
  standalone: true,
  selector: 'app-records-list',
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-body">
        <h5 class="mb-3">Últimos registros</h5>

        <div class="alert alert-warning" *ngIf="records.length === 0">
          Aún no hay registros.
        </div>

        <ul class="mb-0" *ngIf="records.length > 0">
          <li *ngFor="let r of records.slice().reverse()">
            {{ r.createdAt }} | Consumo: {{ r.consumptionW }}W | Generación: {{ r.generationW }}W
          </li>
        </ul>
      </div>
    </div>
  `,
})
export class RecordsListComponent {
  @Input({ required: true }) records: PlantRecord[] = [];
}
