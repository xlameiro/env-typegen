---
name: Next.js Dependency Upgrade
on:
  schedule:
    - cron: "0 9 * * 1" # Every Monday at 09:00 UTC
  workflow_dispatch: # Allow manual trigger from GitHub UI
permissions:
  contents: write
  pull-requests: write
safe-outputs:
  - type: pull-request
    max: 1
  - type: nothing
tools:
  - web-fetch:
      domains:
        - github.com
        - npmjs.com
        - nextjs.org
        - react.dev
---

## Instructions

Check whether there are new **minor or major** releases for the following packages compared to the versions declared in `package.json`:

- `next`
- `react`
- `react-dom`

For each package that has a newer version available:

1. Fetch the official release notes and upgrade guide from the package's documentation.
2. Identify any breaking changes that apply to this codebase (App Router, TypeScript strict mode, Tailwind CSS v4, Auth.js v5).
3. Plan the migration steps including source file changes needed to address breaking changes.
4. Apply the version bumps in `package.json` and make all necessary source changes.
5. Run `pnpm install` to update the lockfile.

When all changes are applied, open a **single pull request** that includes:

- A table with old → new versions for each upgraded package.
- A summary of breaking changes found and how each was addressed.
- Any manual steps still required from the developer (e.g., environment variable changes, config file updates).

If no packages have new versions available, do nothing and produce no output.
