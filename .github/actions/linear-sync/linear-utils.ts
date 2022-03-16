import { LinearClient } from "@linear/sdk";
import { URL } from "url";

const LINEAR_AUTOCLOSED_STATE_NAME = "Autoclosed";
const LINEAR_AUTOCLOSED_STATE_TYPE = "completed";

function githubUrlToGhId(githubIssueUrl: string) {
  const url = new URL(githubIssueUrl);
  const path = url.pathname.slice(1);
  const [owner, repo, _, n] = path.split("/");

  return `${owner}/${repo}#${n}`;
}

export async function createIssue(
  apiKey: string,
  teamId: string,
  githubIssueUrl: string,
  githubIssueTile: string
) {
  const linearClient = new LinearClient({ apiKey });
  const ghId = githubUrlToGhId(githubIssueUrl);

  const title = `${githubIssueTile} [${ghId}]`;
  const description = `[Github issue/pull request](${githubIssueUrl})

_This issue was automatically created, **do not edit its description**._

GH-ID: ${ghId}`;

  const issuePayload = await linearClient.issueCreate({
    teamId,
    title,
    description,
  });

  if (issuePayload.issue === undefined) {
    throw new Error(
      "Failed to create Linear issue for Github issue/PR: " + githubIssueUrl
    );
  }

  return await issuePayload.issue;
}

export async function closeIssue(
  apiKey: string,
  teamId: string,
  issueId: string
) {
  const linearClient = new LinearClient({ apiKey });
  const states = await linearClient.workflowStates({
    filter: {
      team: { id: { eq: teamId } },
      name: { eq: LINEAR_AUTOCLOSED_STATE_NAME },
      type: { eq: LINEAR_AUTOCLOSED_STATE_TYPE },
    },
  });

  if (states.nodes.length === 0) {
    throw new Error("Autoclosed state not found");
  }

  if (states.nodes.length > 1) {
    throw new Error("Multiple autoclosed states found");
  }

  const state = states.nodes[0];
  const response = await linearClient.issueUpdate(issueId, {
    stateId: state.id,
  });

  if (response.success === false) {
    throw new Error(`Failed to close Linear issue ${issueId}`);
  }
}

export async function assignIssue(
  apiKey: string,
  teamId: string,
  issueId: string,
  linearAssignee: string
) {
  const linearClient = new LinearClient({ apiKey });
  const team = await linearClient.team(teamId);
  const members = await team.members();
  const member = members.nodes.find((m) => m.displayName === linearAssignee);

  if (member === undefined) {
    throw new Error(
      `Linear user (${linearAssignee}) not present in team ${team.name}`
    );
  }

  const response = await linearClient.issueUpdate(issueId, {
    assigneeId: member.id,
  });

  if (response.success === false) {
    throw new Error(`Failed to assign Linear issue ${issueId}`);
  }
}
