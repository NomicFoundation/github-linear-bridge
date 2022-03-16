import * as github from "@actions/github";
import { GH_LOGIN_to_LINEAR_DISPLAY_NAME } from "../../../packages/linear-webhooks/api/github-linear-users-config";

export interface Params {
  linear: {
    apiKey: string;
    teamId: string;
  };
  ghUsernameToLinearDisplayName: { [username: string]: string };
}

function getEnvVariableOrFail(name: string): string {
  const val = process.env[name]?.trim();
  if (val === undefined || val === "") {
    throw new Error(`Missing env variable ${name}`);
  }

  return val;
}

export async function run(
  main: (
    params: Params,
    octokit: ReturnType<typeof github.getOctokit>,
    context: typeof github.context
  ) => Promise<void>
) {
  try {
    const gitHubToken = getEnvVariableOrFail("GITHUB_TOKEN");
    const linearApiKey = getEnvVariableOrFail("LINEAR_API_KEY");
    const linearTeamId = getEnvVariableOrFail("LINEAR_TEAM_ID");
    const usernames = getEnvVariableOrFail("MAINTAINERS").split(";");

    const filteredUsernames = Object.fromEntries(
      Object.entries(GH_LOGIN_to_LINEAR_DISPLAY_NAME).filter(([k, v]) =>
        usernames.includes(k)
      )
    );

    const octokit = github.getOctokit(gitHubToken);

    await main(
      {
        linear: {
          apiKey: linearApiKey,
          teamId: linearTeamId,
        },
        ghUsernameToLinearDisplayName: filteredUsernames,
      },
      octokit,
      github.context
    );
  } catch (err) {
    console.error(err as any);
    process.exit(1);
  }
}
