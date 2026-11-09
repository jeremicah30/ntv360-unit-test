import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  path: string;
  /** SVG path data, drawn on a 24x24 stroke icon. */
  icon: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  host: { class: 'flex flex-col' },
})
export class Sidebar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly items: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'] },
    { label: 'Transaction', path: '/transaction', icon: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'] },
    { label: 'Reports', path: '/reports', icon: ['M21 12A9 9 0 1 1 12 3', 'M12 3a9 9 0 0 1 9 9h-9z'] },
    {
      label: 'Documents',
      path: '/documents',
      icon: [
        'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
        'M14 3v5h5',
        'M9 13h6',
        'M9 17h6',
      ],
    },
    { label: 'Store', path: '/store', icon: ['M3 9l2-5h14l2 5', 'M3 9h18', 'M5 9v11h14V9', 'M9 20v-6h6v6'] },
    { label: 'Notification', path: '/notification', icon: ['M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z', 'M10 21a2 2 0 0 0 4 0'] },
    { label: 'Profile', path: '/profile', icon: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'] },
    {
      label: 'Settings',
      path: '/settings',
      icon: [
        'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        'M12 2v3',
        'M12 19v3',
        'M2 12h3',
        'M19 12h3',
        'M4.9 4.9 7 7',
        'M17 17l2.1 2.1',
        'M4.9 19.1 7 17',
        'M17 7l2.1-2.1',
      ],
    },
  ];

  protected readonly logoutIcon = [
    'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3',
    'M10 17l-5-5 5-5',
    'M5 12h11',
  ];

  /** Mobile only: whether the collapsed menu is expanded. */
  protected readonly menuOpen = signal(false);

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
