import * as github from "@actions/github";

import { Params, run } from "./boilerplate";
import { createIssue, assignIssue } from "./linear-utils";
import { commentWithLinearIdAndUrl } from "./github-utils";

function getGithubAssignee(authorName: string, ourUsers: string[]) {
  if (ourUsers.includes(authorName)) {
    return authorName;
  }

  return ourUsers[Math.floor(Math.random() * ourUsers.length)];
}

async function main(
  params: Params,
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context
) {
  const repository = context.payload.repository!;

  const issue = context.payload.issue || context.payload.pull_request!;

  const [owner, repo] = repository.full_name!.split("/");

  const issueData = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issue.number,
  });

  const isPullRequest = issueData.data.pull_request !== undefined;
  const isOurOwnIssueOrPr =
    params.ghUsernameToLinearDisplayName[issueData.data.user!.login] !==
    undefined;

  // We create Linear issues for every GH issue except our own PRs
  // as they are created in response to Linear tasks.
  const shouldCreateLinearIssue = !isPullRequest || !isOurOwnIssueOrPr;

  const githubAssignee = getGithubAssignee(
    issueData.data.user!.login,
    Object.keys(params.ghUsernameToLinearDisplayName)
  );

  const linearAssignee = params.ghUsernameToLinearDisplayName[githubAssignee];

  console.log({ isPullRequest, isOurOwnIssueOrPr, shouldCreateLinearIssue });

  if (shouldCreateLinearIssue) {
    console.debug("Creating Linear issue");
    const linearIssue = await createIssue(
      params.linear.apiKey,
      params.linear.teamId,
      issueData.data.html_url,
      issueData.data.title
    );

    console.debug("Assigning Linear issue");
    await assignIssue(
      params.linear.apiKey,
      params.linear.teamId,
      linearIssue.id,
      linearAssignee
    );

    console.debug("Commenting on Github issue");
    await commentWithLinearIdAndUrl(
      octokit,
      owner,
      repo,
      issue.number,
      linearIssue.url,
      linearIssue.id
    );
  }

  if (!isOurOwnIssueOrPr) {
    console.debug("Assigning Github issue");
    await octokit.rest.issues.addAssignees({
      owner,
      repo,
      issue_number: issue.number,
      assignees: [githubAssignee],
    });
  }
}

run(main);
