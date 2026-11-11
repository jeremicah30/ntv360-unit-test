// Local test dashboard server, shipped with the uac-test plugin. Run it from the project root:
//   node <plugin>/dashboard/server.mjs            start the dashboard and open it in the browser
//                                                 (if it is already running, ask it to open the page; a tab
//                                                 opens only when no dashboard tab is connected)
//   --ticket=NTV-123                              ticket key shown in the "tests are starting" notification
//   node <plugin>/dashboard/server.mjs --watch    also run `ng test --watch` (Angular) so edits re-run tests
//   --no-open                                     don't open the browser
// The project's copy of reporter.mjs posts run events here; the page receives them over SSE.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createFixer } from './fix.mjs';

const PORT = Number(process.env.TEST_DASHBOARD_PORT ?? 5178);
const HOST = '127.0.0.1';
const URL_ = `http://127.0.0.1:${PORT}/`;
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
const MAX_RUNS = 10;
const MAX_BODY_BYTES = 1_000_000;
const BROADCAST_DELAY_MS = 100;
// Open tabs reconnect to a restarted server within ~3s (EventSource retry), so wait before
// deciding that no tab is open.
const RECONNECT_GRACE_MS = 4000;

const args = new Set(process.argv.slice(2));
const TICKET_RE = /^[A-Z][A-Z0-9]*-\d+$/i;
const ticketArg = process.argv.find((a) => a.startsWith('--ticket='))?.slice('--ticket='.length);
const TICKET = TICKET_RE.test(ticketArg ?? '') ? ticketArg.toUpperCase() : null;
const page = new URL('./index.html', import.meta.url);

/** Newest run last. */
const runs = [];
const clients = new Set();
let broadcastTimer = null;
const fixer = createFixer(() => scheduleBroadcast());
// Embedded in the served page and required by /api/fix, so only this dashboard can start fixes.
const FIX_TOKEN = randomUUID();
// Lets open pages notice a server restart and reload to pick up the new token.
const INSTANCE_ID = randomUUID();

function findRun(runId) {
  return runs.find((r) => r.id === runId);
}

function applyEvent({ type, runId, data }) {
  if (typeof runId !== 'string' || !data || typeof data !== 'object') return;

  if (type === 'run-start') {
    runs.push({ id: runId, status: 'running', startedAt: data.startedAt, endedAt: null, reason: null, tests: {}, unhandledErrors: [] });
    if (runs.length > MAX_RUNS) runs.shift();
    return;
  }

  const run = findRun(runId);
  if (!run) return;

  if (type === 'tests-collected' && Array.isArray(data.tests)) {
    for (const t of data.tests) run.tests[t.id] ??= t;
  } else if (type === 'test-result' && data.test) {
    run.tests[data.test.id] = data.test;
  } else if (type === 'run-end') {
    const tests = Object.values(run.tests);
    const failed = tests.some((t) => t.state === 'failed') || data.unhandledErrors?.length > 0;
    run.status = data.reason === 'interrupted' ? 'interrupted' : failed ? 'failed' : 'passed';
    run.endedAt = data.endedAt;
    run.reason = data.reason;
    run.unhandledErrors = Array.isArray(data.unhandledErrors) ? data.unhandledErrors : [];
  }
}

function snapshot() {
  return JSON.stringify({ instance: INSTANCE_ID, runs, fix: fixer.state() });
}

function findTest(runId, testId) {
  return findRun(runId)?.tests[testId] ?? null;
}

function scheduleBroadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    const message = `data: ${snapshot()}\n\n`;
    for (const res of clients) res.write(message);
  }, BROADCAST_DELAY_MS);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  // Block DNS-rebinding: only answer requests addressed to this machine.
  if (!ALLOWED_HOSTS.has(req.headers.host ?? '')) {
    res.writeHead(403).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com",
    });
    res.end((await readFile(page, 'utf8')).replace('__FIX_TOKEN__', FIX_TOKEN));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/fix') {
    if (req.headers['x-fix-token'] !== FIX_TOKEN || !req.headers['content-type']?.startsWith('application/json')) {
      res.writeHead(403).end();
      return;
    }
    try {
      const { runId, testId } = JSON.parse(await readBody(req));
      // A later run may already have fixed this failure.
      const outcome = runId === runs.at(-1)?.id
        ? fixer.start(findTest(runId, testId))
        : { ok: false, error: 'This run is out of date. Fix from the latest run.' };
      res.writeHead(outcome.ok ? 202 : 409, { 'content-type': 'application/json' }).end(JSON.stringify(outcome));
    } catch {
      res.writeHead(400).end();
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`data: ${snapshot()}\n\n`);
    clients.add(res);
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => {
      clearInterval(keepAlive);
      clients.delete(res);
    });
    return;
  }

  // Sent by a second `server.mjs` start while this one is running.
  if (req.method === 'POST' && req.url === '/api/open') {
    if (req.headers['x-test-dashboard'] !== '1') {
      res.writeHead(403).end();
      return;
    }
    try {
      const { ticket } = JSON.parse((await readBody(req)) || '{}');
      openIfNoTab(TICKET_RE.test(ticket ?? '') ? ticket.toUpperCase() : null);
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
    return;
  }

  // The custom header can't be sent cross-origin without a CORS preflight, which this
  // server never approves, so web pages can't post fake results here.
  if (req.method === 'POST' && req.url === '/api/event') {
    if (req.headers['x-test-dashboard'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) {
      res.writeHead(403).end();
      return;
    }
    try {
      applyEvent(JSON.parse(await readBody(req)));
      scheduleBroadcast();
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
    return;
  }

  res.writeHead(404).end();
});

function openBrowser() {
  const [cmd, cmdArgs] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', URL_]]
      : process.platform === 'darwin'
        ? ['open', [URL_]]
        : ['xdg-open', [URL_]];
  spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

// A dashboard tab counts as open while its event stream is connected. Browsers won't let us
// switch to an open tab, so ask it to show a notification; clicking that focuses the tab.
function openIfNoTab(ticket) {
  if (clients.size === 0) {
    openBrowser();
    return;
  }
  const message = `event: focus-request\ndata: ${JSON.stringify({ ticket })}\n\n`;
  for (const res of clients) res.write(message);
}

function startWatchRun() {
  if (!args.has('--watch')) return;
  // Fixed command, no user input: a shell is needed to resolve npx on Windows.
  const child = spawn('npx ng test --watch', { stdio: 'inherit', shell: true });
  const stop = () => child.kill();
  process.on('SIGINT', () => {
    stop();
    process.exit(0);
  });
  process.on('exit', stop);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Test dashboard already running at ${URL_}`);
    if (!args.has('--no-open')) {
      fetch(`${URL_}api/open`, {
        method: 'POST',
        headers: { 'x-test-dashboard': '1', 'content-type': 'application/json' },
        body: JSON.stringify({ ticket: TICKET }),
      }).catch(() => {});
    }
    startWatchRun();
    return;
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`Test dashboard running at ${URL_}`);
  if (!args.has('--no-open')) setTimeout(() => openIfNoTab(TICKET), RECONNECT_GRACE_MS);
  startWatchRun();
});
