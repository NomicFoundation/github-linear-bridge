import { VercelRequest, VercelResponse } from "@vercel/node";
import { LinearClient } from "@linear/sdk";
import { Octokit } from "octokit";

import { LINEAR_DISPLAY_NAME_TO_GH_LOGIN } from "./github-linear-users-config";

const GH_ID_PREFIX = "GH-ID:";

interface GithubIssueId {
  owner: string;
  repo: string;
  issue_number: number;
}

function shouldCloseIssueAfterUpdate(body: any): boolean {
  if (body.action !== "update") {
    return false;
  }

  if (body.updatedFrom.canceledAt === null) {
    return true;
  }

  if (
    body.updatedFrom.stateId !== undefined &&
    (body.data.state.type === "canceled" ||
      body.data.state.type === "completed")
  ) {
    return true;
  }

  return false;
}

function shouldCloseIssueAfterRemove(body: any): boolean {
  return body.action === "remove";
}

function shouldUpdateAssignees(body: any): boolean {
  if (body.action !== "update") {
    return false;
  }

  if (body.updatedFrom.assigneeId !== undefined) {
    return true;
  }

  return false;
}

function shouldOpenIssueAfterBeingRestored(body: any): boolean {
  return body.action === "restore";
}

function shouldOpenIssueAfterUpdate(body: any): boolean {
  if (body.action !== "update") {
    return false;
  }

  if (
    body.updatedFrom.stateId !== undefined &&
    !(
      body.data.state.type === "canceled" ||
      body.data.state.type === "completed"
    )
  ) {
    return true;
  }

  return false;
}

function getGithubIssueIdFromDescription(body: any): GithubIssueId | undefined {
  const description: string = body.data.description;

  if (!description.includes(GH_ID_PREFIX)) {
    return undefined;
  }

  const line = description.split("\n").find((l) => l.includes(GH_ID_PREFIX))!;
  const ghId = line.slice(GH_ID_PREFIX.length).trim();

  const [tag, ns] = ghId.split("#");
  const n = +ns;

  const [owner, repo] = tag.split("/");

  if (Number.isNaN(n) || owner === undefined || repo === undefined) {
    return undefined;
  }

  return { owner, repo, issue_number: n };
}

async function getGithubAssignee(body: any): Promise<string | undefined> {
  const linearAssignee = body.data.assignee;
  if (linearAssignee === null || linearAssignee === undefined) {
    return undefined;
  }

  const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  const user = await client.user(linearAssignee.id);
  const displayName = user.displayName;

  const login = LINEAR_DISPLAY_NAME_TO_GH_LOGIN[displayName];
  if (login === undefined) {
    throw Error(`Linear user ${displayName} not configured`);
  }

  return login;
}

function getOctokit() {
  return new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });
}

async function closeGithubIssue(ghId: GithubIssueId) {
  const octokit = getOctokit();
  await octokit.rest.issues.update({ ...ghId, state: "closed" });
}

async function openGithubIssue(ghId: GithubIssueId) {
  const octokit = getOctokit();
  await octokit.rest.issues.update({ ...ghId, state: "open" });
}

async function removeGithubIssueAssignees(
  ghId: GithubIssueId,
  exception?: string
) {
  const octokit = getOctokit();
  const assigneesData = await octokit.rest.issues.listAssignees({ ...ghId });

  const assignees = assigneesData.data
    .map((a) => a.login)
    .filter((l) => l !== exception);

  await octokit.rest.issues.removeAssignees({
    ...ghId,
    assignees,
  });
}

async function addGithubIssueAssignee(
  ghId: GithubIssueId,
  assigneeLogin: string
) {
  const octokit = getOctokit();
  await octokit.rest.issues.addAssignees({
    ...ghId,
    assignees: [assigneeLogin],
  });
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const ghId = getGithubIssueIdFromDescription(req.body);
    if (ghId === undefined) {
      console.log("No associated GH issue found");
      return;
    }

    if (
      shouldCloseIssueAfterRemove(req.body) ||
      shouldCloseIssueAfterUpdate(req.body)
    ) {
      console.log("Closing Github issue");
      await closeGithubIssue(ghId);
    }

    if (
      shouldOpenIssueAfterBeingRestored(req.body) ||
      shouldOpenIssueAfterUpdate(req.body)
    ) {
      console.log("Reopening Github issue");
      await openGithubIssue(ghId);
    }

    if (shouldUpdateAssignees(req.body)) {
      console.log("Updating Github issue assignees");
      const assignee = await getGithubAssignee(req.body);

      await removeGithubIssueAssignees(ghId, assignee);
      if (assignee !== undefined) {
        console.log(`Assigning ${assignee}`);
        await addGithubIssueAssignee(ghId, assignee);
      }
    }
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};
