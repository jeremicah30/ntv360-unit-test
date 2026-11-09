import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DashboardDataService, SalesPeriod, SalesPoint } from '../../core/dashboard-data.service';

interface PlotPoint extends SalesPoint {
  x: number;
  y: number;
}

// Plot area inside the SVG viewBox (0 0 640 260).
const PLOT = { left: 40, right: 630, top: 12, bottom: 220 };

@Component({
  selector: 'app-sales-chart',
  templateUrl: './sales-chart.html',
  host: { class: 'block' },
})
export class SalesChart {
  private readonly data = inject(DashboardDataService);

  protected readonly periods: { value: SalesPeriod; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];
  protected readonly period = signal<SalesPeriod>('weekly');

  protected readonly sales = rxResource({
    params: () => this.period(),
    stream: ({ params }) => this.data.getSales(params),
  });

  protected readonly plot = PLOT;
  protected readonly yTicks = [0, 20, 40, 60, 80, 100];

  /** Index of the hovered point; null hides the tooltip. */
  protected readonly active = signal<number | null>(null);

  protected readonly points = computed<PlotPoint[]>(() => {
    const data = this.sales.hasValue() ? this.sales.value() : [];
    const step = (PLOT.right - PLOT.left) / Math.max(data.length - 1, 1);
    return data.map((p, i) => ({ ...p, x: PLOT.left + i * step, y: this.yFor(p.value) }));
  });

  protected readonly columnWidth = computed(
    () => (PLOT.right - PLOT.left) / Math.max(this.points().length - 1, 1),
  );

  protected readonly linePath = computed(() => smoothPath(this.points()));
  protected readonly areaPath = computed(
    () => `${this.linePath()} L${PLOT.right},${PLOT.bottom} L${PLOT.left},${PLOT.bottom} Z`,
  );

  protected readonly activePoint = computed(() => {
    const i = this.active();
    return i === null ? null : (this.points()[i] ?? null);
  });

  protected selectPeriod(value: string): void {
    this.active.set(null);
    this.period.set(value as SalesPeriod);
  }

  protected yFor(value: number): number {
    return PLOT.bottom - (value / 100) * (PLOT.bottom - PLOT.top);
  }
}

/** Catmull-Rom spline converted to cubic Bezier segments. */
function smoothPath(pts: PlotPoint[]): string {
  if (!pts.length) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}
