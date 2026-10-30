# Changelog

Every change merged into `main` gets an entry here, newest first.

**Versions** are `major.x.y`:

- **major**: `0` before the launch, `1` from the launch on elodrop.no. It only changes when the owner says so, for a major change.
- **x**: big features: new pages, new components, new capabilities.
- **y**: smaller features, improvements, bug and issue fixes.

## v1.19.5 (2026-10-30)

- The site's text is set in Redaction, a serif typeface, instead of Geist. So are the preview pictures shown when a link to the site is shared.

## v1.19.4 (2026-10-30)

- A player's rating graphs no longer stop at their last match in a discipline: the line carries on at the rating they ended on until they go inactive there (12 months without playing), like the ranking graph.

## v1.19.3 (2026-10-29)

- Clicking the logo (or any link to the front page) in Norwegian showed the "Out!" page instead of the front page. It goes to the front page again.

## v1.19.2 (2026-10-29)

- A few things are hidden around the site. Happy hunting.
- An address that doesn't exist (a mistyped link) shows the site's own page, with the menu and search, instead of a plain "404".
- Head to head no longer has a "Swap" button, which only flipped the two sides.

## v1.19.1 (2026-10-28)

- A tournament's events that aren't played yet show their favourite where a finished event shows its winner: the player or pair with the best chance of winning with the draw as it is (and with a fair draw), which isn't always the highest rated. When it isn't, it says who is rated higher.
- A tournament summary's lists (surprising winners, luckiest and unluckiest draws) are numbered, so their order is clear in two columns.
- Why a tournament wasn't played is shown in the page's language: "Avlyst i siste liten på grunn av landesorg etter Kongens død" for MAHI Sports Open in Norwegian. The pipeline now writes a reason code (`kingMourning`, `cancelled`) instead of English text; the site still reads the English text in data exported before.
- Eliteserien 2026/2027: three players on the federation's list are now found despite their names there: Filip Isdahl-Larsen and Léonard Thor Achaz Grøndahl (Klemetsrud, misspelt on the list) and Hege Leirud (Frogner, listed under her former name, Rikheim). They show with their ratings instead of as unrated.
- Switching language on head to head no longer leads to a missing page, and keeps the players you compared: elodrop.no/head-to-head/doubles?a1=…&b2=… opens elodrop.no/en/head-to-head/doubles?a1=…&b2=…, and back.
- Head to head is called "head to head" in Norwegian too, instead of "innbyrdes", and "H2H" in the short links next to a rival and an upset.
- The Norwegian text says "prediksjon" (predikert tabell, hvordan prediksjonene gikk) instead of "spådom".
- A finished tournament is "ferdigspilt" in Norwegian ("Ferdigspilt", "Klasser ferdigspilt"), not just "spilt".
- "What's new" is "Hva er nytt?" in Norwegian, not "Nytt".
- Mixed doubles is "Mixdouble" in Norwegian (and "mix" for short), not "Mixed double".

## v1.19.0 (2026-10-28)

- elodrop is in Norwegian: every page, at the same addresses as before (elodrop.no/rankings, elodrop.no/players/…), with numbers and dates written the Norwegian way ("2 646", "31. okt. 2026"). The English site is under /en (elodrop.no/en/rankings), and the menu switches between Norsk and English on the same page.
- Search engines get both languages: each page names its Norwegian and English version, and the sitemap lists both.
- The "What's new" page and a few Eliteserien notes from the data are still in English.

## v1.18.0 (2026-10-28)

- Links to elodrop show a preview when shared (Facebook, Messenger, Slack, X and others): a player's card has their club and rating and rank in each discipline, a club's its logo and rank in each discipline, a tournament's its dates and number of events and entries, and every other page the site's card.
- Every page has its own description for search results, written from its data: a player's ratings and ranks, a club's full name and region, a tournament's dates. Search engines and AI answer engines also get each page's canonical address and what it's about as structured data: players, clubs, tournaments, the breadcrumbs, and the questions "How does elodrop work?" answers.
- Clearer titles for search results: "Men's singles badminton rankings, Norway" instead of "Men's singles", and the front page's "elodrop · Elo ratings and rankings for Norwegian badminton". The rankings pages' heading is "Norwegian badminton rankings".
- The search bar and the head-to-head player search answer as you type: everything they search is loaded once, when you first click a search field, and searched in your browser instead of asking the server on every keystroke.
- Club logos load at the size they're shown (and as WebP or AVIF) instead of the full upload: the 150 logos on the rankings page went from about 13 MB to about 0.1 MB. Logos in the long ranking and draw lists load only when scrolled to.
- The search fields (the search bar, the head-to-head player search and the rankings' search) share the site's magnifying glass, and clear with a cross drawn like the site's other icons instead of the browser's own.
- Vercel Speed Insights on the site's pages: how fast pages load for real visitors (Core Web Vitals), page by page.
- The rankings choose men (♂) or women (♀) first, then the discipline: Singles, Doubles, Mixed doubles or Combined. Women's mixed doubles and combined lists are one click away, like the men's, instead of behind a separate switch on the men's lists. Switching between men and women keeps the discipline (and the inactive players or juniors).
- A player's page sits under the rankings in the breadcrumbs: Home / Rankings / the player.
- The ranking lists show their first 100 players at once and the rest as you scroll, instead of building all of them (up to 2,000 rows) before the page can be used: the rankings page is about a tenth of the size. The search above the table still finds every player.
- robots.txt keeps out more AI crawlers: AI search and assistants fetching pages for their users (ChatGPT, Claude, Perplexity, Mistral and more), Meta's, DuckDuckGo's and You.com's, and more dataset crawlers.
- A sitemap (/sitemap.xml, linked from robots.txt) lists every page search engines should find: the rankings, clubs, tournaments, Eliteserien, upsets and every player, rebuilt with each data update.

## v1.17.3 (2026-10-27)

- A player whose name in a tournament's draw differs from the one on badmintonportalen can now be identified by hand (`pipeline/identities.txt`, which keeps names out of the repository by storing a hash). A player listed under another name in Sandefjord Ranking U17*AB and ÅlesundCupen 2026 now shows with her rating there instead of an estimate.

## v1.17.2 (2026-10-27)

- A doubles match in a player's match list now shows the pull towards their singles that followed it ("−13.6 to singles"), below the match's own change, and the rating after includes it. Until their 200th doubles match, a player's doubles rating moves a little towards the level their singles gives after every match, so the matches didn't add up to the rating or to the rating change in a tournament's winner box.

## v1.17.1 (2026-10-27)

- A finished event's winner box keeps half the width when there's no final or no score to show next to it, instead of stretching across the page.
- A rating change that rounds to zero shows as ±0.0 (or ±0), not +0.0 or −0.0.

## v1.17.0 (2026-10-27)

- What if an Eliteserien tie were 10 matches instead of 8? A new page, /eliteserien/ten-matches, adds a 3rd men's singles and a 2nd men's doubles to every tie of this season, with the same players and rules, and compares it with today's format: the predicted table in both, how each team's points and places change, head to head with the change in every pairing, and each team's strongest lineup of 10 with who plays what. Haugerud's list has too few men for 10 matches, so one player is added to Haugerud for the test, as the page says at the top. Linked from the Eliteserien page and found in the search.

## v1.16.1 (2026-10-27)

- The rankings and the strongest clubs can be sorted by the biggest gain or loss since last week: click the ± column's header.
- A finished tournament event shows its winner in a box of its own, and in events with a final, the final's score with the winner and the runner-up.

## v1.16.0 (2026-10-27)

- Junior rankings (U19): a ranking for every discipline of everyone born in 2008 or later, rated from matches in junior classes and junior leagues only. Switch between all players and juniors at the top of the rankings.
- Combined rankings for men and for women, for everyone and for juniors: singles, doubles and mixed doubles together. Everyone ranked in at least two of the three is listed, so doubles specialists are ranked too: a discipline they no longer play counts with their rating from when they last played it, and one they never played as an adult as their weaker one. Each list shows the player's rating and rank in every discipline and their matches, and can be sorted by matches.
- Player pages show the player's birth year.
- Top ratings decay again while a player is away: after a year without playing a discipline, the part of the rating above 1850 halves every 2 years. Ratings at or below 1850 never change while away, since most players come back as good as before; top players come back a little worse.

## v1.15.2 (2026-10-26)

- The comparison with the official ranking is up to date (41,290 games, Elo's favourite won 76.7% against 64.3%), on the How it works page and in the pipeline's README. It now also reports the games between established players (20+ rated games each), where Elo's favourite won 78.5%.

## v1.15.1 (2026-10-26)

- Club pages: hovering a week on a discipline's strength history now also lists the players (or pairs) counted for the club's strength that week, best first, with any places the club couldn't fill.

## v1.15.0 (2026-10-26)

- A page on how elodrop works: /how-it-works explains how the ratings are calculated, in plain words anyone can follow, from where a new player starts to doubles, rankings and the rest of the site. Flip the "I'm a big nerd" switch for the formulas, parameters and tests under each part (a link with ?nerd=1 opens them). A "Try it" box shows two players' chances and what a win would be worth as you drag their ratings, and a chart shows how the ratings spread over the players in each discipline, the ranked players or everyone ever rated, against a normal distribution with the same average and spread (the ratings lean towards the bottom, with a long tail of strong players).
- A What's new page: /whats-new is this changelog made readable, a timeline by day with new features and improvements marked, and the versions before the launch folded away.
- Both pages are on the front page, each with a card (what a win is worth for the favourite and the underdog, and the three newest updates), in the header's menu at every screen size, under "About elodrop", and in the footer, with the current version beside What's new.

## v1.14.0 (2026-10-26)

- New rating calculation, which predicts results clearly better: in the 2025/26 and 2026/27 seasons, about 28 thousandths better in log loss in singles and 63 in doubles, and better in every season since 2017/18 and at every level. The rankings are also steadier from week to week.
  - Lower classes count more than before. No junior class counts more than U19 A, which counts like SEN B (it counted more than SEN A before), and the junior weight is ×1.5 up to that.
  - A doubles rating now also follows the player's singles rating: for their first 200 doubles matches, each match moves it a little towards what their singles rating suggests. New doubles players start closer to their singles level too.
  - Ratings no longer decay while a player is away. Players who haven't played for 12 months are still left out of the rankings.
  - Players from foreign clubs start a little higher, games between regions count ×1.5 (×2 before), and very one-sided and very close matches move ratings a little less.
- New rating scale: a new top-level player starts at 1150 (1500 before), and the best players are now around 2650, in singles and in doubles. Doubles ratings are on a scale like singles', and a pair plays at the average of its players' ratings (the sum before). No rating goes below 400 (550 in doubles). The scale on its own doesn't change rankings or win chances.
- Tournament draw luck and the Eliteserien seasons in review are worked out again with the new ratings, and the seasons in review are now redone on every full nightly rebuild.
- Pipeline: a benchmark of rating settings (`pipeline/benchmark.mjs`, results in `pipeline/BENCHMARK.md`), with intervals, every season since 2017/18, calibration and rank stability; `compare-ranking.mjs` runs again.

## v1.13.1 (2026-10-24)

- Chart colours that colour-blind readers can tell apart, in every theme: the five disciplines' colours are now distinct from each other in any combination (before, men's singles and men's doubles looked alike with red-green colour blindness in Totebag and All England), and every chart colour has at least 3:1 contrast on its theme's cards. The front page's cards use the same colours, with head to head's in its two sides' colours, so neighbouring cards never look alike.

## v1.13.0 (2026-10-24)

- A front page: what elodrop is, and a card for each part of the site with a live glimpse of it: the number one in each ranking, the strongest clubs, the predicted Eliteserien table, the week's biggest upset, the next tournament's luckiest draw and the season's favourites, and the top two men head to head.
- The rankings moved to /rankings (men's singles; the other lists as before). Old links to /rankings/men and /ranking go there, and every ranking list has a heading and a short introduction.

## v1.12.0 (2026-10-24)

- Ratings follow a tournament weekend day by day: the matches played on Friday are in the ratings, rankings, player and club pages the next morning, and so on through the weekend. Until a tournament has ended and its results are on badmintonportalen, they're taken from its draw on Cup2000; the final results from badmintonportalen then replace them. A match with a player who can't be identified from the draw waits for the final results.
- A tournament fetched from badmintonportalen before its results are there is fetched again each night for a week, instead of being kept without results.
- A tournament's draw luck is locked when it starts: the players' ratings, the seeds, the chances and the luck stay as they were before the first match, instead of being worked out again every night as the results came in. Only the results, and the luck from withdrawals on top, are added after that.

## v1.11.0 (2026-10-22)

- Icons instead of text symbols: the sort and rank-movement arrows, the search field's magnifier, the "show inactive players" tick, and a chevron on the sections that open (such as "Rating by season") instead of the browser's own triangle.
- The site's text is in translation files (one per area of the site), ready for a Norwegian version.
- Cleaner code: components grouped by area, shared building blocks (sections, cards, link tabs, badges, stat tiles) and helpers (formatting, URLs) used throughout instead of copies, and the data, utilities and types in folders of their own. The pages look and behave as before.
- Small text fixes on the way: counts of one in the singular ("+1 point", "1 player"), a proper minus sign on the strongest clubs' combined scores, and chances near zero shown as "<1%" in Eliteserien's predicted table.

## v1.10.0 (2026-10-21)

- Colour themes, chosen in the header's menu and remembered in the browser: "Yinyang", today's black and white (the default); "Totebag", light cream with dark olive text and court-green links; and "All England", the All England Open's grey courts. Every text colour passes WCAG AA contrast in each theme, and the chart lines are checked to stay apart for colour-blind readers.
- A menu button in the header: the site's links on phones, tablets and small laptops (below 1280 px), and the colour theme everywhere. On phones it opens as a panel under the header, from tablets as a dropdown; it closes on a link, Escape or a tap outside. On phones the header keeps to one line with the search below it, and tablets give the search more room.
- Eliteserien's head-to-head table spans the full width, and its colours follow the theme; the cells are now light enough for dark text to read on every one (the deepest used white text at about 2:1).

## v1.9.0 (2026-10-21)

- A logo: a drop shot. One line runs across like a rating graph that drops and recovers, its dip the feathers of a shuttlecock falling cork first, with the cork in orange, the one accent colour.
- The header shows the logo leading into the name; on a page load the line draws itself and the cork drops in (not with reduced motion).
- The site's own icon in browser tabs, bookmarks and on phone home screens, replacing the default Next.js icon. The 16 px tab icon is drawn on the pixel grid, so it stays sharp.
- `pnpm --filter web make-icons` renders every icon from the logo (`web/lib/logo.ts`).

## v1.8.0 (2026-10-21)

- Breadcrumbs above the title on every page below the front page (such as Home / Clubs / Kristiansand, or Home / Tournaments / Mossetreffen), instead of a single "← Rankings" or "← Clubs" link: each step links back, and the trail wraps on phones.
- The strongest clubs in one discipline (such as /clubs/strongest/mixedDoubles) lead back to all clubs, where they used to link to that discipline's player ranking.

## v1.7.0 (2026-10-21)

- A thin bar along the top of the page while the next page loads, so a tap or click visibly did something (especially on phones). It only appears when loading takes more than a moment, and fills and fades once the page is there; searches show it too.

## v1.6.0 (2026-10-21)

- Draw luck follows NBF's seeding rules: the fair draw seeds by the official ranking list valid the Wednesday after registration closed (a pair has the sum of its players' points; no points, no seed), with 2, 4, 8, 16 or 32 seeds by the number of entries, also in group events (at most one per group, as the organisers' draws show). Seed 1 goes to the top, seed 2 to the bottom, seeds 3–4 to the second and third quarters and 5–8 into the eighths, as the rules say. A seed the organiser placed elsewhere, or left out, now counts as luck. Before, the seeds were the strongest by our ratings, kept where the organiser put them. The ranking list is settled when a tournament's draw is first published, so later lists don't change its seeds.
- Seeded players and pairs are marked with their seed number on the tournament pages (hover for their ranking points), and each event says which ranking list it's seeded by.
- Classes without an official ranking (such as U11) are still seeded by rating.

## v1.5.1 (2026-10-21)

- Charts' detail box lists the lines from highest to lowest (on ranking charts: the best rank first), and glides smoothly as it moves and as the lines change order.

## v1.5.0 (2026-10-21)

- The week's 10 biggest upsets on the upsets page are a carousel: one card at a time on phones, two on tablets and three on desktop. Swipe or drag it, or use the arrows, which move one card at a time; the dots show and jump to each position.
- A reusable carousel component (Embla).

## v1.4.12 (2026-10-21)

- Fixed: club and player names were broken in the middle of a word in tables on tablets and smaller laptops (such as the combined club ranking at 1024 px). Names now only break inside a word on phones, where there's no other way to fit.

## v1.4.11 (2026-10-21)

- Club logos without their transparent margins, so they line up and fill their space: `pnpm --filter web trim-logos` saves each logo's visible part as its crop in Sanity, and the site shows the logos cropped (Sanity's image servers do the cropping).
- The Studio's crop tool for club logos, to adjust a crop by hand (the script leaves those alone).

## v1.4.10 (2026-10-19)

- The nightly pipeline fetches only what can have changed: team matches only for groups with a tie due (by date, up to 14 days late), tournament results only once a tournament's end date has passed, the official ranking only Wednesday to Friday and only when a new list is out, and the player register on Mondays. A quiet weekday night fetches in about a minute and a half instead of five.
- Raw files are kept between runs, so finished history isn't downloaded again every night.

## v1.4.9 (2026-10-19)

- Fixed: the nightly pipeline stopped when downloading tournament draws, which needed the ratings before they were calculated (since v1.4.4).

## v1.4.8 (2026-10-19)

- Fixed: the pipeline stopped at its Node.js setup after the update to setup-node v5, which looked for pnpm to cache packages the pipeline doesn't use.

## v1.4.7 (2026-10-19)

- Fixed: a tournament's final results (and how the predictions turned out) reached its draw page only with the next Sunday's rescan, a week later. Nightly runs now also fetch tournaments that ended in the last week, once more after they ended, so a Sunday tournament is complete after Monday's run.

## v1.4.6 (2026-10-19)

- Fixed: the changelog check on pull requests could fail although the PR added its entry; it now compares the PR's own commits and lists the files it saw.
- GitHub Actions updated (checkout and setup-node v5), ahead of Node.js 20 being retired on GitHub's runners.

## v1.4.5 (2026-10-19)

- The upsets table fits phones: one player per line (club and rating change after the name, wrapping together), "beat" between the sides, and on phones the chance under the event instead of in a column of its own.

## v1.4.4 (2026-10-19)

- The nightly pipeline only rebuilds what's needed: on nights with nothing new it stops after fetching (no uploads, the site keeps its cache), and a new tournament draw on a weekday updates just the tournament pages. Full rebuilds on Saturday, Sunday and Monday nights, and whenever results arrive, including team results registered late.
- The site can refresh one area of its data (such as the tournaments) without the rest.

## v1.4.3 (2026-10-19)

- Fixed: the change since last week (rating, strength and rank arrows) was empty every Monday until new matches. It now shows the newest weekend's results against the week before: building up over Saturday and Sunday, and staying until the next weekend starts.

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
