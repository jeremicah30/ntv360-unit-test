import { TestBed } from '@angular/core/testing';
import { NEVER, throwError } from 'rxjs';
import { DashboardDataService } from '../../core/dashboard-data.service';
import { mockDataService } from '../../testing/dashboard-data.mock';
import { SalesDonut } from './sales-donut';

describe('SalesDonut', () => {
  async function setup(overrides: Partial<DashboardDataService> = {}, waitForData = true) {
    TestBed.configureTestingModule({
      providers: [{ provide: DashboardDataService, useValue: mockDataService(overrides) }],
    });
    const fixture = TestBed.createComponent(SalesDonut);
    if (waitForData) await fixture.whenStable();
    else fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the percentage, one arc per segment and a legend', async () => {
    const el = await setup();
    expect(el.querySelector('[data-testid="donut-percent"]')?.textContent?.trim()).toBe('70%');
    expect(el.querySelectorAll('[data-testid="donut-arc"]').length).toBe(3);
    expect(Array.from(el.querySelectorAll('li')).map((li) => li.textContent?.trim())).toEqual([
      'Sale',
      'Distribute',
      'Return',
    ]);
  });

  it('places arcs end to end with lengths matching their share', async () => {
    const el = await setup();
    const c = 2 * Math.PI * 40;
    const arcs = Array.from(el.querySelectorAll('[data-testid="donut-arc"]'));
    expect(Number(arcs[0].getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
    expect(Number(arcs[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(-0.45 * c);
    expect(Number(arcs[2].getAttribute('stroke-dashoffset'))).toBeCloseTo(-0.7 * c);
  });

  it('describes the chart for screen readers', async () => {
    const el = await setup();
    expect(el.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe(
      'Sales breakdown 70%: Sale 45%, Distribute 25%, Return 20%',
    );
  });

  it('shows loading and error states', async () => {
    const loading = await setup({ getSalesBreakdown: () => NEVER }, false);
    expect(loading.querySelector('[data-testid="donut-skeleton"]')).not.toBeNull();
    TestBed.resetTestingModule();

    const failed = await setup({ getSalesBreakdown: () => throwError(() => new Error('500')) });
    expect(failed.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load the sales breakdown");
  });
});
