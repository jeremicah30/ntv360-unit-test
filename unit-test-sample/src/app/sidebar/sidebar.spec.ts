import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TOKEN_KEY } from '../core/auth.service';
import { Sidebar } from './sidebar';

@Component({ template: '' })
class Blank {}

const LABELS = ['Dashboard', 'Transaction', 'Reports', 'Documents', 'Store', 'Notification', 'Profile', 'Settings'];

describe('Sidebar', () => {
  async function setup(url = '/dashboard') {
    localStorage.setItem(TOKEN_KEY, 'abc');
    sessionStorage.setItem('cart', '1');
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    const fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const links = () => Array.from(el.querySelectorAll<HTMLAnchorElement>('nav a'));
    return { fixture, router, el, links };
  }

  beforeEach(() => localStorage.clear());

  // AC-1.1 + AC-7.2
  it('renders the logo and menu items in order, each with an icon and label, inside a nav landmark', async () => {
    const { el, links } = await setup();
    expect(el.textContent).toContain('Shop');
    expect(el.querySelector('nav[aria-label="Main"]')).not.toBeNull();
    expect(links().map((a) => a.textContent?.trim())).toEqual(LABELS);
    links().forEach((a) => expect(a.querySelector('svg')).not.toBeNull());
  });

  // AC-1.2
  it('marks only Dashboard as active on the Dashboard route', async () => {
    const { links } = await setup('/dashboard');
    const active = links().filter((a) => a.classList.contains('bg-blue-500'));
    expect(active.map((a) => a.textContent?.trim())).toEqual(['Dashboard']);
    expect(active[0].classList).toContain('text-white');
    expect(active[0].getAttribute('aria-current')).toBe('page');
    links()
      .filter((a) => a !== active[0])
      .forEach((a) => expect(a.classList).toContain('text-slate-600'));
  });

  // AC-1.3
  it('navigates on click and moves the active state', async () => {
    const { fixture, router, links } = await setup('/dashboard');
    links()[2].click(); // Reports
    await fixture.whenStable();

    expect(router.url).toBe('/reports');
    expect(links()[2].classList).toContain('bg-blue-500');
    expect(links()[0].classList).not.toContain('bg-blue-500');
  });

  // AC-1.4: native links are keyboard focusable and activate on Enter; focus style present.
  it('uses focusable links with hover and focus styles', async () => {
    const { links } = await setup();
    links().forEach((a) => {
      expect(a.getAttribute('href')).toBeTruthy();
      expect(a.className).toContain('focus-visible:outline-2');
    });
    expect(links()[1].className).toContain('hover:bg-white/60');
  });

  // AC-2.1
  it('shows Log Out with an icon outside the menu list', async () => {
    const { el } = await setup();
    const logout = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Log Out'));
    expect(logout).toBeDefined();
    expect(logout!.querySelector('svg')).not.toBeNull();
    expect(logout!.closest('nav')).toBeNull();
  });

  it('shows the Upgrade to Pro card above Log Out', async () => {
    const { el } = await setup();
    const card = el.querySelector('[data-testid="upgrade-card"]')!;
    expect(card.textContent).toContain('Upgrade to Pro');
    expect(card.textContent).toContain('Upgrade Now');
    const logout = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Log Out'))!;
    expect(card.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // AC-2.2
  it('clears the session and redirects to /login on Log Out', async () => {
    const { fixture, router, el } = await setup();
    const logout = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Log Out'))!;
    logout.click();
    await fixture.whenStable();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(router.url).toBe('/login');
  });

  // AC-7.1
  it('collapses the menu behind a toggle on mobile', async () => {
    const { fixture, el } = await setup();
    const toggle = el.querySelector<HTMLButtonElement>('button[aria-controls="sidebar-menu"]')!;
    const menu = el.querySelector('#sidebar-menu')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.classList).toContain('hidden');
    expect(menu.classList).toContain('md:flex');

    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu.classList).not.toContain('hidden');
  });
});
