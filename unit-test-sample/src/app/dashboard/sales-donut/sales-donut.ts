import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DashboardDataService, SalesBreakdown } from '../../core/dashboard-data.service';

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Gap between segments, in ring-length units. */
const GAP = 4;

const COLORS: Record<SalesBreakdown['segments'][number]['label'], string> = {
  Sale: '#3b82f6',
  Distribute: '#65d01e',
  Return: '#f2675f',
};

@Component({
  selector: 'app-sales-donut',
  templateUrl: './sales-donut.html',
  host: { class: 'block' },
})
export class SalesDonut {
  private readonly data = inject(DashboardDataService);

  protected readonly breakdown = rxResource({ stream: () => this.data.getSalesBreakdown() });
  protected readonly radius = RADIUS;
  protected readonly colors = COLORS;

  /** Ring segments laid end to end, clockwise from 12 o'clock. */
  protected readonly arcs = computed(() => {
    if (!this.breakdown.hasValue()) return [];
    let start = 0;
    return this.breakdown.value().segments.map((s) => {
      const length = (s.value / 100) * CIRCUMFERENCE;
      const arc = {
        ...s,
        color: COLORS[s.label],
        dash: `${Math.max(length - GAP, 0)} ${CIRCUMFERENCE}`,
        offset: -start,
      };
      start += length;
      return arc;
    });
  });

  protected readonly summary = computed(() =>
    this.arcs()
      .map((a) => `${a.label} ${a.value}%`)
      .join(', '),
  );
}
