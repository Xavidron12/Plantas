import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
} from '@angular/core';
import Chart from 'chart.js/auto';

import { PlantRecord } from '../core/records.service';

@Component({
  standalone: true,
  selector: 'app-records-chart',
  imports: [CommonModule],
  template: `
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="mb-3">Gráfica en tiempo real</h5>

        <div style="height: 260px;">
          <canvas #chartCanvas style="display:block; width:100%; height:100%;"></canvas>
        </div>
      </div>
    </div>
  `,
})
export class RecordsChartComponent implements AfterViewInit, OnDestroy {
  records = input<PlantRecord[]>([]);

  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      this.updateChart(this.records() ?? []);
    });
  }

  ngAfterViewInit() {
    this.initChart();
    this.updateChart(this.records() ?? []);
  }

  ngOnDestroy() {
    this.chart?.destroy();
    this.chart = null;
  }

  private initChart() {
    const ctx = this.chartCanvas?.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart?.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Consumo (W)', data: [] },
          { label: 'Generación (W)', data: [] },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private updateChart(list: PlantRecord[]) {
    if (!this.chart) return;

    const last = (list ?? []).slice(-20);

    const labels = last.map(r => {
      const d = new Date(r.createdAt);
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    });

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = last.map(r => r.consumptionW);
    this.chart.data.datasets[1].data = last.map(r => r.generationW);
    this.chart.update();
  }
}
