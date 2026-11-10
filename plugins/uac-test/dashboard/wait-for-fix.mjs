// Waits for the next "Fix with Claude" in the test dashboard to finish, prints its result, then exits.
// /uac-test:run starts it in the background so the Claude Code session wakes up when a dashboard
// fix ends and can rerun the specs and redraft its report. Exits after 60 minutes without a fix.
//   node <plugin>/dashboard/wait-for-fix.mjs
const PORT = Number(process.env.TEST_DASHBOARD_PORT ?? 5178);
const TIMEOUT_MS = 60 * 60 * 1000;
const since = Date.now();

const res = await fetch(`http://127.0.0.1:${PORT}/events`).catch(() => null);
if (!res?.ok) {
  console.log(`Test dashboard is not running on port ${PORT}.`);
  process.exit(1);
}

setTimeout(() => {
  console.log('No dashboard fix finished within 60 minutes.');
  process.exit(0);
}, TIMEOUT_MS);

const decoder = new TextDecoder();
let buffer = '';
for await (const chunk of res.body) {
  buffer += decoder.decode(chunk, { stream: true });
  const messages = buffer.split('\n\n');
  buffer = messages.pop();
  for (const message of messages) {
    // Only the default event carries dashboard state; skip named events such as focus-request.
    if (message.split('\n').some((line) => line.startsWith('event:'))) continue;
    const data = message.split('\n').find((line) => line.startsWith('data: '));
    if (!data) continue;
    const fix = JSON.parse(data.slice('data: '.length)).fix;
    if (fix && fix.startedAt >= since && fix.status !== 'running') {
      console.log(`Dashboard fix finished: ${fix.status} (${fix.testName})`);
      if (fix.summary) console.log(fix.summary);
      process.exit(0);
    }
  }
}

console.log('Test dashboard stopped.');
process.exit(1);
