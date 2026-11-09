import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  host: { class: 'grid min-h-dvh place-items-center bg-linear-to-br from-[#fde2d4] via-[#f7e6f1] to-[#dccafb] p-4' },
  template: `
    <form
      class="w-full max-w-sm space-y-4 rounded-3xl border border-white/60 bg-white/60 p-8 shadow-xl backdrop-blur-xl"
      (submit)="submit($event, email.value, password.value)"
    >
      <h1 class="text-2xl font-semibold text-slate-800">Log in</h1>
      <label class="block text-sm text-slate-600">
        Email
        <input #email type="email" name="email" required autocomplete="username"
          class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-400" />
      </label>
      <label class="block text-sm text-slate-600">
        Password
        <input #password type="password" name="password" required autocomplete="current-password"
          class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-400" />
      </label>
      @if (error()) {
        <p role="alert" class="text-sm text-red-500">Enter your email and password.</p>
      }
      <button type="submit" class="w-full rounded-lg bg-blue-500 py-2 font-medium text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
        Log in
      </button>
    </form>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly error = signal(false);

  protected submit(event: Event, email: string, password: string): void {
    event.preventDefault();
    if (this.auth.login(email, password)) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set(true);
    }
  }
}
