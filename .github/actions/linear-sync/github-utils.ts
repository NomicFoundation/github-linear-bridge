import * as github from "@actions/github";

export const ID_PREFIX = "LINEAR-ID:";

export async function commentWithLinearIdAndUrl(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issue_number: number,
  linearUrl: string,
  linearId: string
) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number,
    body: `This issue is also being [tracked on Linear](${linearUrl}).

We use Linear to manage our development process, but we keep the conversations on Github.

${ID_PREFIX} ${linearId}`,
  });
}

export async function getLinearId(
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context
): Promise<string | undefined> {
  const repository = context.payload.repository!;

  const issue = context.payload.issue || context.payload.pull_request!;

  const [owner, repo] = repository.full_name!.split("/");

  const commentsData = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issue.number,
  });

  for (const comment of commentsData.data) {
    if (comment.user?.login !== "github-actions[bot]") {
      continue;
    }

    if (!comment?.body?.includes(ID_PREFIX)) {
      continue;
    }

    const linearIdLine = comment?.body
      ?.split("\n")
      .find((l) => l.includes(ID_PREFIX));

    if (linearIdLine === undefined) {
      continue;
    }

    const [_, id] = linearIdLine.trim().split(" ");

    return id.trim();
  }

  return undefined;
}
