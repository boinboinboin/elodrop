# elodrop

Elo ratings for Norwegian badminton: `pipeline/` (the rating pipeline; `pipeline/README.md` is its specification) and `web/` (the Next.js site; read `web/AGENTS.md` before writing Next.js code). See `README.md` for how it fits together.

## Changelog and versions

Every change merged into `main` adds an entry at the top of `CHANGELOG.md`, in the same branch as the change, so the PR carries it:

- `## vMAJOR.X.Y (YYYY-MM-DD)`, then short bullets of what was added, changed or fixed, written for someone using the site (or running the pipeline), not as commit messages.
- **X**: big features: a new page, a new component, a new capability. Bump X and reset Y to 0.
- **Y**: smaller features, improvements, bug and issue fixes. Bump Y.
- **MAJOR** is `1` since the launch (v1.0.0, 2026-10-16). Only change it when the owner says so.
- Several changes in one PR make one version; pick X if any of them is a big feature.
- The date is the day it reaches `main`.

The PR check (`.github/workflows/changelog.yml`) fails when a PR into `main` doesn't touch `CHANGELOG.md`.

## Git

- Never commit or push without the owner's explicit permission; work on a feature branch from an up-to-date `origin/main`, and check the current branch right before committing (the owner often merges, pulls and deletes branches in between).
- `main` deploys to production (Vercel).
