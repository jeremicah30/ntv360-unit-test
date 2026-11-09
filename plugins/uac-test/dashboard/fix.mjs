// "Fix with Claude": runs Claude Code headless to fix the app code behind one failing test,
// then re-runs that spec so the dashboard shows the new result.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, sep } from 'node:path';

// The dashboard server is started from the project root (see server.mjs).
const PROJECT_ROOT = process.cwd() + sep;
// Relative spec path inside the project, no "..": src/app/x.spec.ts, tests/y.test.js, ...
const SPEC_PATH = /^(?!.*\.\.)[\w\-./]+\.(spec|test)\.[cm]?[jt]sx?$/;
const TIMEOUT_MS = 10 * 60 * 1000;
const MAX_LOG_LINES = 200;

// Claude may read anything, edit source files only, and run tests only.
const ALLOWED_TOOLS = ['Read', 'Glob', 'Grep', 'Edit(src/**)', 'Bash(npx ng test:*)', 'Bash(npx vitest:*)'];
const DENIED_TOOLS = ['Write', 'Edit(**/*.spec.*)', 'Edit(**/*.test.*)', 'Edit(**/testing/**)'];

/** How to run one spec in this project: Angular CLI if present, else Vitest. */
function specRunner(file) {
  const projectRequire = createRequire(join(PROJECT_ROOT, 'package.json'));
  try {
    const ng = projectRequire.resolve('@angular/cli/bin/ng.js');
    return { bin: ng, args: ['test', '--watch=false', '--include', file], display: `npx ng test --watch=false --include "${file}"` };
  } catch {
    const vitest = projectRequire.resolve('vitest/vitest.mjs');
    return { bin: vitest, args: ['run', file], display: `npx vitest run "${file}"` };
  }
}

function verifyCommand(file) {
  try {
    return specRunner(file).display;
  } catch {
    return `the project's test command, limited to ${file}`;
  }
}

function buildPrompt(test) {
  const errors = (test.errors ?? [])
    .map((e) => [e.message, e.diff, e.location && `at ${e.location}`].filter(Boolean).join('\n'))
    .join('\n\n');
  return [
    'A unit test in this project is failing.',
    '',
    `Test: ${test.fullName}`,
    `Spec file: ${test.file}`,
    'Error:',
    errors || '(no error details)',
    '',
    'Fix the application source code so this test passes and the acceptance criterion in the test name is met.',
    'Rules:',
    '- Read the "Unit testing" section of CLAUDE.md first.',
    '- Do not edit any *.spec.* / *.test.* file or anything in a testing/ folder. Never weaken a test.',
    '- Make the smallest change that fixes it.',
    `- Verify with: ${verifyCommand(test.file)}`,
    '- If the test itself looks wrong, change nothing and explain why.',
    'Finish with one or two sentences: what you changed and why.',
  ].join('\n');
}

/**
 * Environment without the variables a parent Claude Code session sets, so the fix runs as
 * its own session even when this server was started from inside Claude Code.
 */
function standaloneEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key === 'CLAUDECODE' || key.startsWith('CLAUDE_CODE_') || ['CLAUDE_PID', 'CLAUDE_AGENT_SDK_VERSION', 'CLAUDE_EFFORT'].includes(key)) {
      delete env[key];
    }
  }
  return env;
}

/** Turns one stream-json line from `claude -p` into a short log line, or null. */
function summarize(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return null;
  }
  if (msg.type === 'assistant') {
    return (msg.message?.content ?? [])
      .map((c) => {
        if (c.type === 'text') return c.text.trim();
        if (c.type === 'tool_use') {
          const target = c.input?.file_path ?? c.input?.path ?? c.input?.pattern ?? c.input?.command ?? '';
          return `→ ${c.name} ${String(target).replace(PROJECT_ROOT, '')}`.trim();
        }
        return '';
      })
      .filter(Boolean)
      .join('\n') || null;
  }
  if (msg.type === 'result') {
    return { result: msg.result ?? '', isError: Boolean(msg.is_error), cost: msg.total_cost_usd ?? null };
  }
  return null;
}

export function createFixer(onChange) {
  /** Only one fix runs at a time; the last one stays visible. */
  let job = null;

  function log(text) {
    job.log.push(text);
    if (job.log.length > MAX_LOG_LINES) job.log.splice(0, job.log.length - MAX_LOG_LINES);
    onChange();
  }

  function finish(status, summary) {
    if (job.status !== 'running') return;
    clearTimeout(job.timer);
    job.status = status;
    job.summary = summary ?? job.summary;
    job.endedAt = Date.now();
    onChange();
  }

  function rerunSpec(file) {
    let runner;
    try {
      runner = specRunner(file);
    } catch {
      finish('failed', 'Could not find Angular CLI or Vitest in this project to re-run the spec.');
      return;
    }
    log(`→ Re-running ${file}`);
    // No shell: node runs the project's own CLI with the file as a plain argument.
    const child = spawn(process.execPath, [runner.bin, ...runner.args], { cwd: PROJECT_ROOT, stdio: 'ignore' });
    child.on('exit', (code) => {
      log(code === 0 ? '✓ Spec passes now.' : '✗ Spec still fails. See the latest run.');
      finish(code === 0 ? 'fixed' : 'failed');
    });
    child.on('error', (err) => finish('failed', `Could not re-run the spec: ${err.message}`));
  }

  function start(test) {
    if (job?.status === 'running') return { ok: false, error: 'A fix is already running.' };
    if (!test || !SPEC_PATH.test(test.file ?? '')) return { ok: false, error: 'Unknown or invalid test.' };

    job = { testName: test.fullName, file: test.file, status: 'running', log: [], summary: null, cost: null, startedAt: Date.now(), endedAt: null };

    // No shell: the prompt is passed as a single argument.
    const child = spawn(
      'claude',
      [
        '-p', buildPrompt(test),
        '--output-format', 'stream-json',
        '--verbose',
        '--permission-mode', 'dontAsk',
        '--allowedTools', ...ALLOWED_TOOLS,
        '--disallowedTools', ...DENIED_TOOLS,
      ],
      { cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: standaloneEnv() },
    );
    job.timer = setTimeout(() => {
      child.kill();
      finish('failed', 'Stopped after 10 minutes.');
    }, TIMEOUT_MS);

    let buffer = '';
    let claudeFailed = false;
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const s = summarize(line);
        if (typeof s === 'string') log(s);
        else if (s) {
          job.summary = s.result;
          job.cost = s.cost;
          claudeFailed = s.isError;
        }
      }
    });
    child.stderr.on('data', (chunk) => log(String(chunk).trim()));
    child.on('error', (err) => finish('failed', `Could not start Claude Code: ${err.message}`));
    child.on('exit', (code) => {
      if (job.status !== 'running') return;
      if (code !== 0 || claudeFailed) {
        finish('failed', job.summary || `Claude Code exited with code ${code}.`);
      } else {
        rerunSpec(test.file);
      }
    });

    onChange();
    return { ok: true };
  }

  return {
    start,
    state: () => (job ? { ...job, timer: undefined } : null),
  };
}
