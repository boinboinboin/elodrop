# Changelog

Every change merged into `main` gets an entry here, newest first.

**Versions** are `major.x.y`:

- **major**: `0` before the launch, `1` from the launch on elodrop.no. It only changes when the owner says so, for a major change.
- **x**: big features: new pages, new components, new capabilities.
- **y**: smaller features, improvements, bug and issue fixes.

## v1.4.2 (2026-10-19)

- Club pages: the discipline tabs stick to the top while scrolling, as on player pages.
- A thin line under the sticky discipline tabs while they're stuck, separating them from the content scrolling underneath.

## v1.4.1 (2026-10-19)

- Fixed: sliding along a chart while holding stopped after a few weeks on Android (the page took over and scrolled); the page no longer scrolls while holding.
- Fixed: the chart's detail box could end up partly outside the screen; it now always stays inside the chart.
- The detail box shows the week number ("Week 41, 2026") instead of "Week ending 11 Oct 2026" (the date is in its hover text).

## v1.4.0 (2026-10-19)

- Charts work on touch screens: holding a chart shows the values (as hovering does), sliding moves through the weeks, and a tap hides them.
- Player page: rating and ranking history in one "History" box, with a tab each.
- Player page: the discipline tabs stick to the top while scrolling, with the match table's header below them.
- Arrows in links ("Rankings", "Earlier", "Show all" and the like) are SVG icons instead of text characters.

## v1.3.3 (2026-10-18)

- Tournament pages on phones: each class keeps one line, its discipline buttons scrolling sideways, starting with the current one in view.

## v1.3.2 (2026-10-18)

- Every page fits phones down to 375 px wide (iPhone SE), checked in a browser at that width.
- Tournament events on phones: each entry's numbers (group, rating, chances, rounds, luck, result) under its names instead of a table wider than the screen.
- Tighter rankings and club tables on phones; long names may break.
- Head to head: the header cards shrink with long names. Eliteserien: the lineup cards fit.
- Season tables with discipline codes and short seasons ("25/26") on phones; winning margins with wrapping names.

## v1.3.1 (2026-10-18)

- Fixed: played tournaments disappeared from the tournament draws page after a normal nightly run. Their analyses are now kept between runs.

## v1.3.0 (2026-10-18)

- Rankings show the movement since last week: a green or red arrow with the places gained or lost, "–" for no change and a blue dot for new entries, for players and clubs.
- The rating (clubs: strength) gained or lost since last week, in its own column after it.
- Sort the rankings by matches played, and the club rankings by ranked players (click the header; again for rank order).
- Disciplines as MS, WS, MD, WD and XD on phones.
- Sticky table headers in the rankings, club rankings and match tables.
- Match tables fit phones: the win chance under the score, the date over two or three lines.
- The ± range after ratings is no longer shown.
- The front page is just the rankings: no upsets highlight or links below the title (they're in the header).
- Fixed: charts with several lines kept an empty margin on the right; the combined history charts overflowed on phones.

## v1.2.2 (2026-10-18)

- The nightly pipeline runs two hours earlier, at 01:15 UTC.

## v1.2.1 (2026-10-17)

- The footer's "Updated" time is when the pipeline finished building the data, in Norwegian time.

## v1.2.0 (2026-10-17)

- Rivals over all disciplines together, in one "Biggest rival" box on the player page, weighing the number of matches more.
- Every opponent and partner in the match lists with the club they played for at the time; rivals with their current club.
- The upsets table shows club names as well as logos.

## v1.1.8 (2026-10-17)

- Fixed: the pipeline's "refresh the site" step never reached the site (it stopped at the redirect to www) yet passed; it now follows it and fails unless the site confirms.
- `pnpm data:pull` and `pnpm data:pull-raw` copy the live data to a local checkout.

## v1.1.7 (2026-10-17)

- Fixed: team matches weren't rated until the whole league group was finished. Groups still being played are saved with the ties played so far and fetched again every night.

## v1.1.6 (2026-10-17)

- Fixed: the pipeline workflow had never run (an invalid workflow file).
- The nightly run also fetches the player register, the clubs and the official ranking.
- Fewer bucket writes: player files no longer change on every run.
- The footer shows the time as well as the date.

## v1.1.5 (2026-10-17)

- Lighter player pages: only the 20 newest matches per discipline come with the page; "Show all" loads the rest.
- Fixed: player and club pages prerendered at build showed only "Loading…" until the browser filled them in.

## v1.1.4 (2026-10-17)

- Vercel Web Analytics on the site's pages.

## v1.1.3 (2026-10-17)

- Static, cached pages for the strongest clubs (/clubs/strongest/<discipline>), upsets (/upsets/<week or year>) and tournament events and summaries (/tournaments/<id>/<class>/<discipline>, /summary). Old links redirect.
- "Show inactive players" lists the 500 best inactive players, with a link to all of them.

## v1.1.2 (2026-10-17)

- Pages are cached until the nightly data update instead of rendered on every request, to stay within Vercel's free plan.
- The rankings are static pages per list (/rankings/<list>); old /?pool= links redirect.
- robots.txt keeps AI crawlers out, and all crawlers off head to head.

## v1.1.1 (2026-10-17)

- Men's disciplines rank only men and women's only women (women who play men's singles keep their rating there, unranked).

## v1.1.0 (2026-10-17)

- Head to head for doubles pairs: four players, their record and margins, and each pair's chance.
- Head to head compares men and women "just for fun", with a gender gap fitted on women's matches against men.
- Disciplines in head to head follow the players' genders.

## v1.0.1 (2026-10-17)

- Tabs remember their choice in the URL (?discipline=…).
- Dates and times through date-fns; date ranges across months and years read correctly ("30 Sep – 2 Oct 2026").
- New packages: date-fns, nuqs, Embla Carousel, Motion.

## v1.0.0 (2026-10-16): launch

- elodrop.no is live: the site on Vercel, the data on Cloudflare R2, club content in Sanity, updated by a nightly pipeline on GitHub Actions.
- Fixed for the launch: the example environment settings, the club import, and uploads to R2.

## v0.11.0 (2026-10-16)

- The elodrop website (Next.js): rankings, players, clubs, head to head, Eliteserien, upsets and tournament draws, with the club content in Sanity.
- The pipeline moved into its own repository, with a data export for the site and a nightly workflow.

## v0.10.5 (2026-10-16)

- Matches link to their tournament's draw-luck page.

## v0.10.4 (2026-10-16)

- Cancelled tournaments.

## v0.10.3 (2026-10-16)

- Single-group events and events with two entries.

## v0.10.2 (2026-10-16)

- Withdrawals in the draw simulations.

## v0.10.1 (2026-10-16)

- How the predictions turned out for played tournaments.

## v0.10.0 (2026-10-16)

- Tournament draws and draw luck: each event's draw simulated with the actual and a fair draw.

## v0.9.0 (2026-10-15)

- The biggest upsets of each week.

## v0.8.2 (2026-10-15)

- Winning margins in head to head and the match lists.

## v0.8.1 (2026-10-15)

- Search for clubs and Eliteserien as well as players.

## v0.8.0 (2026-10-15)

- Player search and head to head.

## v0.7.0 (2026-10-15)

- Eliteserien seasons in review.

## v0.6.0 (2026-10-15)

- Eliteserien team strengths.

## v0.5.3 (2026-10-15)

- Club strength as a weighted average of the best players or pairs.

## v0.5.2 (2026-10-15)

- Club pages with strength and rank by season.

## v0.5.1 (2026-10-15)

- Rating and ranking history with a logarithmic rank scale and tables by season.

## v0.5.0 (2026-10-15)

- Match lists with sorting, and highlights: biggest wins, losses, gains and drops.

## v0.4.3 (2026-10-15)

- Doubles ratings start from the singles rating; a junior weight.

## v0.4.2 (2026-10-15)

- Covid-19 adjustment of the activity window and penalties.

## v0.4.1 (2026-10-15)

- Match corrections, and club history.

## v0.4.0 (2026-10-15)

- Doubles and mixed doubles ratings.

## v0.3.0 (2026-10-14)

- The official ranking, for comparison, and club data.

## v0.2.2 (2026-10-14)

- Rankings and rating history.

## v0.2.1 (2026-10-14)

- Players' clubs in the ratings.

## v0.2.0 (2026-10-14)

- Elo ratings from every tournament and league match on badmintonportalen.no, with the rules written down.

## v0.1.0 (2026-10-13)

- Fetching tournament results.
