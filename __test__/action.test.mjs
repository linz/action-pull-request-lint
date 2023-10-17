import fs from 'node:fs'
import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * Read the action.yml and create a function from the script inside.
 * replacing {{ inputs.* }} with ctx
 * @param {*} ctx 
 * @returns Function that requires a `context` and `core` parameter
 */
function createTestFunction(ctx) {
  const func = fs.readFileSync('./action.yml', 'utf-8').split('script: |')[1]

  const newFunc = func
    .replace('{{ inputs.scopes }}', ctx.scopes ?? '')
    .replace('{{ inputs.jira-projects }}', ctx.jiraProjects ?? '')
    .replace('{{ inputs.jira-required }}', ctx.jiraRequired ?? true)

  return new Function('context', 'core', newFunc)
}

function runAction(ctx, title) {
  const action = createTestFunction(ctx)

  let failed;
  const core = { setFailed(reason) { failed = reason } }

  action({ payload: { pull_request: { title } } }, core)

  return failed;
}



describe('action', () => {
  it('should validate against jira projects', () => {
    assert.equal(runAction({}, 'Hello BM-14'), undefined)
    assert.equal(runAction({}, 'Hello BM'), 'Pull request title does not contain a JIRA ticket!')
    assert.equal(runAction({ jiraRequired: false }, 'Hello'), undefined)
  })

  it('should validate against required jira projects', () => {
    assert.equal(runAction({ jiraProjects: 'BM' }, 'Hello BM-14'), undefined)
    assert.equal(runAction({ jiraProjects: 'TDE,BM' }, 'Hello TDE-1234'), undefined)

    assert.equal(runAction({ jiraProjects: 'TDE,BM' }, 'Hello TE-1234'), 'Pull request title does not contain a JIRA ticket!')
    assert.equal(runAction({ jiraProjects: 'TDE,BM' }, 'Hello -1234'), 'Pull request title does not contain a JIRA ticket!')
  })
})


