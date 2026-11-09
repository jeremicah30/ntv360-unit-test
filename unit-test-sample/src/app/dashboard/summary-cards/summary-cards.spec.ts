import { TestBed } from '@angular/core/testing';
import { NEVER, throwError } from 'rxjs';
import { DashboardDataService } from '../../core/dashboard-data.service';
import { mockDataService } from '../../testing/dashboard-data.mock';
import { SummaryCards } from './summary-cards';

describe('SummaryCards', () => {
  async function setup(overrides: Partial<DashboardDataService> = {}, waitForData = true) {
    TestBed.configureTestingModule({
      providers: [{ provide: DashboardDataService, useValue: mockDataService(overrides) }],
    });
    const fixture = TestBed.createComponent(SummaryCards);
    if (waitForData) await fixture.whenStable();
    else fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const texts = (el: HTMLElement, id: string) =>
    Array.from(el.querySelectorAll(`[data-testid="${id}"]`)).map((n) => n.textContent?.trim());

  // AC-4.1
  it('renders three cards with count, label and percentage', async () => {
    const el = await setup();
    expect(el.querySelectorAll('[data-testid="summary-card"]').length).toBe(3);
    expect(texts(el, 'summary-label')).toEqual(['Sales Products', 'Stock Products', 'Return Products']);
    expect(texts(el, 'summary-count')).toEqual(['2341+', '178+', '67+']);
  });

  // AC-4.2
  it('fills each ring to its percentage and shows the value inside', async () => {
    const el = await setup();
    const circumference = 2 * Math.PI * 16;
    const rings = Array.from(el.querySelectorAll('[data-testid="summary-ring"]'));
    [80, 30, 20].forEach((pct, i) => {
      const [filled] = rings[i].getAttribute('stroke-dasharray')!.split(' ').map(Number);
      expect(filled).toBeCloseTo((pct / 100) * circumference);
      expect(rings[i].closest('svg')!.textContent).toContain(`${pct}%`);
    });
  });

  // AC-4.3
  it('shows skeletons while loading', async () => {
    const el = await setup({ getSummary: () => NEVER }, false);
    expect(el.querySelectorAll('[data-testid="summary-skeleton"]').length).toBe(3);
    expect(el.querySelector('[data-testid="summary-card"]')).toBeNull();
  });

  it('shows an error state instead of broken values when the API fails', async () => {
    const el = await setup({ getSummary: () => throwError(() => new Error('500')) });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load the summary");
    expect(el.textContent).not.toContain('undefined');
  });
});
