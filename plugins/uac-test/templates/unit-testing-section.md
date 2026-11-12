## Unit testing

- **Runner**: <Vitest | Jest | Karma+Jasmine> via <builder or script>.
- **Targeted run** (use this, not the full suite): `<command with --include / path glob>`
- **Colocation**: `x.component.spec.ts` / `x.service.spec.ts` next to the source.
- **Component style**: <standalone or NgModule; zoneless or zone.js; signal inputs via `fixture.componentRef.setInput`>.
- **Selectors**: <e.g. `[data-testid="..."]`>.
- **Mocks**: <e.g. `{ method: vi.fn().mockReturnValue(of(data)) } as unknown as Service`>. Never call a real API.
- **Names**: specs from Jira criteria are named `[<KEY> AC<n>] <behavior>`; extra tests for changed code the criteria don't cover are named `[<KEY> E<n>] <behavior>`.
- **Don't test**: Angular itself, third-party libraries. Stub heavy child components.
- **Limits**: <e.g. jsdom has no real layout. Mark such criteria "not unit-testable">.
- **Baseline**: <known-failing specs or "full suite not verified green">. Run only the specs you wrote or changed, plus the existing specs for the files this work touches.
- **Never weaken an assertion** to make a test pass. Report it.
- **Jira**: site `<https://your-site.atlassian.net>`, keys like `<KEY>-123`. `/uac-test:run` posts ONE summary comment per run after approval, with up to 5 UI screenshots when specs run in a real browser.
- **Git**: never commit or push unless asked.
