import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardDataService, SalesPeriod } from '../../core/dashboard-data.service';
import { MONTHLY, WEEKLY, mockDataService } from '../../testing/dashboard-data.mock';
import { SalesChart } from './sales-chart';

describe('SalesChart', () => {
  async function setup(overrides: Partial<DashboardDataService> = {}) {
    const service = mockDataService(overrides);
    TestBed.configureTestingModule({ providers: [{ provide: DashboardDataService, useValue: service }] });
    const fixture = TestBed.createComponent(SalesChart);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, service };
  }

  const all = (el: HTMLElement, id: string) => Array.from(el.querySelectorAll(`[data-testid="${id}"]`));

  // AC-5.1
  it('renders the titled line chart with Y 0–100 and time labels on X', async () => {
    const { el } = await setup();
    expect(el.querySelector('h2')?.textContent).toBe('Sales Reports');
    expect(all(el, 'y-tick').map((t) => t.textContent?.trim())).toEqual(['0', '20', '40', '60', '80', '100']);
    expect(all(el, 'x-label').map((t) => t.textContent?.trim())).toEqual(WEEKLY.map((p) => p.label));
    expect(el.querySelector('path[stroke="#60a5fa"]')?.getAttribute('d')).toMatch(/^M/);
  });

  // AC-5.2
  it('defaults to Weekly and reloads data when another period is selected', async () => {
    const calls: SalesPeriod[] = [];
    const { fixture, el } = await setup({
      getSales: (p) => {
        calls.push(p);
        return of(p === 'monthly' ? MONTHLY : WEEKLY);
      },
    });
    const select = el.querySelector('select')!;
    expect(select.value).toBe('weekly');

    select.value = 'monthly';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(calls).toEqual(['weekly', 'monthly']);
    expect(select.value).toBe('monthly');
    expect(all(el, 'x-label').map((t) => t.textContent?.trim())).toEqual(['W1', 'W2']);
  });

  // AC-5.3
  it('shows a tooltip and highlights the point on hover, and hides it on leave', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('[data-testid="tooltip"]')).toBeNull();

    all(el, 'hover-target')[6].dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();

    const tooltip = el.querySelector('[data-testid="tooltip"]');
    expect(tooltip?.textContent).toContain('Sales');
    expect(tooltip?.textContent).toContain('3,672');
    expect(all(el, 'data-point')[6].getAttribute('r')).toBe('6');

    el.querySelector('svg[role="img"]')!.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="tooltip"]')).toBeNull();
  });

  // AC-5.4
  it('shows an empty message when there is no data', async () => {
    const { el } = await setup({ getSales: () => of([]) });
    expect(el.textContent).toContain('No sales data for this period.');
    expect(el.querySelector('svg[role="img"]')).toBeNull();
  });

  it('shows an error message when the API fails', async () => {
    const { el } = await setup({ getSales: () => throwError(() => new Error('500')) });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load sales data");
    expect(el.querySelector('svg[role="img"]')).toBeNull();
  });

  // AC-7.2
  it('provides a text alternative for the chart', async () => {
    const { el } = await setup();
    const svg = el.querySelector('svg[role="img"]')!;
    expect(svg.getAttribute('aria-describedby')).toBe('sales-table');
    expect(el.querySelectorAll('#sales-table tbody tr').length).toBe(WEEKLY.length);
  });
});
