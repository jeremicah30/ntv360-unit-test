import { Component, signal } from '@angular/core';
import { AnalyticsChart } from './analytics-chart/analytics-chart';
import { RecentOrders } from './recent-orders/recent-orders';
import { SalesChart } from './sales-chart/sales-chart';
import { SalesDonut } from './sales-donut/sales-donut';
import { SummaryCards } from './summary-cards/summary-cards';

@Component({
  selector: 'app-dashboard',
  imports: [SummaryCards, SalesChart, RecentOrders, SalesDonut, AnalyticsChart],
  templateUrl: './dashboard.html',
  host: { class: 'block' },
})
export class Dashboard {
  /** Keyword that filters the Recent Order table. */
  protected readonly query = signal('');

  /** Mock signed-in user until a real profile API exists. */
  protected readonly user = { name: 'Angelina Joli', initials: 'AJ' };
}
