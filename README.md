# ntv360-tools (Claude Code marketplace)

## Plugin: uac-test
`/uac-test:run <JIRA-KEY>` reads the acceptance criteria from Jira, shows a criteria-to-tests table for approval, writes the specs, runs only those, reports, and (after approval) posts ONE summary comment to the ticket.

### Install (once per machine)
```
/plugin marketplace add <git-url-or-owner/repo-or-local-path>
/plugin install uac-test@ntv360-tools
```
Then run `/mcp` and sign in to Atlassian the first time.

### Per repo (once)
Add a "Unit testing" section to the repo's `CLAUDE.md` using `plugins/uac-test/templates/unit-testing-section.md`. The command reads it to learn the runner and conventions.

### Test locally before publishing
`claude --plugin-dir ./plugins/uac-test`
