import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';

/** Authenticated layout: glass frame with the sidebar and the routed page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar],
  host: { class: 'block min-h-dvh bg-linear-to-br from-[#fde2d4] via-[#f7e6f1] to-[#dccafb]' },
  template: `
    <div class="flex min-h-dvh flex-col gap-6 bg-white/40 p-4 backdrop-blur-xl md:flex-row">
      <app-sidebar class="md:w-52 md:shrink-0" />
      <main class="min-w-0 flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class Shell {}
