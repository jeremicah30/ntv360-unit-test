// Vitest reporter that streams test runs to the local test dashboard (server.mjs).
// If the dashboard is not running, every send fails fast and is ignored.
import { relative } from 'node:path';

const PORT = Number(process.env.TEST_DASHBOARD_PORT ?? 5178);
const ENDPOINT = `http://127.0.0.1:${PORT}/api/event`;
const SEND_TIMEOUT_MS = 2000;
const MAX_VALUE_CHARS = 2000;

export default class TestDashboardReporter {
  pending = new Set();
  runId = null;
  root = process.cwd();

  onInit(vitest) {
    this.root = vitest?.config?.root ?? process.cwd();
  }

  onTestRunStart(specifications) {
    this.runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.send('run-start', { files: specifications.length, startedAt: Date.now() });
  }

  onTestModuleCollected(testModule) {
    const tests = [...testModule.children.allTests()].map((t) => this.describe(t));
    this.send('tests-collected', { tests });
  }

  onTestCaseResult(testCase) {
    this.send('test-result', { test: this.describe(testCase) });
  }

  async onTestRunEnd(_modules, unhandledErrors, reason) {
    this.send('run-end', {
      reason,
      endedAt: Date.now(),
      unhandledErrors: unhandledErrors.map((e) => e?.message ?? String(e)),
    });
    // Let in-flight posts finish so a one-shot run doesn't exit before they land.
    await Promise.allSettled([...this.pending]);
  }

  describe(testCase) {
    const result = testCase.result();
    const file = this.rel(testCase.module.moduleId);
    return {
      id: testCase.id,
      name: testCase.name,
      fullName: testCase.fullName,
      file,
      state: result.state,
      duration: testCase.diagnostic()?.duration ?? null,
      errors: (result.errors ?? []).map((e) => {
        const frame = e.stacks?.[0];
        return {
          message: e.message ?? String(e),
          diff: e.diff ?? null,
          expected: typeof e.expected === 'string' ? e.expected.slice(0, MAX_VALUE_CHARS) : null,
          actual: typeof e.actual === 'string' ? e.actual.slice(0, MAX_VALUE_CHARS) : null,
          location: frame ? `${this.rel(frame.file)}:${frame.line}:${frame.column}` : null,
        };
      }),
    };
  }

  rel(path) {
    return path ? relative(this.root, path).replaceAll('\\', '/') : '';
  }

  send(type, data) {
    if (!this.runId) return;
    const request = fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-dashboard': '1' },
      body: JSON.stringify({ type, runId: this.runId, data }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })
      .catch(() => {})
      .finally(() => this.pending.delete(request));
    this.pending.add(request);
  }
}
