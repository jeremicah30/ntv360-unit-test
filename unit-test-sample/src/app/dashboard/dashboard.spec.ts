import { TestBed } from '@angular/core/testing';
import { DashboardDataService } from '../core/dashboard-data.service';
import { mockDataService } from '../testing/dashboard-data.mock';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [{ provide: DashboardDataService, useValue: mockDataService() }],
    });
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  // AC-3.1
  it('shows the Dashboard heading', async () => {
    const { el } = await setup();
    expect(el.querySelector('h1')?.textContent).toBe('Dashboard');
  });

  it('shows the signed-in user and the right-hand insight panels', async () => {
    const { el } = await setup();
    expect(el.querySelector('[data-testid="user-badge"]')?.textContent).toContain('Angelina Joli');
    const aside = el.querySelector('aside[aria-label="Sales insights"]')!;
    expect(aside.querySelector('app-sales-donut')).not.toBeNull();
    expect(aside.querySelector('app-analytics-chart')).not.toBeNull();
  });

  // AC-3.2
  it('filters the order table as the user types and restores it when cleared', async () => {
    const { fixture, el } = await setup();
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    const rowCount = () => el.querySelectorAll('[data-testid="order-row"]').length;
    expect(rowCount()).toBe(4);

    input.value = 'iphone';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(input.value).toBe('iphone');
    expect(rowCount()).toBe(1);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(rowCount()).toBe(4);
  });
});
