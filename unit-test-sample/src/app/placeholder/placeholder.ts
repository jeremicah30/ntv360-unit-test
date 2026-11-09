import { Component, input } from '@angular/core';

/** Stand-in page for menu items that have no screen yet. */
@Component({
  selector: 'app-placeholder',
  host: { class: 'block' },
  template: `
    <h1 class="mb-4 text-2xl font-semibold text-slate-800">{{ title() }}</h1>
    <p class="rounded-2xl bg-white/70 p-6 text-slate-500 shadow-sm">This page is coming soon.</p>
  `,
})
export class Placeholder {
  /** Bound from route data via withComponentInputBinding. */
  readonly title = input('');
}
