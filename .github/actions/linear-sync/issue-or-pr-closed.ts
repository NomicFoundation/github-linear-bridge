import * as github from "@actions/github";

import { Params, run } from "./boilerplate";
import { getLinearId } from "./github-utils";
import { closeIssue } from "./linear-utils";

async function main(
  params: Params,
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context
) {
  const linearId = await getLinearId(octokit, context);

  if (linearId === undefined) {
    console.log("No associated Linear.app issue found");
    return;
  }

  // Don't autoclose the Linear issue if this was triggerred by
  // the Linear webhook that's run when closing in Linear, otherwise it
  // will overwrite the issue state.
  if (context.actor === "nomic-foundation-automation") {
    return;
  }

  console.log("Closing linear issue");
  await closeIssue(params.linear.apiKey, params.linear.teamId, linearId);
}

run(main);
