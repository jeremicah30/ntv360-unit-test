import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { DashboardDataService } from '../../core/dashboard-data.service';
import { ORDERS, mockDataService } from '../../testing/dashboard-data.mock';
import { RecentOrders } from './recent-orders';

describe('RecentOrders', () => {
  async function setup(overrides: Partial<DashboardDataService> = {}, waitForData = true) {
    TestBed.configureTestingModule({
      providers: [{ provide: DashboardDataService, useValue: mockDataService(overrides) }],
    });
    const fixture = TestBed.createComponent(RecentOrders);
    if (waitForData) await fixture.whenStable();
    else fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(el.querySelectorAll<HTMLTableRowElement>('[data-testid="order-row"]'));
    const ids = () => rows().map((r) => r.cells[0].textContent?.trim());
    const header = (label: string) =>
      Array.from(el.querySelectorAll('th')).find((th) => th.textContent?.includes(label))!;
    const seeMore = () => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('See more'));
    return { fixture, el, rows, ids, header, seeMore };
  }

  // AC-6.1
  it('renders columns and rows with image, name, status and currency price', async () => {
    const { el, rows } = await setup();
    expect(Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Tracking ID',
      'Products name',
      'Status',
      'Price',
    ]);
    const first = rows()[0];
    expect(first.querySelector('img')?.getAttribute('src')).toBe('products/shoe.svg');
    expect(first.textContent).toContain('Air Vapomax');
    expect(first.querySelector('[data-testid="order-price"]')?.textContent?.trim()).toBe('$22.78');
    expect(rows()[3].querySelector('[data-testid="order-price"]')?.textContent?.trim()).toBe('$4,022.00');
  });

  // AC-6.2
  it('colours status badges blue, green and red', async () => {
    const { rows } = await setup();
    const badge = (i: number) => rows()[i].querySelector('[data-testid="status-badge"]')!;
    expect(badge(0).textContent?.trim()).toBe('Complete');
    expect(badge(0).classList).toContain('text-blue-500');
    expect(badge(1).textContent?.trim()).toBe('Pending');
    expect(badge(1).classList).toContain('text-green-600');
    expect(badge(2).textContent?.trim()).toBe('Canceled');
    expect(badge(2).classList).toContain('text-red-500');
  });

  // AC-6.3
  it('sorts by a column and toggles direction on second click', async () => {
    const { fixture, rows, header } = await setup();
    const prices = () => rows().map((r) => r.querySelector('[data-testid="order-price"]')!.textContent!.trim());

    header('Price').querySelector('button')!.click();
    await fixture.whenStable();
    expect(header('Price').getAttribute('aria-sort')).toBe('ascending');
    expect(prices()).toEqual(['$15.99', '$22.78', '$122.80', '$249.00']);

    header('Price').querySelector('button')!.click();
    await fixture.whenStable();
    expect(header('Price').getAttribute('aria-sort')).toBe('descending');
    expect(prices()[0]).toBe('$4,022.00');
  });

  it('sorts text columns alphabetically', async () => {
    const { fixture, rows, header } = await setup();
    header('Products name').querySelector('button')!.click();
    await fixture.whenStable();
    expect(rows()[0].textContent).toContain('Air Vapomax');
    expect(rows()[1].textContent).toContain('Apple Watch SE');
  });

  // AC-6.4
  it('loads more rows with See more and hides it when all are shown', async () => {
    const { fixture, rows, seeMore } = await setup();
    expect(rows().length).toBe(4);

    seeMore()!.click();
    await fixture.whenStable();

    expect(rows().length).toBe(ORDERS.length);
    expect(seeMore()).toBeUndefined();
  });

  // AC-6.5
  it('shows an empty state when there are no orders', async () => {
    const { el } = await setup({ getOrders: () => of([]) });
    expect(el.querySelector('[data-testid="orders-empty"]')?.textContent).toContain('No recent orders yet.');
    expect(el.querySelector('table')).toBeNull();
  });

  it('shows loading and error states', async () => {
    const loading = await setup({ getOrders: () => NEVER }, false);
    expect(loading.el.querySelectorAll('[data-testid="orders-skeleton"]').length).toBe(4);
    TestBed.resetTestingModule();

    const failed = await setup({ getOrders: () => throwError(() => new Error('500')) });
    expect(failed.el.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load recent orders");
  });

  // AC-3.2 (filtering part)
  it('filters rows by the search query and restores them when cleared', async () => {
    const { fixture, el, ids } = await setup();

    fixture.componentRef.setInput('query', 'pending');
    await fixture.whenStable();
    expect(ids()).toEqual(['#9812411', '#9812702']);

    fixture.componentRef.setInput('query', 'zzz');
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="orders-no-match"]')?.textContent).toContain('No orders match "zzz"');

    fixture.componentRef.setInput('query', '');
    await fixture.whenStable();
    expect(ids().length).toBe(4);
  });
});
