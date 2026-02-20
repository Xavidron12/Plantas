import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Plant } from '../models/plant.model';
import { MATERIAL } from '../shared/material';

@Component({
  standalone: true,
  selector: 'app-plant-card',
  imports: [CommonModule, RouterLink, ...MATERIAL],
  template: `
    <mat-card style="height:100%;">
      <div *ngIf="photoUrl(); else noPhoto" style="aspect-ratio:16/9; background:#f3f3f3;">
        <img
          [src]="photoUrl()!"
          style="width:100%; height:100%; object-fit:cover;"
          alt="Foto planta"
        />
      </div>

      <ng-template #noPhoto>
        <div
          style="
            aspect-ratio:16/9;
            background:#f3f3f3;
            display:flex;
            align-items:center;
            justify-content:center;
            opacity:0.75;
          "
        >
          Sin foto
        </div>
      </ng-template>

      <mat-card-content style="display:flex; flex-direction:column; gap:8px; padding-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="font-weight:600; font-size:16px; line-height:1.2;">
            {{ plant().name }}
          </div>

          <button
            mat-icon-button
            type="button"
            (click)="toggleFav.emit(plant().id)"
            [attr.aria-label]="isFav() ? 'Quitar de favoritos' : 'Marcar favorito'"
          >
            <mat-icon [style.color]="isFav() ? '#ff3b30' : 'rgba(156,163,175,0.9)'">
              {{ isFav() ? 'favorite' : 'favorite_border' }}
            </mat-icon>
          </button>
        </div>

        <div style="opacity:0.78;" [title]="plant().description ?? ''">
          {{ shortDesc(plant().description ?? '') }}
        </div>
      </mat-card-content>

      <mat-card-actions align="end">
        <a mat-stroked-button color="primary" [routerLink]="['/plants', plant().id]">
          Información
        </a>
      </mat-card-actions>
    </mat-card>
  `,
})
export class PlantCardComponent {
  plant = input.required<Plant>();
  photoUrl = input<string | null>(null);
  isFav = input(false);

  toggleFav = output<string>();

  shortDesc(desc: string): string {
    const s = (desc || '').trim();
    if (!s) return '—';
    return s.length > 70 ? s.slice(0, 70) + '…' : s;
  }
}
