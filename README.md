# elodrop

Elo ratings for Norwegian badminton: singles, doubles and mixed doubles from every tournament and league result on [badmintonportalen.no](https://badmintonportalen.no) since 2013, with rankings, player and club pages, head to head, the biggest upsets, Eliteserien team strengths and reviews, and draw luck in tournaments.

- `pipeline/`: the rating pipeline (Node scripts): fetches the results, rates them and exports the data the site reads. [`pipeline/README.md`](pipeline/README.md) is the full specification of the ratings and every feature.
- `web/`: the site (Next.js 16, React 19, TypeScript, Tailwind CSS v4), with the club content in Sanity.
- `.github/workflows/pipeline.yml`: runs the pipeline every night.
- [`CHANGELOG.md`](CHANGELOG.md): every version, with what was added or fixed.

## How it fits together

| What | Where |
|---|---|
| Fetched results, rankings, draws (raw input) | Cloudflare R2 bucket `elo-raw`; locally `pipeline/data` |
| Hand-edited input: `corrections.txt`, Eliteserien rosters, `organisers.txt` | this repo, `pipeline/` |
| The site's data (rankings, players, clubs, upsets, Eliteserien, tournaments) | R2 bucket `elo-data`, public on `data.<domain>`; locally `pipeline/export` |
| Club content (names, regions, logos) | Sanity (Studio at `/studio`); `web/content/clubs.json` until Sanity is set up |
| The site | Vercel |

The pipeline writes plain JSON files (`pipeline/export.mjs`, at most 2 MB each). The site reads them on the server, caches them (`'use cache'`, tag `elo-data`, plus `elo-data:<area>` per area such as `elo-data:tournaments`), and refreshes when the nightly run calls `/api/revalidate`.

The nightly run fetches only what can have changed:

- **Tournament results**: a tournament once its end date has passed (end dates are remembered; rechecked on Mondays), and again each night for up to a week while badmintonportalen has no results for it yet. Until then, the matches played so far come from the tournament's draw (`pipeline/cup2000-results.mjs`), so a weekend's matches are rated the night after they're played.
- **Team matches**: a league group when one of its ties, by date, was played in the last 14 days and isn't in yet (results registered late). Mondays also list the groups again and sweep every ongoing group (postponed ties).
- **Tournament draws**: after the registration deadline, until the tournament has ended and been fetched once more for its final results. Sundays rescan the whole season.
- **Official ranking**: Wednesday to Friday, when it's published; the lists only when a new version is out.
- **Player register and clubs**: Mondays.
- **Birth years**: every night, for players not seen before.
- Raw files are kept between runs in GitHub's cache, so finished history isn't downloaded again.

Then it rebuilds only what's needed (`pipeline/fingerprint.mjs` compares the inputs with the last rebuild's):

- **full**: everything, and the whole site refreshed. The runs on Saturday, Sunday and Monday (01:15 UTC, after Friday's, Saturday's and Sunday's matches), manual runs, and any night when results (also ones registered late), the official ranking, the player register or the pipeline itself changed.
- **draws**: only new or changed tournament draws: just the tournament pages are uploaded and refreshed.
- **none**: nothing new: no uploads, and the site keeps its cached pages.

## The site's code (`web/`)

- `app/`: the pages and API routes (Next.js App Router); the site's pages are in `app/(site)`, the Sanity Studio in `app/studio`.
- `components/`: React components by area (`home/` for the front page's cards, `how-it-works/` and `whats-new/` for those pages, `players/`, `clubs/`, `rankings/`, `head-to-head/`, `tournaments/`, `upsets/`, `eliteserien/`), the header and footer parts in `layout/`, building blocks used everywhere in `ui/` (sections, cards, link tabs, badges, disclosures, buttons' classes), `charts/` and `format/`; `SVG/` has the icons, one per file.
- `data/`: reading the site's data: the cached loaders for the pipeline's export (one module per area, sharing `load.ts`) and the club content from Sanity (`sanity.ts`).
- `utils/`: functions used across the site: formatting (`format.ts`), the site's URLs (`hrefs.ts`), pools, ratings, rankings, tournaments, charts, sorting, the logo and the colour themes.
- `types/`: the shapes of the exported data.
- `app/(site)/how-it-works`: the ratings explained, in plain words and (with the "I'm a big nerd" switch) with the formulas; its text (`messages/en/how-it-works.json`) and numbers follow `pipeline/README.md`, so update it when the rules change. `app/(site)/whats-new` is `CHANGELOG.md`, read when the site is built.
- `messages/`: the site's text, one JSON file per area (`messages/en/`), read through `t()`, `plural()` and `rich()` in `messages/i18n.ts`. English is the only language so far; another (Norwegian) is a new folder with the same keys.

## Local development

Requires Node 24 and pnpm (`corepack enable`).

```bash
pnpm install
# the data: run the pipeline (or copy pipeline/data from a previous run)
cd pipeline && node rate.mjs && node eliteserien.mjs && node upcoming.mjs --offline && node export.mjs && cd ..
cp web/.env.example web/.env.local   # set DATA_DIR=../pipeline/export
pnpm dev                             # http://localhost:3000
```

To work with the same data as the live site instead, pull it from the buckets (needs rclone with a remote named `r2`, see below): `pnpm data:pull` copies the site's data into `pipeline/export` (what `DATA_DIR` reads), and `pnpm data:pull-raw` the latest fetched results into `pipeline/data`, so a local `rate.mjs` run starts from them. Or set `DATA_URL=https://data.<domain>` instead of `DATA_DIR` in `web/.env.local` to read the live data directly.

Fetching everything from scratch takes hours (`fetch-players.mjs`, `fetch-clubs.mjs`, `fetch-portalen.mjs`, `fetch-league.mjs`, `fetch-ranking.mjs all`, `fetch-birth-years.mjs`); the nightly workflow only fetches what's new.

## Going live (all on free plans, apart from the domain)

1. **Domain.** Buy one, e.g. through Cloudflare Registrar (sold at cost), so its DNS is on Cloudflare.
2. **R2.** In Cloudflare, create the buckets `elo-raw` and `elo-data`. Give `elo-data` the custom domain `data.<domain>` (public read). Create an R2 API token with read and write on both buckets.
3. **Seed the raw data** once from a machine that has `pipeline/data`, with rclone configured for R2 (`rclone config`, provider Cloudflare):
   `rclone copy pipeline/data r2:elo-raw --filter-from .github/raw-data.filter`
   and the web data: `rclone sync pipeline/export r2:elo-data --checksum`.
4. **Sanity.** Create a free project at [sanity.io/manage](https://sanity.io/manage) (dataset `production`), add the site's URL (and `http://localhost:3000`) as CORS origins, create a token with write access, then import the clubs:
   `SANITY_WRITE_TOKEN=... NEXT_PUBLIC_SANITY_PROJECT_ID=... pnpm --filter web import-clubs`.
   Add a webhook (on create, update and delete of `club`) to `POST https://<domain>/api/revalidate?tag=sanity&secret=<REVALIDATE_SECRET>`.
5. **Vercel.** Import the GitHub repo with root directory `web`, and set `DATA_URL=https://data.<domain>`, `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET=production` and `REVALIDATE_SECRET` (any long random string). Add the domain.
6. **GitHub.** In the repo settings, add the secrets `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `REVALIDATE_SECRET`, and the variable `SITE_URL=https://<domain>`. Run the Pipeline workflow by hand once to check it.

### Free-tier limits that matter

- **R2:** 10 GB storage (the data is under 1 GB), 1 million writes a month: the pipeline uploads only files whose content changed (`rclone --checksum`), around 12,000 a night at most.
- **Vercel Hobby:** for personal, non-commercial use. Pages are cached, so most visits don't run any code.
- **Sanity:** 10,000 documents per dataset; the clubs and their logos are about 270.
- **GitHub Actions:** unlimited minutes on a public repo; a nightly run takes 5–20 minutes.
