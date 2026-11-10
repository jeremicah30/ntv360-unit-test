## Unit testing

- **Runner**: <Vitest | Jest | Karma+Jasmine> via <builder or script>.
- **Targeted run** (use this, not the full suite): `<command with --include / path glob>`
- **Test dashboard**: ships with the uac-test plugin; `/uac-test:run` opens it at `http://127.0.0.1:5178/`. Runs stream in through `tools/test-dashboard/reporter.mjs`, registered in <`angular.json` test options | `vitest.config.*`> `reporters`. Don't pass `--reporters` on the command line.
- **Colocation**: `x.component.spec.ts` / `x.service.spec.ts` next to the source.
- **Component style**: <standalone or NgModule; zoneless or zone.js; signal inputs via `fixture.componentRef.setInput`>.
- **Selectors**: <e.g. `[data-testid="..."]`>.
- **Mocks**: <e.g. `{ method: vi.fn().mockReturnValue(of(data)) } as unknown as Service`>. Never call a real API.
- **Names**: specs from Jira criteria are named `[<KEY> AC<n>] <behavior>`.
- **Don't test**: Angular itself, third-party libraries. Stub heavy child components.
- **Limits**: <e.g. jsdom has no real layout. Mark such criteria "not unit-testable">.
- **Baseline**: <known-failing specs or "full suite not verified green">. Run only the specs you wrote or changed.
- **Never weaken an assertion** to make a test pass. Report it.
- **Jira**: site `<https://your-site.atlassian.net>`, keys like `<KEY>-123`. `/uac-test:run` posts ONE summary comment per run after approval, with up to 5 UI screenshots when specs run in a real browser.
- **Git**: never commit or push unless asked.
