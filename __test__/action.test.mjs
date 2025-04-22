import fs from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * Read the action.yml and create a function from the script inside.
 * replacing {{ inputs.* }} with ctx
 *
 * @param {*} ctx
 * @returns Function that requires a `context` and `core` parameter
 */
function createTestFunction(ctx) {
  const func = fs.readFileSync("./action.yml", "utf-8").split("script: |")[1];

  const newFunc = func
    // Replace inputs
    .replace("process.env.CONVENTIONAL", `'${ctx.conventional ?? "error"}'`)
    .replace(
      "process.env.CONVENTIONAL_SCOPES",
      `'${ctx.conventionalScopes ?? ""}'`
    )
    .replace("process.env.JIRA", `'${ctx.jira ?? "warn"}'`)
    .replace("process.env.JIRA_PROJECTS", `'${ctx.jiraProjects ?? ""}'`)
    // Remove console.logs
    .split("\n")
    .filter((f) => !f.includes("console.log"))
    .join("\n");
  // process.stdout.write(newFunc)
  return new Function("context", "core", newFunc);
}

function runAction(ctx, title) {
  const action = createTestFunction(ctx);

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

  action({ payload: { pull_request: { title } } }, core);

  return output;
}

describe("action", () => {
  it("should validate commits", () => {
    assert.deepEqual(
      runAction({}, "feat(etl): Tile schema refinement BM-105"),
      {
        outputs: {
          'conventional-match': 'feat',
          'jira-match': 'BM-105'
        }
      }
    );
    assert.deepEqual(
      runAction({}, "feat(cli)!: Remove the old cog creation, serve BM-592"),
      {
        outputs: {
          'conventional-match': 'feat',
          'jira-match': 'BM-592'
        }
      }
    );
    assert.deepEqual(
      runAction({}, "feat(cdk8s): use environment based secrets TDE-712"),
      {
        outputs: {
          'conventional-match': 'feat',
          'jira-match': 'TDE-712'
        }
      }
    );
    assert.deepEqual(
      runAction({}, "build(dev-deps): bump the aws group with 3 updates TDE-34"),
      {
        outputs: {
          'conventional-match': 'build',
          'jira-match': 'TDE-34'
        }
      }
    );
    assert.deepEqual(runAction({}, "release: v6.46.0"), {
      outputs: {
        'conventional-match': 'release',
      },
      warning: ["Pull request title does not contain a JIRA ticket!"],
    });
    assert.deepEqual(
      runAction({}, "ci: use environment based secrets TDE-712"),
      {
        outputs: {
          'conventional-match': 'ci',
          'jira-match': 'TDE-712'
        }
      }
    );
  });

  describe("jira", () => {
    it("should validate against jira projects", () => {
      assert.deepEqual(runAction({ conventional: "off" }, "Hello BM-14"), {
        outputs: {
          'jira-match': 'BM-14'
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
            'jira-match': 'BM-14'
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
            'jira-match': 'TDE-1234'
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
            'conventional-match': 'feat',
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
            'conventional-match': 'feat',
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
