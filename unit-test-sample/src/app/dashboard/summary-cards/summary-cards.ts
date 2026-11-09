import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DashboardDataService, Summary } from '../../core/dashboard-data.service';

const RING_CIRCUMFERENCE = 2 * Math.PI * 16;

const STYLE: Record<Summary['key'], { tile: string; ring: string; icon: string[] }> = {
  sales: { tile: 'bg-blue-100 text-blue-500', ring: '#3b82f6', icon: ['M6 20V10', 'M12 20V4', 'M18 20v-7'] },
  stock: {
    tile: 'bg-lime-100 text-lime-600',
    ring: '#84cc16',
    icon: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 15l2 2 4-4'],
  },
  return: { tile: 'bg-red-100 text-red-500', ring: '#f87171', icon: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z'] },
};

@Component({
  selector: 'app-summary-cards',
  templateUrl: './summary-cards.html',
  host: { class: 'block' },
})
export class SummaryCards {
  private readonly data = inject(DashboardDataService);

  protected readonly summary = rxResource({ stream: () => this.data.getSummary() });
  protected readonly style = STYLE;

  protected ringDash(percent: number): string {
    return `${(percent / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
  }
}
