import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Plant } from '../models/plant.model';
import { MATERIAL } from '../shared/material';

@Component({
  standalone: true,
  selector: 'app-plant-card',
  imports: [CommonModule, RouterLink, ...MATERIAL],
  template: `
    <mat-card class="plant-card">
      @if (photoUrl()) {
        <div class="plant-card__media">
          <img [src]="photoUrl()!" class="plant-card__image" alt="Foto planta" />
        </div>
      } @else {
        <div class="plant-card__media plant-card__media--empty">Sin foto</div>
      }

      <mat-card-content class="plant-card__content">
        <div class="plant-card__heading">
          <div class="plant-card__title">{{ plant().name }}</div>

          <button
            mat-icon-button
            type="button"
            (click)="toggleFav.emit(plant().id)"
            [attr.aria-label]="isFav() ? 'Quitar de favoritos' : 'Marcar favorito'"
          >
            <mat-icon [style.color]="isFav() ? '#dc2626' : 'rgba(100,116,139,0.9)'">
              {{ isFav() ? 'favorite' : 'favorite_border' }}
            </mat-icon>
          </button>
        </div>

        <div class="plant-card__description" [title]="plant().description ?? ''">
          {{ shortDesc(plant().description ?? '') }}
        </div>
      </mat-card-content>

      <mat-card-actions align="end" class="plant-card__actions">
        <a mat-stroked-button color="primary" [routerLink]="['/plants', plant().id]">Informacion</a>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .plant-card {
      height: 100%;
      overflow: hidden;
      transition: transform 180ms ease, box-shadow 180ms ease;
    }

    .plant-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 18px 35px rgba(15, 23, 42, 0.2);
    }

    .plant-card__media {
      aspect-ratio: 16 / 9;
      background: linear-gradient(140deg, #f6f8fb, #e9eef4);
    }

    .plant-card__media--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      letter-spacing: 0.02em;
      font-weight: 600;
    }

    .plant-card__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .plant-card__content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 12px;
    }

    .plant-card__heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .plant-card__title {
      font-weight: 700;
      font-size: 1.02rem;
      line-height: 1.25;
    }

    .plant-card__description {
      opacity: 0.82;
      min-height: 44px;
    }

    .plant-card__actions {
      padding-top: 0;
    }

    :host-context(body[data-theme='dark']) .plant-card__media {
      background: linear-gradient(140deg, #0f172a, #111b32);
    }

    :host-context(body[data-theme='dark']) .plant-card__media--empty {
      color: #cbd5e1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlantCardComponent {
  plant = input.required<Plant>();
  photoUrl = input<string | null>(null);
  isFav = input(false);

  toggleFav = output<string>();

  shortDesc(desc: string): string {
    const s = (desc || '').trim();
    if (!s) return '-';
    return s.length > 70 ? s.slice(0, 70) + '...' : s;
  }
}
