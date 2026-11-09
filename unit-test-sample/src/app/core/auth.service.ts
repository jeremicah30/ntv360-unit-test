import { Injectable, signal } from '@angular/core';

export const TOKEN_KEY = 'auth_token';

/**
 * Mock auth: any non-empty credentials are accepted and a fake token is stored.
 * Replace `login` with a real API call when a backend exists.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly isAuthenticated = () => this.token() !== null;

  login(email: string, password: string): boolean {
    if (!email.trim() || !password) return false;
    const token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
    return true;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.clear();
    this.token.set(null);
  }
}
