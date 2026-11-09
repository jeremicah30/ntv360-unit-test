import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DashboardDataService } from '../../core/dashboard-data.service';

type Series = 'previous' | 'current';

interface Bar {
  key: string;
  series: Series;
  amount: number;
  x: number;
  y: number;
  height: number;
}

// Plot area inside the SVG viewBox (0 0 300 230).
const PLOT = { left: 30, right: 295, top: 12, bottom: 200 };
/** Amount mapped to the top of the 0–100 axis. */
const MAX_AMOUNT = 5000;
const BAR_WIDTH = 8;
const BAR_GAP = 2;

@Component({
  selector: 'app-analytics-chart',
  templateUrl: './analytics-chart.html',
  host: { class: 'block' },
})
export class AnalyticsChart {
  private readonly data = inject(DashboardDataService);

  protected readonly analytics = rxResource({ stream: () => this.data.getAnalytics() });
  protected readonly plot = PLOT;
  protected readonly yTicks = [0, 20, 40, 60, 80, 100];
  protected readonly barWidth = BAR_WIDTH;

  /** Key of the hovered bar; null hides the tooltip. */
  protected readonly active = signal<string | null>(null);

  protected readonly days = computed(() => {
    const points = this.analytics.hasValue() ? this.analytics.value() : [];
    const groupWidth = (PLOT.right - PLOT.left) / Math.max(points.length, 1);
    return points.map((p, i) => {
      const center = PLOT.left + groupWidth * (i + 0.5);
      const bar = (series: Series, x: number): Bar => {
        const height = (Math.min(p[series], MAX_AMOUNT) / MAX_AMOUNT) * (PLOT.bottom - PLOT.top);
        return { key: `${p.day}-${series}`, series, amount: p[series], x, y: PLOT.bottom - height, height };
      };
      return {
        day: p.day,
        center,
        bars: [bar('previous', center - BAR_WIDTH - BAR_GAP / 2), bar('current', center + BAR_GAP / 2)],
      };
    });
  });

  protected readonly activeBar = computed(() => {
    const key = this.active();
    return key === null ? null : (this.days().flatMap((d) => d.bars).find((b) => b.key === key) ?? null);
  });

  protected yFor(tick: number): number {
    return PLOT.bottom - (tick / 100) * (PLOT.bottom - PLOT.top);
  }

  /** 3330 -> "3.33k" */
  protected formatAmount(amount: number): string {
    return amount >= 1000 ? `${(amount / 1000).toFixed(2)}k` : String(amount);
  }
}
