---
description: Generate and run unit tests from a Jira ticket's acceptance criteria (UAC)
argument-hint: <JIRA-KEY e.g. NTV-123>
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(npx ng test:*), Bash(npx vitest:*), Bash(npx jest:*), Bash(npm test:*), Bash(curl --location 'https://api.media.atlassian.com/file/binary:*), Read, Write, Edit, Glob, Grep
---

Run the UAC unit-test workflow for the Jira ticket given as: `$ARGUMENTS`

## Ticket key (required, check before anything else)
The input must be exactly one Jira issue key: letters, a hyphen, digits (for example `NTV-123`; case-insensitive). Upper-case it; it is called **KEY** below.
- If the input is empty, is a sentence, or contains anything other than one key: do nothing else. Ask for the ticket key in one line ("Which Jira ticket? Reply with the key, e.g. `NTV-123`.") and end your turn. Do not open the dashboard, read files, or guess a key from earlier conversation.
- If the user's next message is exactly one key, use it as KEY and continue this workflow from "Open the test dashboard first". If it is anything else, the run is over: handle that message normally.
- If the input contains a request besides the key, ignore the request for this run and mention it in one line.

## Open the test dashboard first
Once you have a valid KEY, do this before step 0. The dashboard ships with this plugin in its `dashboard/` folder (`${CLAUDE_PLUGIN_ROOT}/dashboard/`). If that variable is empty, find the newest `~/.claude/plugins/cache/*/uac-test/*/dashboard/server.mjs` with Glob.

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
- Name every test `[KEY AC<n>] <behavior in plain words>`, e.g. `[NTV-123 AC1.2] shows the heading`.
- Edit spec files only. If a spec needs a source change (for example a missing test id), ask first.

## 4. Run only those specs
The dashboard opened at the start shows results live, grouped by AC, with a "Why it failed" note and a "Fix with Claude" button per failure. Use the targeted run command from the repo's testing section. Never run the full suite as a gate.
- A test that fails because of a mistake in the test: fix it and rerun.
- A test that fails because the code does not meet the criterion: do not change the assertion. Report it.
- If the command itself fails (runner not set up, compile error in unrelated specs), show the error and stop. Do not install packages or edit build config yourself.

## 5. Capture UI screenshots (max 5)
Only when the specs run in a real browser: Vitest browser mode (`@angular/build:unit-test` with `browsers` set, or `test.browser.enabled` in `vitest.config.*`). With jsdom, Jest or Karma, skip this step and say "No screenshots: tests do not run in a real browser" in the chat report and the comment.
- Pick at most 5 rendered states that best show the criteria: failing visible criteria first, then one per changed component or key state. Never more than 5.
- Write ONE temporary spec next to the main spec: `<name>.uac-screenshots.spec.ts`. Copy the main spec's TestBed setup and mocks. For each state, render it, then `await page.elementLocator(el).screenshot({ path: '__uac-screenshots__/<n>-<slug>.png' })` with `import { page } from 'vitest/browser'`. Assert only that the element exists.
- Run it with the targeted run command. Move the PNGs to `<os temp dir>/uac-test/KEY/` (`node -p "require('os').tmpdir()"`). Delete the temporary spec and the `__uac-screenshots__` folder, then confirm `git status --short` lists neither.
- Read each PNG. Drop blank or wrong ones. If the element clips content (fixed height, scroll), say so in the caption.
- Screenshots use mock data. Never change source code to get a better picture.

## 6. Report in chat
Totals, then a table `AC# | result (pass / fail / not unit-testable) | test names`, then one line per failing or untested criterion, then the screenshot paths with one caption each.

## 7. Jira comment (ONE per run, only after approval)
Draft a single comment:
- Heading `Unit test results (/uac-test:run)`
- Branch name and `git rev-parse --short HEAD`
- Totals and the compact `AC | result | tests` table
- One line per failing or untested criterion
- `Screenshots` heading with one numbered caption per image (`1. AC<n>: <what it shows> (mock data)`), or the "No screenshots" line from step 5
- No logs, no per-test comments

Show the exact text and the screenshot list, then WAIT for approval. On approval:
1. List the ticket's comments with `responseContentFormat: "html"` and find an existing `Unit test results (/uac-test:run)` comment.
2. For each screenshot, in caption order: call `executeWrite` with `name: "uploadAttachmentToJiraIssue"` and inputs `issueIdOrKey`, `filePath` (no `fileId`). Run the returned `uploadCommand` in the shell and keep `data.id`, plus `collection` and `fileName` from the first response. Do not call the operation a second time with `fileId`: that adds a duplicate attachment.
3. Call `addOrEditJiraIssueComment` with `contentFormat: "html"`, the whole comment as HTML, and `inlineFileId`, `inlineFileCollection`, `inlineFileName` in caption order. The images append at the end, under the captions. Pass `commentId` to edit the existing comment, otherwise omit it to add one. An edit replaces the whole body, old images included. That is intended: each run shows its own screenshots.
4. Check that `inlineMediaCount` in the response equals the number of screenshots. If not, say so.

Never edit or transition the ticket itself.

## Rules
- Never `git commit` or `git push`.
- Never weaken an assertion to make a test pass.
- Follow the repo's formatter settings (indentation, quotes).
