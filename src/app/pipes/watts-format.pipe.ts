import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'wattsFormat',
  standalone: true,
})
export class WattsFormatPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 0): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return '0 W';

    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(Math.max(0, digits))} MW`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(Math.max(0, digits))} kW`;
    return `${Math.round(n)} W`;
  }
}
