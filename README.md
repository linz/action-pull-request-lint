# linz/action-pull-request-lint

Composite action to checkout/build/test typescript with npm or yarn.

usage: 

```yaml
name: Pull Request lint

on:
  pull_request:
    types: ['opened', 'edited', 'reopened', 'synchronize']

jobs:
  pull-request-lint:
    runs-on: ubuntu-latest
    steps:
    - uses: linz/action-pull-request-lint@v0
      with:
        scopes: 'infra,sprites,server' # optional list of conventional commit scopes
        jira-projects: 'BM,TDE' # optional list of jira projects
```