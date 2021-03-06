# Nomic Foundation's Github <> Linear bridge

**WARNING: This is not intended to be used by other people/teams, and as such it may completely fail, stop working, or get modified or deleted without previous notice.**

This repository contains two different projects:

1. Two Github Action workflows to sync in the Github > Linear direction.

2. A Vercel/Next.js API to sync in the Linear > Github direction.

## Github Action workflows

This part of the project, which can be found in `.github/` contains some private actions and two example workflows.

Note that the actions are not published, so the workflows setup node, `npm install` in the right directory, and run a node script from the actions manually.

The first workflow, `.github/workflows/create-linear-issue.yml` is in charge of:

- Creating a Linear issue for each new Github issue
- Creating a Linear issue for each new PR opened by an external contributor
- Pick the same random assignee for both issues (i.e. Github and Linear)
- Comments on the issue/PR with a link to the linear issue and its id

The second workflow, `.github/workflows/close-linear-issue.yml` is in charge of:

- Whenever an issue/PR gets closed, it closes the associated Linear issue created by the other workflow, if any

### Setup

Both workflows require these environment variables:

- `GITHUB_TOKEN`: It must be `${{ secrets.GITHUB_TOKEN }}`
- `LINEAR_API_KEY`: An API key for the Linear user we use for automation
- `LINEAR_TEAM_ID`: The ID of the team associated to this project
- `MAINTAINERS`: A `;` separted list of Github users that maintain the repository

The Linear team workflow must have an `Autoclosed` state with type `Completed`.

The file `packages/linear-webhooks/api/github-linear-users-config.ts` must be kept up-to-date.

## Vercel API

This part of the project, which can be found in `packages/linear-webhooks` contains a single-endpoint API that needs to be setup as a Linear webhook

It is in charge of:

- Close an associated Github issue when a Linear issue is closed/deleted, if any
- Open an associated Github issue when a Linear issue is reopened/restored after deletion, if any
- Update the Github issue assignee when a Linear issue gets reassigned/unassigned if any

### Setup

This application must be deployed into Vercel, and setup as a webhook for the Linear workspace. The webhook should be configured to receive the `Issues` event types.

A single installation for the entire workspace is enough.

The webhook requires these environment variables:

- `LINEAR_API_KEY`: An API key for the Linear user we use for automation
- `GITHUB_ACCESS_TOKEN`: A personal Github access token of the user we use for automation, with public repositories access
- `LINEAR_TEST_TEAM_ID`: The ID of the Linear team that we use to test these integrations.
- `IS_TEST_DEPLOYMENT`: ONLY FOR TEST DEPLOYMENT ??? Any value

The file `packages/linear-webhooks/api/github-linear-users-config.ts` must be kept up-to-date.
