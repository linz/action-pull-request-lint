import fs from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * Read the action.yml and create a function from the script inside.
 * replacing {{ inputs.* }} with ctx
 *
 * @returns Function that requires a `context` and `core` parameter
 */
function createTestFunction() {
  const func = fs.readFileSync("./action.yml", "utf-8").split("script: |")[1];

  const newFunc = func
    .replaceAll('process.env', "__functionEnv")
    // Remove console.logs
    .split("\n")
    .filter((f) => !f.includes("console.log"))
    .join("\n");
  
  return new Function("context", "core", "__functionEnv", newFunc);
}

function runAction(ctx, title) {
  const action = createTestFunction(ctx, title);

  const functionEnv = {
    CONVENTIONAL: ctx.conventional ?? "error",
    CONVENTIONAL_SCOPES: ctx.conventionalScopes ?? "",
    JIRA: ctx.jira ?? "warn",
    JIRA_PROJECTS: ctx.jiraProjects ?? "",
  }

  const output = {};
  const core = {
    setFailed(reason) {
      output.failed = output.failed || [];
      output.failed.push(reason);
    },
    warning(reason) {
      output.warning = output.warning || [];
      output.warning.push(reason);
    },
    setOutput(key, value) {
      output.outputs = output.outputs || {};
      output.outputs[key] = value;
    },
  };
  action({ payload: { pull_request: { title } } }, core, functionEnv);


  return output;
}

describe("action", () => {
  it("should validate commits", () => {
    assert.deepEqual(
      runAction({}, "feat(etl): Tile schema refinement BM-105"),
      {
        outputs: {
          'commit-scope': 'etl',
          'commit-type': 'feat',
          'jira-issue-key': 'BM-105'
        }
      }
    );
    assert.deepEqual(
      runAction({}, "feat(cli)!: Remove the old cog creation, serve BM-592"),
      {
        outputs: {
          'commit-scope': 'cli',
          'commit-type': 'feat',
          'jira-issue-key': 'BM-592'
        }
      }
    );
    assert.deepEqual(
      runAction({}, "feat(cdk8s): use environment based secrets TDE-712"),
      {
        outputs: {
          'commit-scope': 'cdk8s',
          'commit-type': 'feat',
          'jira-issue-key': 'TDE-712'
        }
      }
    );
    assert.deepEqual(
      runAction({}, "build(dev-deps): bump the aws group with 3 updates TDE-34"),
      {
        outputs: {
          'commit-scope': 'dev-deps',
          'commit-type': 'build',
          'jira-issue-key': 'TDE-34'
        }
      }
    );
    assert.deepEqual(runAction({}, "release: v6.46.0"), {
      outputs: {
        'commit-type': 'release',
      },
      warning: ["Pull request title does not contain a JIRA ticket!"],
    });
    assert.deepEqual(
      runAction({}, "ci: use environment based secrets TDE-712"),
      {
        outputs: {
          'commit-type': 'ci',
          'jira-issue-key': 'TDE-712'
        }
      }
    );
  });

  describe("jira", () => {
    it("should validate against jira projects", () => {
      assert.deepEqual(runAction({ conventional: "off" }, "Hello BM-14"), {
        outputs: {
          'jira-issue-key': 'BM-14'
        }
      });
      assert.deepEqual(runAction({ conventional: "off" }, "Hello BM"), {
        warning: ["Pull request title does not contain a JIRA ticket!"],
      });
      assert.deepEqual(
        runAction({ conventional: "off", jira: "off" }, "Hello"),
        {}
      );
    });

    it("should validate against required jira projects", () => {
      assert.deepEqual(
        runAction({ conventional: "off", jiraProjects: "BM" }, "Hello BM-14"),
        {
          outputs: {
            'jira-issue-key': 'BM-14'
          },
        }
      );
      assert.deepEqual(
        runAction(
          { conventional: "off", jiraProjects: "TDE,BM" },
          "Hello TDE-1234"
        ),
        {
          outputs: {
            'jira-issue-key': 'TDE-1234'
          },
        }
      );

      assert.deepEqual(
        runAction(
          { conventional: "off", jiraProjects: "TDE,BM" },
          "Hello TE-1234"
        ),
        { warning: ["Pull request title does not contain a JIRA ticket!"] }
      );
      assert.deepEqual(
        runAction(
          { conventional: "off", jiraProjects: "TDE,BM" },
          "Hello -1234"
        ),
        { warning: ["Pull request title does not contain a JIRA ticket!"] }
      );
    });
  });

  describe("conventional", () => {
    it("should restrict to scopes", () => {
      assert.deepEqual(
        runAction({ jira: "off", conventionalScopes: "hello" }, "feat: hello"),
        {
          outputs: {
            'commit-type': 'feat',
          },
        }
      );
      assert.deepEqual(
        runAction(
          { jira: "off", conventionalScopes: "hello" },
          "feat(hello): hello"
        ),
        {
          outputs: {
            'commit-scope': 'hello',
            'commit-type': 'feat',
          },
        }
      );
      assert.deepEqual(
        runAction(
          { jira: "off", conventionalScopes: "hello" },
          "feat(bar): hello"
        ),
        { failed: ["Pull request title does not match conventional format!"] }
      );

      assert.deepEqual(
        runAction(
          { jira: "off", conventionalScopes: "hello,bar" },
          "feat(bar): hello"
        ),
        { failed: ["Pull request title does not match conventional format!"] }
      );
    });
  });
});
