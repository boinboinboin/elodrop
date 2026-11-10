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

## Mobile

Every page and component must work on mobile (from 320px wide), new ones and changes to old ones alike: check it at a phone's width before it's done, with nothing making the page scroll sideways.

- A table wider than the screen scrolls inside its own box (`overflow-x-auto`), its values on one line (`whitespace-nowrap` on the cells), as the Eliteserien head-to-head matrix does; or it drops columns below a breakpoint (`hidden sm:table-cell`), as the Eliteserien table does.
- A grid around such a box needs `grid-cols-1` (or `min-w-0` on its items): a bare `grid` sizes its column to the widest content, and the box then widens the page instead of scrolling.

## Cost

Keep the site as cheap to run as possible (Vercel ISR writes and functions, R2 writes) without taking away functionality, and say so when a change would raise the cost. A page is written to Vercel's cache (an ISR write, counted by size) when it's visited after being made stale, and crawlers visit nearly every page, so what costs is how many pages each refresh reaches (see `README.md`, "How it fits together"):

- The pipeline refreshes only the data files it uploaded (one cache tag per file, `web/data/load.ts`; `pipeline/refresh-site.mjs`). Don't refresh everything, and don't add time-based `cacheLife` to data reads.
- Pages that exist by the thousand (players, team matches) must not read a file that changes with every run (`meta.json`, `achievements.json`): load that in the browser from a cached API route (as `/api/updated`, `/api/achievement-stats`), or put what the page needs in its own file.
- Sanity content on thousands of pages (clubs, badges, halls) is refreshed by the nightly run when it changed (`pipeline/sanity-revisions.mjs`), not by the webhook.
- Before adding a page type, a sitemap entry or a large component, weigh how many pages, how often they change and how big they are.
- Ask the owner before trading freshness for cost: a refresh expires pages at once (`{ expire: 0 }`), so the first visit after an update is fresh.

## Git

- Never commit or push without the owner's explicit permission; work on a feature branch from an up-to-date `origin/main`, and check the current branch right before committing (the owner often merges, pulls and deletes branches in between).
- `main` deploys to production (Vercel), except pushes that change nothing the site uses (`web/vercel.json`: `ignoreCommand`). Each deploy very likely starts the pages' cache afresh (Nov 8, 2026 suggests it), so every page crawled after it is an ISR write: merging several PRs together costs less than one at a time.
