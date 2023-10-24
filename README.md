# linz/action-pull-request-lint

Composite action to validate that pull request titles match 
- Conventional Commits
- Include a JIRA ticket number
usage:

```yaml
name: Pull Request lint

on:
  pull_request:
    types: ["opened", "edited", "reopened", "synchronize"]

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
