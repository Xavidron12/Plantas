import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
    <div class="card mb-3 records-chart-card">
      <div class="card-body">
        <h5 class="mb-3">Grafica en tiempo real</h5>

        @if (records().length === 0) {
          <div class="alert alert-warning py-2 mb-3">Sin datos para graficar todavia.</div>
        }

        <div class="records-chart__stage">
          <canvas #chartCanvas class="records-chart__canvas"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: `
    .records-chart-card {
      border: 1px solid rgba(15, 23, 42, 0.1);
    }

    .records-chart__stage {
      height: 260px;
    }

    .records-chart__canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    :host-context(body[data-theme='dark']) .records-chart-card {
      border-color: rgba(255, 255, 255, 0.16);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsChartComponent implements AfterViewInit, OnDestroy {
  records = input<PlantRecord[]>([]);

  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;
  private themeObserver: MutationObserver | null = null;

  constructor() {
    effect(() => {
      this.updateChart(this.records() ?? []);
    });
  }

  ngAfterViewInit() {
    this.initChart();
    this.watchThemeChanges();
    this.updateChart(this.records() ?? []);
  }

  ngOnDestroy() {
    this.chart?.destroy();
    this.chart = null;
    this.themeObserver?.disconnect();
    this.themeObserver = null;
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
          {
            label: 'Consumo (W)',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            fill: true,
            tension: 0.25,
            pointRadius: 1.5,
          },
          {
            label: 'Generacion (W)',
            data: [],
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.16)',
            fill: true,
            tension: 0.25,
            pointRadius: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              boxWidth: 12,
            },
          },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    this.applyThemeToChart();
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

  private watchThemeChanges() {
    if (typeof document === 'undefined') return;
    const body = document.body;

    this.themeObserver?.disconnect();
    this.themeObserver = new MutationObserver(() => {
      this.applyThemeToChart();
    });

    this.themeObserver.observe(body, { attributes: true, attributeFilter: ['data-theme'] });
  }

  private applyThemeToChart() {
    if (!this.chart || typeof document === 'undefined') return;
    const dark = document.body.getAttribute('data-theme') === 'dark';

    const textColor = dark ? 'rgba(229,231,235,0.92)' : 'rgba(15,23,42,0.82)';
    const gridColor = dark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.14)';

    this.chart.options.plugins = this.chart.options.plugins ?? {};
    this.chart.options.plugins.legend = this.chart.options.plugins.legend ?? {};
    this.chart.options.plugins.legend.labels = this.chart.options.plugins.legend.labels ?? {};
    this.chart.options.plugins.legend.labels.color = textColor;

    this.chart.options.scales = this.chart.options.scales ?? {};
    this.chart.options.scales['x'] = this.chart.options.scales['x'] ?? {};
    this.chart.options.scales['y'] = this.chart.options.scales['y'] ?? {};
    this.chart.options.scales['x'].ticks = this.chart.options.scales['x'].ticks ?? {};
    this.chart.options.scales['y'].ticks = this.chart.options.scales['y'].ticks ?? {};
    this.chart.options.scales['x'].grid = this.chart.options.scales['x'].grid ?? {};
    this.chart.options.scales['y'].grid = this.chart.options.scales['y'].grid ?? {};

    this.chart.options.scales['x'].ticks.color = textColor;
    this.chart.options.scales['y'].ticks.color = textColor;
    this.chart.options.scales['x'].grid.color = gridColor;
    this.chart.options.scales['y'].grid.color = gridColor;

    this.chart.update();
  }
}
