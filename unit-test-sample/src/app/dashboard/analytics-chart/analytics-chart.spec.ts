import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { DashboardDataService } from '../../core/dashboard-data.service';
import { ANALYTICS, mockDataService } from '../../testing/dashboard-data.mock';
import { AnalyticsChart } from './analytics-chart';

describe('AnalyticsChart', () => {
  async function setup(overrides: Partial<DashboardDataService> = {}, waitForData = true) {
    TestBed.configureTestingModule({
      providers: [{ provide: DashboardDataService, useValue: mockDataService(overrides) }],
    });
    const fixture = TestBed.createComponent(AnalyticsChart);
    if (waitForData) await fixture.whenStable();
    else fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const all = (el: HTMLElement, id: string) => Array.from(el.querySelectorAll(`[data-testid="${id}"]`));

  it('renders two bars per day with day labels and a 0–100 axis', async () => {
    const { el } = await setup();
    expect(el.querySelector('h2')?.textContent).toBe('Analytics');
    expect(all(el, 'analytics-bar').length).toBe(ANALYTICS.length * 2);
    expect(all(el, 'analytics-day').map((d) => d.textContent?.trim())).toEqual(['Sun', 'Mon', 'Tue']);
    expect(all(el, 'analytics-y-tick').map((t) => t.textContent?.trim())).toEqual(['0', '20', '40', '60', '80', '100']);
  });

  it('scales bar height to the amount', async () => {
    const { el } = await setup();
    const heights = all(el, 'analytics-bar').map((b) => Number(b.getAttribute('height')));
    // Sun: previous 2750 vs current 3500
    expect(heights[1] / heights[0]).toBeCloseTo(3500 / 2750);
  });

  it('shows the amount in a tooltip on hover and hides it on leave', async () => {
    const { fixture, el } = await setup();
    all(el, 'analytics-bar')[5].dispatchEvent(new MouseEvent('mouseenter')); // Tue current
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="analytics-tooltip"]')?.textContent?.trim()).toBe('3.33k');

    el.querySelector('svg[role="img"]')!.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="analytics-tooltip"]')).toBeNull();
  });

  it('provides a text alternative', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('#analytics-table tbody tr').length).toBe(ANALYTICS.length);
  });

  it('shows loading, empty and error states', async () => {
    const loading = await setup({ getAnalytics: () => NEVER }, false);
    expect(loading.el.querySelector('[data-testid="analytics-skeleton"]')).not.toBeNull();
    TestBed.resetTestingModule();

    const empty = await setup({ getAnalytics: () => of([]) });
    expect(empty.el.textContent).toContain('No analytics data yet.');
    TestBed.resetTestingModule();

    const failed = await setup({ getAnalytics: () => throwError(() => new Error('500')) });
    expect(failed.el.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load analytics");
  });
});
