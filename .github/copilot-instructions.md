A composite GitHub Action that lints pull request titles for conventional-commit format and a JIRA ticket reference. No build step, no dependencies — logic lives inline in `action.yml` via `actions/github-script`.

## Layout

- `action.yml` — the entire action: inputs (`conventional`, `conventional-scopes`, `jira`, `jira-projects`, each accepting `error`/`warn`/`off`), outputs (`jira-issue-key`, `commit-type`, `commit-scope`), and a single composite step running an inline script against `context.payload.pull_request.title`.
- `__test__/action.test.mjs` — tests using Node's built-in test runner, run with `node --test`.

## Development commands

```bash
node --test   # runs __test__/action.test.mjs directly, no build/install needed
```

## Key conventions

**All logic lives in `action.yml`**: there's no `src/` or `dist/` — edits to the regex/validation logic go directly into the inline `actions/github-script` step in `action.yml`. Don't introduce a separate build pipeline for this repo without good reason.

**Conventional commit regex**: type is one of `build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|release`; scope is optional and constrained by `conventional-scopes` if provided; a trailing `!` (breaking change) is allowed. Update the regex in `action.yml` carefully — it's the single source of truth for what titles pass CI across every LINZ repo using this action.

**JIRA regex**: defaults to `[A-Z]+-\d+` (any uppercase project key); when `jira-projects` is set, only those project keys match. `jira` defaults to `warn`, `conventional` defaults to `error` — a repo can loosen/tighten independently per input.

**`warnOrFail` helper**: any new error-mode input should reuse this pattern (`error` → `core.setFailed`, `warn` → `core.warning`, `off` → skip) rather than duplicating the branching.

**Consumers pin `@v1`** in the README example — check `.github/workflows/push.yml`/release process before assuming SHA-pinning is enforced for *this* action's own workflows (its own CI currently uses tag refs like `@v6`, not SHAs — new workflows added to this repo should still follow the org-wide SHA-pinning convention going forward).
