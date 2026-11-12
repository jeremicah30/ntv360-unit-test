---
description: Generate and run unit tests from a Jira ticket's acceptance criteria (UAC), or for your changes alone when there is no ticket
argument-hint: <JIRA-KEY e.g. NTV-123, or none>
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(npx ng test:*), Bash(npx vitest:*), Bash(npx jest:*), Bash(npm test:*), Bash(curl --location 'https://api.media.atlassian.com/file/binary:*), Read, Write, Edit, Glob, Grep
---

Run the UAC unit-test workflow for the Jira ticket given as: `$ARGUMENTS`

## Ticket key (check before anything else)
The input must be exactly one Jira issue key: letters, a hyphen, digits (for example `NTV-123`; case-insensitive), or the word `none`. Upper-case a key; it is called **KEY** below.
- If the input is empty, is a sentence, or contains anything other than one key or `none`: do nothing else. Ask in one line ("Which Jira ticket? Reply with the key, e.g. `NTV-123`, or `none` if there is no ticket.") and end your turn. Do not read files or guess a key from earlier conversation.
- If the user's next message is exactly one key, use it as KEY and continue this workflow from step 0. If it is exactly `none`, continue as a no-ticket run. If it is anything else, the run is over: handle that message normally.
- **`none`: no-ticket run.** There is no KEY. Test the changed code alone: run every step below, but skip everything about the ticket and its criteria (steps 1 and 7, the AC table, AC names). Plan, write and run only the baseline and the extra tests.
- If the input contains a request besides the key, ignore the request for this run and mention it in one line.

## 0. Learn this repo's testing setup
Read the "Unit testing" section of this repo's `CLAUDE.md` or `.claude/CLAUDE.md`. It defines the runner, the targeted run command, where specs live, and the mocking and selector conventions. Follow it.
If the repo has no such section, say so, propose one from the `unit-testing-section.md` template shipped with this plugin, and stop until the user agrees.

## 1. Fetch the ticket (read-only)
Use the Atlassian MCP server (`atlassian`). If it is not connected, tell the user to run `/mcp` and sign in, then stop.
Get the acceptance criteria from, in this order: the description, an "Acceptance Criteria" field, then the comments.
If there are none, say so and continue with extra tests only: skip the AC table, keep KEY for test names and the Jira comment. Do not invent criteria.

## 1a. Baseline: run the existing specs first
Before planning any test, find out which existing tests already fail.
- Find the files this work touches: `git diff --name-only <base>...HEAD` and `git status --short`. Check the base branch with `git branch -r`.
- The **baseline specs** are the existing spec files for those files: the touched spec files, plus the spec next to each touched source file (`x.ts` → `x.spec.ts`) when it exists.
- If there are none, note "No existing specs for the touched files" and go to step 2.
- Run only the baseline specs with the targeted run command.
- Note every failing test as **already failing**. Do not fix or change them. These failures come from your branch or are older; this run did not cause them.
- If the command itself fails (runner not set up, compile error), show the error and stop. Do not install packages or edit build config yourself.

## 2. Map criteria to tests and WAIT
Start with one baseline line: `Baseline: <n> existing spec files, <passed>/<total> tests passing`, then one line per already-failing test.

Then show a table: `AC# | criterion | planned test(s) | unit-testable?`.
Mark criteria that cannot be unit tested (pure visual layout, real routing between pages, real backend data) and say why.

Then show a second table of **extra tests**: behavior in the code this work changes that no criterion covers.
- Read the changes in the files found in step 1a.
- List one test per untested code path: each new `if`/`else` branch, error or `catchError` path, empty or null input, loading state, and boundary value.
- Skip paths an AC test already covers, and skip files with no logic (styles, config, generated code).
- Table: `E# | file | code path | planned test`, numbered E1, E2, … If there are none, say "No extra tests".
- If there are no criteria and no extra tests, there is nothing to write: skip to step 6 and report the baseline only.

Ask the user to approve both tables or name the rows to drop. Do not write any spec before they approve.

## 3. Write the specs
- Put or extend spec files next to each source file found in step 1a, following the repo's conventions.
- Name every criterion test `[KEY AC<n>] <behavior in plain words>`, e.g. `[NTV-123 AC1.2] shows the heading`.
- Name every extra test `[KEY E<n>] <behavior in plain words>`, using the number from the step 2 table, e.g. `[NTV-123 E1] shows "Missing id" when id is empty`. In a no-ticket run, leave out the key: `[E1] shows "Missing id" when id is empty`.
- Edit spec files only. If a spec needs a source change (for example a missing test id), ask first.

## 4. Run the new specs and the baseline specs together
Use the targeted run command from the repo's testing section, limited to the spec files you wrote or changed plus the step 1a baseline specs, in ONE run. Never run the full suite as a gate.
- Compare existing tests with the baseline. One that passed in step 1a and fails now is a **new break**. If your spec edit caused it (for example a changed shared `beforeEach`), fix your edit and rerun. Otherwise report it.
- An already-failing test from step 1a: leave it alone and report it as already failing.
- A test that fails because of a mistake in the test: fix it and rerun.
- A test that fails because the code does not meet the criterion, or does not behave as the extra test expects: do not change the assertion. Report it.
- If the command itself fails (runner not set up, compile error in unrelated specs), show the error and stop. Do not install packages or edit build config yourself.

## 5. Capture UI screenshots (max 5)
Only when the specs run in a real browser: Vitest browser mode (`@angular/build:unit-test` with `browsers` set, or `test.browser.enabled` in `vitest.config.*`). With jsdom, Jest or Karma, skip this step and say "No screenshots: tests do not run in a real browser" in the chat report and the comment.
- Pick at most 5 rendered states that best show the criteria: failing visible criteria first, then one per changed component or key state. Never more than 5.
- Write ONE temporary spec next to the main spec: `<name>.uac-screenshots.spec.ts`. Copy the main spec's TestBed setup and mocks. For each state, render it, then `await page.elementLocator(el).screenshot({ path: '__uac-screenshots__/<n>-<slug>.png' })` with `import { page } from 'vitest/browser'`. Assert only that the element exists.
- Run it with the targeted run command. Move the PNGs to `<os temp dir>/uac-test/KEY/` (`no-ticket` instead of KEY in a no-ticket run) (`node -p "require('os').tmpdir()"`). Delete the temporary spec and the `__uac-screenshots__` folder, then confirm `git status --short` lists neither.
- Read each PNG. Drop blank or wrong ones. If the element clips content (fixed height, scroll), say so in the caption.
- Screenshots use mock data. Never change source code to get a better picture.

## 6. Report in chat
Totals, then a table `AC# | result (pass / fail / not unit-testable) | test names`, then one line per failing or untested criterion, then a table `E# | result | test name` for the extra tests, then existing tests: one line per new break and one line per already-failing test (or "Existing tests: all passing"), then the screenshot paths with one caption each.

## 7. Jira comment (ONE per run, only after approval)
Skip this step in a no-ticket run: there is no ticket to comment on. The step 6 report is the result.

Draft a single comment:
- Date line first, above the heading: `Posted <YYYY-MM-DD HH:mm TZ>`. When you edit an existing comment (see "On approval"), keep its `Posted` line and add `Edited <YYYY-MM-DD HH:mm TZ>` after it. Get the time from the shell (`date "+%Y-%m-%d %H:%M %Z"`) right before posting. In the draft you show, write `Posted <set when posted>`.
- Heading `Unit test results (/uac-test:run)`
- Branch name and `git rev-parse --short HEAD`
- Totals and the compact `AC | result | tests` table
- One line per failing or untested criterion
- `Extra tests: <passed>/<total> passing`, then one line per failing extra test (`E<n>: <behavior>`). Omit if there are no extra tests.
- `Existing tests: <n> new breaks, <n> already failing`, then one line per test. Omit if all existing tests pass.
- `Screenshots` heading with one numbered caption per image (`1. AC<n>: <what it shows> (mock data)`), or the "No screenshots" line from step 5
- No logs, no per-test comments

Show the exact text and the screenshot list, then WAIT for approval.

On approval:
1. List the ticket's comments with `responseContentFormat: "html"` and find an existing `Unit test results (/uac-test:run)` comment. If one exists, copy its `Posted` line; if it has none, build one from the comment's `created` time. Then add `Edited <now>` after it, replacing any older `Edited` line. If none exists, write `Posted <now>`.
2. For each screenshot, in caption order: call `executeWrite` with `name: "uploadAttachmentToJiraIssue"` and inputs `issueIdOrKey`, `filePath` (no `fileId`). Run the returned `uploadCommand` in the shell and keep `data.id`, plus `collection` and `fileName` from the first response. Do not call the operation a second time with `fileId`: that adds a duplicate attachment.
3. Call `addOrEditJiraIssueComment` with `contentFormat: "html"`, the whole comment as HTML, and `inlineFileId`, `inlineFileCollection`, `inlineFileName` in caption order. The images append at the end, under the captions. Pass `commentId` to edit the existing comment, otherwise omit it to add one. An edit replaces the whole body, old images included. That is intended: each run shows its own screenshots.
4. Check that `inlineMediaCount` in the response equals the number of screenshots. If not, say so.

Never edit or transition the ticket itself.

## Rules
- Never `git commit` or `git push`.
- Never weaken an assertion to make a test pass.
- Follow the repo's formatter settings (indentation, quotes).
