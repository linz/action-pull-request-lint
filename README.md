# linz/action-pull-request-lint

Composite action to validate that pull request titles contain

- Conventional Commits
- Include a JIRA ticket number

## Usage

```yaml
name: Pull Request lint

on:
  pull_request:
    types: ["opened", "edited", "reopened", "synchronize"]

# This github action requires no permissions
permissions: {}

jobs:
  pull-request-lint:
    runs-on: ubuntu-latest

    steps:
      - uses: linz/action-pull-request-lint@v1
        with:
          conventional: "error" # require conventional pull request title (default: "error" options: "error", "warn", "off")
          conventional-scopes: "infra,sprites,server" # optional list of conventional commit scopes

          jira: "error" # Require JIRA ticket references (default: "warn", options: "error", "warn", "off")
          jira-projects: "BM,TDE" # optional list of jira projects
```

### Outputs

The action produces a few useful outputs to allow consumer to process the pull request further

- `commit-type`, the commit type, e.g. `feat`, `fix`, `chore` etc.
- `commit-scope`, the commit scope (if exists in the pull request title)
- `jira-issue-key`, the JIRA issue key value (if exists in the pull request title)
