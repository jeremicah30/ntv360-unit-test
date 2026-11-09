---
description: Generate and run unit tests from a Jira ticket's acceptance criteria (UAC)
argument-hint: <JIRA-KEY e.g. NTV-123>
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(npx ng test:*), Bash(npx vitest:*), Bash(npx jest:*), Bash(npm test:*), Read, Write, Edit, Glob, Grep
---

Run the UAC unit-test workflow for Jira ticket **$ARGUMENTS**. If no ticket key was given, ask for one and stop.

## Open the test dashboard first
Do this before step 0, as your first action. The dashboard ships with this plugin in its `dashboard/` folder (`${CLAUDE_PLUGIN_ROOT}/dashboard/`). If that variable is empty, find the newest `~/.claude/plugins/cache/*/uac-test/*/dashboard/server.mjs` with Glob.

1. **Server.** If `http://127.0.0.1:5178/` already answers (`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5178/` returns 200), reuse it. Otherwise start `node "<plugin>/dashboard/server.mjs"` in the background **from the project root**. It opens the browser tab itself and prints `Test dashboard running at http://127.0.0.1:5178/`. Give the user that link.
2. **Reporter (first run in a project).** Test runs reach the dashboard through `tools/test-dashboard/reporter.mjs` registered as a test reporter. Check whether the project has it:
   - Angular (`@angular/build:unit-test`): `angular.json` → test target `options.reporters` contains `./tools/test-dashboard/reporter.mjs`.
   - Plain Vitest: the `reporters` array in `vitest.config.*`.
   If it is missing, ask the user once: "Add the test dashboard reporter to this project? (copies one file to tools/test-dashboard/reporter.mjs and adds it to the test reporters)". On yes, copy `<plugin>/dashboard/reporter.mjs` there and set reporters to `["default", "./tools/test-dashboard/reporter.mjs"]`, keeping any reporters already listed. This is the only build-config change this command may make, and only with that approval. On no, continue without live results.
3. Never pass `--reporters` on the command line: it replaces the dashboard reporter for that run.
4. The server never exits. Never read test results from the dashboard; use the targeted run command.

## 0. Learn this repo's testing setup
Read the "Unit testing" section of this repo's `CLAUDE.md` or `.claude/CLAUDE.md`. It defines the runner, the targeted run command, where specs live, and the mocking and selector conventions. Follow it.
If the repo has no such section, say so, propose one from the `unit-testing-section.md` template shipped with this plugin, and stop until the user agrees.

## 1. Fetch the ticket (read-only)
Use the Atlassian MCP server (`atlassian`). If it is not connected, tell the user to run `/mcp` and sign in, then stop.
Get the acceptance criteria from, in this order: the description, an "Acceptance Criteria" field, then the comments.
If there are none, say so and stop. Do not invent criteria.

## 2. Map criteria to tests and WAIT
Show a table: `AC# | criterion | planned test(s) | unit-testable?`.
Mark criteria that cannot be unit tested (pure visual layout, real routing between pages, real backend data) and say why.
Ask the user to approve the table. Do not write any spec before they approve.

## 3. Write the specs
- Find the files this work touches: `git diff --name-only <base>...HEAD` and `git status --short`. Check the base branch with `git branch -r`.
- Put or extend spec files next to each source file, following the repo's conventions.
- Name every test `[$ARGUMENTS AC<n>] <behavior in plain words>`.
- Edit spec files only. If a spec needs a source change (for example a missing test id), ask first.

## 4. Run only those specs
The dashboard opened at the start shows results live, grouped by AC, with a "Why it failed" note and a "Fix with Claude" button per failure. Use the targeted run command from the repo's testing section. Never run the full suite as a gate.
- A test that fails because of a mistake in the test: fix it and rerun.
- A test that fails because the code does not meet the criterion: do not change the assertion. Report it.
- If the command itself fails (runner not set up, compile error in unrelated specs), show the error and stop. Do not install packages or edit build config yourself.

## 5. Report in chat
Totals, then a table `AC# | result (pass / fail / not unit-testable) | test names`, then one line per failing or untested criterion.

## 6. Jira comment (ONE per run, only after approval)
Draft a single comment:
- Heading `Unit test results (/uac-test:run)`
- Branch name and `git rev-parse --short HEAD`
- Totals and the compact `AC | result | tests` table
- One line per failing or untested criterion
- No logs, no screenshots, no per-test comments

Show the exact text and WAIT for approval. On approval, list the ticket's comments first: if you already posted a `Unit test results (/uac-test:run)` comment, edit it, otherwise add one.
Never edit or transition the ticket itself.

## Rules
- Never `git commit` or `git push`.
- Never weaken an assertion to make a test pass.
- Follow the repo's formatter settings (indentation, quotes).
