import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService, TOKEN_KEY } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores a token on login', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.login('user@test.com', 'secret')).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('rejects empty credentials', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.login(' ', '')).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
  });

  // AC-2.2
  it('clears the auth token and session on logout', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    sessionStorage.setItem('cart', '1');
    const auth = TestBed.inject(AuthService);

    auth.logout();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(auth.isAuthenticated()).toBe(false);
  });
});

describe('authGuard', () => {
  const runGuard = () =>
    TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  // AC-2.3
  it('redirects to /login when not authenticated', () => {
    const result = runGuard() as UrlTree;
    expect(result.toString()).toBe('/login');
  });

  it('allows access when authenticated', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    expect(runGuard()).toBe(true);
  });
});
