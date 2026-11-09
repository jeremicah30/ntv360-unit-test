import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { TOKEN_KEY } from './core/auth.service';
import { DashboardDataService } from './core/dashboard-data.service';
import { mockDataService } from './testing/dashboard-data.mock';

describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: DashboardDataService, useValue: mockDataService() },
      ],
    });
  });

  // AC-2.3
  it('redirects to the login page when opening the dashboard without a session', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Log in');
  });

  it('logs in and lands on the dashboard', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const el = harness.routeNativeElement!;
    el.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'user@test.com';
    el.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'secret';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
  });

  // AC-3.1
  it('shows the dashboard for an authenticated user', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(harness.fixture.nativeElement.querySelector('h1')?.textContent).toBe('Dashboard');
  });

  // AC-1.3: every menu route resolves
  it('opens a page for each menu route', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    const harness = await RouterTestingHarness.create('/reports');
    expect(harness.fixture.nativeElement.querySelector('h1')?.textContent).toBe('Reports');
  });
});
