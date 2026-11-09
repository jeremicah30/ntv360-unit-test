import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DashboardDataService, Order, OrderStatus } from '../../core/dashboard-data.service';

type SortKey = 'id' | 'product' | 'status' | 'price';
type SortDir = 'asc' | 'desc';

export const PAGE_SIZE = 4;

@Component({
  selector: 'app-recent-orders',
  imports: [CurrencyPipe],
  templateUrl: './recent-orders.html',
  host: { class: 'block' },
})
export class RecentOrders {
  private readonly data = inject(DashboardDataService);

  /** Search keyword from the dashboard header. */
  readonly query = input('');

  protected readonly orders = rxResource({ stream: () => this.data.getOrders() });

  protected readonly columns: { key: SortKey; label: string }[] = [
    { key: 'id', label: 'Tracking ID' },
    { key: 'product', label: 'Products name' },
    { key: 'status', label: 'Status' },
    { key: 'price', label: 'Price' },
  ];

  protected readonly statusClass: Record<OrderStatus, string> = {
    Complete: 'bg-blue-100 text-blue-500',
    Pending: 'bg-green-100 text-green-600',
    Canceled: 'bg-red-100 text-red-500',
  };

  protected readonly sort = signal<{ key: SortKey; dir: SortDir } | null>(null);
  protected readonly visibleCount = signal(PAGE_SIZE);

  private readonly filtered = computed<Order[]>(() => {
    const all = this.orders.hasValue() ? this.orders.value() : [];
    const q = this.query().trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => [o.id, o.product, o.status].some((v) => v.toLowerCase().includes(q)));
  });

  private readonly sorted = computed<Order[]>(() => {
    const s = this.sort();
    const rows = this.filtered();
    if (!s) return rows;
    const factor = s.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[s.key];
      const bv = b[s.key];
      const cmp = typeof av === 'number' ? av - (bv as number) : String(av).localeCompare(String(bv));
      return cmp * factor;
    });
  });

  protected readonly rows = computed(() => this.sorted().slice(0, this.visibleCount()));
  protected readonly hasMore = computed(() => this.sorted().length > this.visibleCount());
  protected readonly hasOrders = computed(() => this.orders.hasValue() && this.orders.value().length > 0);

  protected toggleSort(key: SortKey): void {
    const s = this.sort();
    this.sort.set({ key, dir: s?.key === key && s.dir === 'asc' ? 'desc' : 'asc' });
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    const s = this.sort();
    if (s?.key !== key) return 'none';
    return s.dir === 'asc' ? 'ascending' : 'descending';
  }

  protected showMore(): void {
    this.visibleCount.update((n) => n + PAGE_SIZE);
  }
}
