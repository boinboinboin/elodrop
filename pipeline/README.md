# Norwegian Badminton Elo

Elo ratings for Norwegian badminton players in singles and doubles, calculated from match results on [badmintonportalen.no](https://badmintonportalen.no). This is the specification of the ratings (`rules.mjs`, `rate.mjs`) and of everything built on them. How the current rules were chosen is in [BENCHMARK.md](BENCHMARK.md).

- [Match data](#match-data)
- [Rating formula](#rating-formula)
- [Start rating](#start-rating)
- [Adjustments](#adjustments)
- [Doubles](#doubles)
- [Not playing penalty](#not-playing-penalty)
- [Rating uncertainty](#rating-uncertainty)
- [On the site](#on-the-site)
- [Tournament draws: draw luck and how it turned out](#tournament-draws-draw-luck-and-how-it-turned-out)
- [Eliteserien](#eliteserien)
- [How the rules were tested](#how-the-rules-were-tested)

## Match data

- **Sources:**
  - Team matches (league play) from September 2013 onwards.
  - Tournament matches from September 2014 onwards. Tournaments in the 2013/2014 season have no results registered.
  - Tournaments being played: badmintonportalen gets a tournament's results only after it has ended, so until then the matches played so far are taken from its draw on Cup2000 (scores and winners), and rated the night after they're played. The players are identified by name, from the tournament's entry lists and the player register (and `identities.txt`, see [Players](#tournament-draws-draw-luck-and-how-it-turned-out)); a match with a player not identified waits for the final results. Once the tournament's results are on badmintonportalen, they replace the draw's.
- **Disciplines:** men's singles, women's singles, men's doubles, women's doubles and mixed doubles, rated as five separate pools. A player has a separate rating in each discipline they play.
- **Pool by event:** the event decides the pool, not the player. A woman playing men's singles is rated in the men's pool for that match.
- **Excluded:** [walkovers](#walkovers), unplayed matches, tournaments without results and matches removed in [corrections](#corrections).

> [!NOTE]
> The 2013/2014 and 2014/2015 seasons are a warm-up. 2013/2014 only has team matches (senior, U15 and U13 leagues), and most players get their first rated match in 2014/2015 when tournament data starts, so ratings need until about the end of 2014/2015 to settle.

### Walkovers

Walkovers are not rated. A 21-0, 21-0 result is treated as a walkover entered as a score; from the 2026/2027 season, when sets go to 15, so is 15-0, 15-0.

### Corrections

Results that are wrong on badmintonportalen can be corrected by hand in `pipeline/corrections.txt`, which `rate.mjs` applies on every run, so corrections survive refetching the data. One match per line, identified by its match key (shown under each match on the player pages):

```
T7143 47570 vs 24320  walkover  # Mossetreffen 2026: 21-1 21-1 is impossible with sets to 15
```

The key is `T<tournament id>` or `L<league tie id>` followed by the player ids of each side (`id+id` in doubles). When the same sides meet more than once in a tournament (in a group and again in a knockout round), the later meetings are numbered in playing order: `T588.2 26596 vs 24788`. A correction is `walkover`, `remove`, `score <sets>` (the winner follows from the score) or `winner <1|2>`; `score` and `winner` follow the side order written in the line. Lines that match no match are reported when rating. A `score` line with the score as recorded changes nothing; it marks the score as checked, so the match is no longer listed for review.

Each run also writes `data/suspicious-scores.txt`, the scores worth checking, newest first, as lines ready to copy into `corrections.txt`:

- **Impossible for the season's set format.** Sets are won by 2 points up to a cap: to 21 (cap 30) until 2025/2026, to 15 (cap 21) from 2026/2027, and to 11 (cap 15) or 15 in some junior classes. A 21-1 set in 2026/2027, or 22-21, can't happen. Tournaments where more than a fifth of the scores break these formats evidently played their own (Sandefjord SaBK Open and Vestre Aker Fjærfest 2015) and are left out.
- **Extreme blowouts**, where the loser scored at most 1 point per set. Most are real mismatches in junior and beginner classes, but some are no-shows entered as a score.

For impossible scores the list suggests the most likely intended score, assuming one typo per wrong set: the valid score in the match's own set format, with the same set winner, that is one typo away (a digit changed, added, removed or two digits swapped), preferring the smallest change in points and then keeping the winner's score. 18-15 becomes 18-16 and 12-25 with sets to 15 becomes 12-15. Scores without a single clear fix, which are mostly matches cut short (14-11, 21-14), are marked "no clear fix". A suggestion never changes who won a set, so it never changes who won the match.

Nothing is changed until a line is in `corrections.txt`. The 575 scores listed in October 2026 were all added there, with the suggested fixes applied (314) and the rest kept as recorded, for review.

## Rating formula

The ratings follow the [standard Elo rating system](https://en.wikipedia.org/wiki/Elo_rating_system#Theory).

### Expected score

For player $A$ with rating $R_A$ against player $B$ with rating $R_B$, the expected score of $A$ is

$$
E_A = \frac{1}{1 + 10^{(R_B - R_A)/300}}
$$

and $E_A + E_B = 1$. A rating difference of 300 points means the stronger player is expected to win about 91% of the time. (Standard Elo uses 400; the 300 here spreads the ratings a little less.) In doubles the scale is 240, for the [doubles scale](#doubles-scale).

### Rating update

After a match, player $A$'s rating becomes

$$
R_A' = \max\left(400,\ R_A + K_A \, (S_A - E_A)\right)
$$

where $S_A = 1$ for a win, $S_A = \tfrac{1}{2}$ for a draw and $S_A = 0$ for a loss, and 400 is the [minimum rating](#rating-scale-and-minimum-rating) (550 in doubles). Draws happen in some junior and lower senior leagues that play at most two sets: a match ending 1-1 in sets is a draw.

### K-factor

The K-factor scales the base factor $\kappa$ by the adjustments described below:

$$
K_A = \kappa \cdot w_c \cdot w_j \cdot w_m \cdot w_r \cdot m(R_A) \cdot c_t
$$

| Symbol   | Meaning                                                     |
| -------- | ----------------------------------------------------------- |
| $\kappa$ | Base K-factor                                               |
| $w_c$    | [Class level weight](#class-level-weight)                   |
| $w_j$    | [Junior weight](#junior-weight)                             |
| $w_m$    | [Margin of victory weight](#margin-of-victory-weight)       |
| $w_r$    | [Cross-region weight](#cross-region-weight)                 |
| $m(R_A)$ | [Current rating multiplier](#current-rating-multiplier)     |
| $c_t$    | [Covid-19 K-factor adjustment](#covid-19-period-adjustment) |

$m(R_A)$ depends on each player's own rating, so the two players in a match can gain and lose different amounts.

### Parameters

| Parameter (doubles in brackets)            |                       Value |
| ------------------------------------------ | --------------------------: |
| Top level start rating $p_0$               |                        1150 |
| Minimum rating                             |                   400 (550) |
| Expected score scale                       |                   300 (240) |
| Base K-factor $\kappa$                     |               59 (94.4) |
| Class level weights $w_c$                  |            100% down to 17% |
| Junior weight $w_j$                        | ×1.5, at most U19A's weight |
| Margin of victory power                    |                        0.75 |
| Cross-region weight $w_r$                  |                        ×1.5 |
| Foreign players' start                     |      +100 (+160), at most $p_0$ |
| Doubles scale                              |                        ×1.6 |
| Doubles start from singles                 |              ×1.12 (0.7 · 1.6) |
| Doubles pulled towards singles             |  3% per match, first 200 matches |
| Maximum rating deviation                   |                   260 (208) |
| Not playing penalty                        | above 1850: 1 year grace, half-life 2 years |

## Start rating

A player's start rating is set by the level of their first rated match, for juniors and seniors alike: from $p_0 = 1150$ at the top level down to 700 in singles, and down to the minimum of 550 in doubles (see the [class level table](#class-level-weight)). A newcomer in SEN D starts at 925 in singles, the same as one in U15A, since the two levels are treated as equal. In doubles, players who have played singles start from their singles rating instead (see [start rating from singles](#start-rating-from-singles)).

Players from foreign clubs (clubs with no Norwegian region) start 100 points above their class's start rating (160 in doubles), at most at $p_0$: the class they enter says less about them, and they were underrated (they won more than predicted). In doubles, those who have played singles start from it as everyone else.

Starting every senior at the top level start rating regardless of level was tested and predicted results clearly worse: adult beginners started several hundred points too high, and the extra points ended up with the players who beat them.

After the start, ratings only change through results. Juniors who improve quickly catch up through $m(r)$, which gives players below $p_0$ larger rating changes, and the [junior weight](#junior-weight).

### Rating scale and minimum rating

Only rating differences decide the expected score, so where the scale starts is a choice: the top level start of 1150 puts the top ratings around 2650, in singles and in doubles (with the [doubles scale](#doubles-scale)). Until v1.14.0 it was 1500, with doubles ratings on the half-size scale. On its own, moving the start changes no prediction, since $m(r)$, the class start ratings, the singles seed and the minimum move with it.

No rating goes below a **minimum rating**: 400 in singles (750 below the start) and 550 in doubles (375 below it on the half-size doubles scale, as tuned), at the start or after a match. A player on the minimum loses less than their opponent gains, so unlike the scale this changes ratings: the weakest players' ratings, mostly in doubles, otherwise sink further than their results justify. Of the minimums tested, this one predicted best without costing anything on settled players (see [BENCHMARK.md](BENCHMARK.md#the-floor-on-the-1100-scale)). In October 2026, 35 active singles players and 232 active doubles players are on the minimum.

## Adjustments

### Class level weight

$w_c$ depends on the tournament class or team league the match is played in, and the same levels set a new player's [start rating](#start-rating). With the [junior weight](#junior-weight) $w_j$ on top, juniors and seniors on the same level count differently, so each is listed with the weight its matches count at:

| Classes and leagues                                                                                                                   | $w_c \cdot w_j$ | Start, singles | Start, doubles |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------: | -------------: | -------------: |
| SEN X, SEN E, SEN A; Eliteserien (incl. qualification); 1. HS and 1. DS in 1st div                                                    |            100% |           1150 |           1150 |
| U19A/X; Junior NM for lag (U19)                                                                                                       |             91% |           1075 |           1000 |
| SEN B, O35–O45; 2. and 3. HS and 2. DS in 1st div                                                                                     |             91% |           1075 |           1000 |
| U17A/X; U17 leagues, Landsfinale U17; U17/U19 singles series                                                                          |             91% |           1000 |            850 |
| SEN C, O50–O55; 2nd div; 1st div qualification                                                                                        |             74% |           1000 |            850 |
| U15A/X; U15 leagues, Landsfinalen U15                                                                                                 |             87% |            925 |            700 |
| SEN D, O60+; 3rd div (incl. combined 2nd/3rd div)                                                                                     |             58% |            925 |            700 |
| U13A/X, U19B, U17B; U13 leagues, Landsfinalen U13; U13/U15 singles series                                                             |             65% |            850 |            550 |
| U11A, U15B, U13B                                                                                                                      |             38% |            775 |            550 |
| 4th div; other senior series (Oslofjordserien, Klubbserie, Trimliga, Pizzaliga, Herreserien, adult beginner series, …)                 |             25% |            775 |            550 |
| Other junior classes (U11B, U9, …); junior beginner series (Nybegynnerserie)                                                          |             25% |            700 |            550 |
| Other (incl. Åpen HC); internal club events                                                                                           |             17% |            700 |            550 |

The class weights $w_c$ are 100, 91, 74, 58, 44, 25 and 17% from the top level down: the original 100/85/60/40/25/10/5% to the power 0.6, which lets the lower classes count more (since v1.14.0; this predicted better overall, at about the same accuracy at the top). Start ratings go down 75 points per level in singles, and twice as far in doubles (1.25 times as far on the half-size scale the doubles model was tuned on, see [doubles scale](#doubles-scale)), not below the [minimum rating](#rating-scale-and-minimum-rating).

League names vary by region and season ("1. divisjon Østlandet", "1. Div Oslofjorden 18/19", "2.div. Sør", …), so they are matched by pattern.

### Junior weight

$w_j = 1.5$ for matches in junior classes and leagues (U9–U19), in every discipline, but no junior class counts more than the top junior level (U19A/X and Junior NM for lag, $w_j = 1$), which counts like SEN B; otherwise $w_j = 1$. So U17A counts 91% like U19A, not 110%. The class weights lower the K-factor in junior classes on purpose, since junior results say less about a player's level on the senior scale. But juniors improve faster than that lets their ratings follow, so their ratings lagged behind their results. The idea comes from table tennis: Germany's TTR system raises the K-factor for young players.

Junior results shouldn't count more than the senior top level: with the junior weight on top, U19A counted 128% until v1.14.0, more than SEN A. Leaving the junior weight out of U19A, and capping the other junior classes at U19A's weight, predicted as well or slightly better (see [BENCHMARK.md](BENCHMARK.md#round-3-junior-class-weights), and round 8).

### Margin of victory weight

$w_m$ depends on how one-sided the match was. With $d$ the point difference divided by the total points played,

$$
w_m = \min\left(3,\ \left(\frac{\max(d,\ 0.02)}{0.2}\right)^{0.75}\right)
$$

A typical margin ($d = 0.2$, e.g. 21-15, 21-13) gives $w_m = 1$. A close match such as 22-20, 21-19 gives about $\tfrac{1}{3}$, and a blowout such as 21-5, 21-3 gives 2.5. Draws use $w_m = 1$.

Adding the margin of victory improved predictions more than any other change tested (about 5% lower log loss on seasons not used for tuning). The power 0.75 (linear until v1.14.0) makes both extremes count a little less, which predicted slightly better in nearly every season and subset tested.

The margin also covers match length: three-set matches almost always have a small point difference, so they already count less. An earlier separate weight for three-set wins (85%) was removed, since it lowered them twice and made predictions slightly worse.

### Cross-region weight

$w_r = 1.5$ when the two players' clubs belong to different regional associations (kretser), otherwise $w_r = 1$. Clubs are mapped to regions using badmintonportalen's club list; clubs that no longer exist use the region of the regional leagues they played in. Foreign players and combined league teams have no region and get $w_r = 1$.

Players in isolated regions mostly meet each other, so their ratings drift away from the rest of the country: before this weight, players from Hålogaland, Finnmark, Innlandet and Midtnorsk Sør scored 0.05–0.08 below their expected score against players from other regions. Counting games between regions more moves more points between regions and reduces that gap. ×2 (used until v1.14.0) reduced it by about a quarter; with the other rules of v1.14.0, ×1.5 predicts better, and higher weights worse.

### Current rating multiplier

Allows lower rated players to advance more rapidly, while stabilizing ratings at the top:

$$
m(r) = 1 + \frac{2}{1 + 2^{(r - p_0)/90}}
$$

where $r$ is the player's current rating and $p_0 = 1150$; in doubles the 90 is 144 (see [doubles scale](#doubles-scale)). $m(r)$ approaches 3 far below $p_0$, equals 2 at $p_0$ and approaches 1 far above $p_0$.

### Covid-19 period adjustment

| Period                  | Not playing penalty | K-factor $c_t$ | Time towards inactive |
| ----------------------- | ------------------- | -------------- | --------------------- |
| 2020-03-18 – 2020-10-10 | None                | $\times 50\%$  | None                  |
| 2020-10-11 – 2021-02-01 | $\times 50\%$       | $\times 50\%$  | $\times 50\%$         |
| 2021-02-02 – 2021-07-24 | $\times 50\%$       | Normal         | $\times 50\%$         |
| 2021-07-25 – 2021-11-15 | $\times 70\%$       | Normal         | Normal                |
| 2021-11-16 – 2022-03-08 | $\times 90\%$       | Normal         | Normal                |
| From 2022-03-09         | Normal              | Normal         | Normal                |

The not playing penalty column is how fast time without playing counts towards the [not playing penalty](#not-playing-penalty). _Time towards inactive_ is how fast time without playing counts towards a player becoming inactive (12 months, see [Rankings](#rankings)). A player who was active when Covid-19 started stays active through the lockdown, until well into 2021. Without it, most players went inactive at once and [club strengths](#club-strength-history) dropped through 2020 and 2021: in June 2021 only 33 clubs had a men's singles strength, against 81 with it.

## Doubles

Each player has their own doubles rating; pairs have no rating of their own. A side plays at the average of its two players' ratings, and the expected score compares the averages:

$$
E_{AB} = \frac{1}{1 + 10^{\left(\frac{R_C + R_D}{2} - \frac{R_A + R_B}{2}\right)/240}}
$$

So a pair whose players are each 240 points better than their opponents wins about 91% of the time, as a singles player 300 points better does. The side's rating change $K \, (S - E_{AB})$ is shared between the partners by their [rating uncertainty](#rating-uncertainty):

$$
R_A' = R_A + K_A \cdot \frac{RD_A^2}{RD_A^2 + RD_B^2} \, (S - E_{AB})
$$

with $K_A$ as above, using the doubles base K-factor $\kappa_d = 1.6 \cdot 59 = 94.4$. Two equally established partners get half each. A newcomer playing with an established partner takes most of the change, since the result says more about the newcomer's unknown level than about the partner's well-known one.

### Doubles scale

The doubles model was tuned on per-player ratings where a side plays at the sum of its players' ratings: the half-size scale. Doubles ratings are 1.6 times that, measured from $p_0$, so that they read like singles ratings: a new top-level player starts at 1150 in both, and the top ratings are around 2650 in both. A side plays at the average of its players' ratings, and everything doubles measures in rating points is 1.6 times its half-size value to match: the expected score's scale ($300 \cdot 1.6 / 2 = 240$ for an average), $\kappa_d = 1.6 \cdot 59$, how far the class start ratings and the minimum are below $p_0$, the singles seed factor ($1.6 \cdot 0.7$), $m(r)$'s width ($1.6 \cdot 90$) and the [rating deviation](#rating-uncertainty). So every expected score and rating change is exactly the same as on the half-size scale, scaled by 1.6; the factor only sets how far doubles ratings spread (`DOUBLES_UNIT` in `rules.mjs`). This was checked on every player and match when the factor changed in v1.14.0 (from 2 to 1.6, putting the top doubles ratings level with the top singles ratings).

Singles and doubles are still separate pools, so a singles rating and a doubles rating can't be compared directly; the scales are only similar in size.

### Start rating from singles

A player who has played singles before their first doubles match starts doubles from their singles rating at that moment, instead of the class start rating:

$$
R_{\text{doubles}} = p_0 + 1.6 \cdot 0.7 \cdot (R_{\text{singles}} - p_0)
$$

A 2050 singles player starts doubles at 2158. The factor 0.7 is on the half-size doubles scale (0.6 until v1.14.0). Mixed doubles uses the singles discipline the player has played most. Players without singles keep the class start rating.

### Doubles pulled towards singles

Singles keeps telling us about a player's doubles level after their first doubles match: with few doubles matches, and the side's change shared with a partner, a doubles rating otherwise follows the player's level slowly. So after each doubles match, a player with fewer than 200 doubles matches who has played singles moves 3% of the way from their doubles rating towards the doubles rating their singles rating gives a newcomer (as above):

$$
R_A'' = R_A' + 0.03 \cdot \left(R_{\text{doubles}}(R_{\text{singles}}) - R_A'\right)
$$

A doubles rating therefore moves partly with the player's singles results. The match list shows the pull below the match's own change ("−13.6 to singles", `pull` in the match log) and the rating after both, so the matches add up to the rating: Adrian Olsen-Loe Pedersen won Båtsfjord Open 2026's mixed doubles with +37 from his five matches, but his singles (955, a doubles level of 932) pulled his 1402 down about 13 after each, and he ended the week on 1372. This was the biggest gain in the benchmark of v1.14.0 (about 28 thousandths of log loss on doubles games, in every season since 2017/18): see [BENCHMARK.md](BENCHMARK.md#rounds-48-the-tuned-rules).

## Not playing penalty

Only top ratings decay (since v1.16.0): after a grace period of 365 days without playing in a discipline, the part of the rating above 1850 (in singles and doubles alike) halves every 2 years:

$$
r(t) = 1850 + (r - 1850) \cdot 2^{-(t - 365)/730}
$$

after $t$ days away, with time during Covid-19 counting slower (see [Covid-19 period adjustment](#covid-19-period-adjustment)). Ratings at or below 1850 never change while the player doesn't play. A 2300 player away for 2 years comes back at 2168, and after 3 years at 2075. Ranking lists also leave out players who haven't played for 12 months (see [Rankings](#rankings)).

Most players come back from a break about as good as they were, or better: juniors keep improving while they don't play, and in their first 5 matches back players aged under 50 score 2 to 6 points of expected score above their rating. So a penalty for everyone predicts worse. Top players are the exception: from about 1850, returning players do somewhat worse than their rating, more so after 2 years or more. Decaying only the part above 1850 predicts as well as no penalty overall (no season better or worse), leans the right way on top players' returns, and keeps a top player who stopped playing from holding a rating they no longer play at, which counts in the [combined rankings](#combined-rankings). See [BENCHMARK.md](BENCHMARK.md#round-9-the-not-playing-penalty-again).

Until v1.14.0, the part of every rating above $p_0$ decayed after 365 days with a half-life of 3 years; from v1.14.0 to v1.16.0 there was no penalty.

## Rating uncertainty

Every rating comes with a $\pm$ range showing how reliable it is, based on the [Glicko](https://en.wikipedia.org/wiki/Glicko_rating_system) rating deviation $RD$. The range is $\pm 2 \cdot RD$, so the player's true level is within it with about 95% probability. It is in the data (`plusMinus`) but not shown on the site, where the rating gained or lost since last week took its place. In singles it does not change how ratings move; in doubles it decides how a side's rating change is shared between the partners.

New players start at $RD = 260$ ($\pm 520$), in doubles $208$ (see below). Time without playing increases it:

$$
RD' = \min\left(260,\ \sqrt{RD^2 + c^2 t}\right)
$$

where $t$ is the number of days since the last match and $c$ is set so that an $RD$ of 40 grows back to 260 in about 10 years (in doubles, everything 0.8 times as large). Each match then reduces it:

$$
RD' = \left(\frac{1}{RD^2} + q^2 \, g(RD_B)^2 \, E (1 - E)\right)^{-1/2}, \qquad q = \frac{\ln 10}{300}, \qquad g(RD) = \frac{1}{\sqrt{1 + 3 q^2 RD^2 / \pi^2}}
$$

where $E$ is the expected score against opponent $B$, adjusted for $B$'s uncertainty. Matches with an almost certain result (against a much weaker or stronger opponent) say little about a player's level, so they reduce the $RD$ only a little. Top players who mostly play much weaker opponents therefore keep a wider range than players with many close matches.

The growth rate and the use of all matches (without class level weights) were fitted to the data: with these settings, players' actual results match the uncertainty the ranges predict.

In doubles, a player is measured against the opposing side's rating (the average), with $RD_B = \sqrt{RD_C^2 + RD_D^2}/2$ and $q = \ln 10 / 240$. A player's rating moves their side's by half, so a match tells a quarter as much about it: the $q^2$ term is multiplied by $\tfrac{1}{4}$. On the half-size scale, the doubles maximum, and with it the growth rate, is half the singles one ($RD_{max} = 130$, so $1.6 \cdot 130 = 208$ on the [doubles scale](#doubles-scale)). This was checked by splitting each player's games into blocks of 10. For each block, the rating that best explains its results (given the other players' ratings) differs from the player's rating before the block by the measurement noise of 10 games plus the player's true error. That error should match the $RD$:

| Pool                                              | True error / $RD$ |
| ------------------------------------------------- | ----------------: |
| Singles                                           |               1.1 |
| Doubles, half-size $RD_{max} = 260$               |              0.78 |
| Doubles, half-size $RD_{max} = 130$ (used)        |              1.05 |

With the singles maximum, doubles ranges were about 30% too wide.

## On the site

### Rankings

Ranking lists only include players who have played in the last 12 months, with time during Covid-19 counting slower (see [Covid-19 period adjustment](#covid-19-period-adjustment)). Inactive players keep their rating and history, and reappear in the rankings as soon as they play again. The rankings page can show them too (without a rank) with "Show inactive players": the 500 best of them, with a link to a page with everyone. Each list is its own page (`/rankings` for men's singles, `/rankings/<list>`, `/rankings/<list>/inactive` and `/rankings/<list>/inactive/all`; mixed doubles women at `mixedDoubles-women`), as are the strongest clubs (`/clubs` combined, `/clubs/strongest/<pool>`), so every page can be cached until the next data update.

The club shown for a player is their club registered on badmintonportalen. Players no longer in the register show the club of their last tournament, or otherwise the club of their last league team. League team names such as "Kristiansand 2" are team numbers, not clubs.

### Since last week

The rankings show how each ranked player and club has moved since last week. Matches are played Friday to Sunday, so "this week" is the newest weekend's week: from Saturday (that night's run has Friday's matches) the current week, Monday to Friday the week that just ended. The comparison is with the end of the week before it (Sunday), so a weekend's changes build up over the weekend and stay until the next one starts: a green ▲ with the places gained, a red ▼ with the places lost, – for no change, and a blue dot with "new" for one who wasn't ranked then. Beside each rating is the rating gained or lost since then (from the weekly rating history; a week without matches keeps the rating it ended on), and beside each club's strength the strength gained or lost. Clicking that column's header (±) sorts the list by the biggest gain since last week, again by the biggest loss, and again back to rank order (the header shows +, − or ±); players and clubs new since last week come last, and the places gained or lost stay shown beside each. Last week's club ranking is made the same way as the current one, from each player's registered club and the ranked players' ratings at the end of last week, so a club only moves through results and players becoming active or inactive, not through the club history (which follows the club played for). In `data/ratings.json`: `previousRank` and `ratingChange` on the ranked players, `previousRank` and `strengthChange` on the clubs.

### Men's and women's disciplines rank their own gender

Men's singles and doubles rank only men, and women's singles and doubles only women. Women mostly play men's singles when there are too few entries for women's singles, so a rank among men says little about them, and before this 202 women held men's singles ranks (the best at #114) and 274 held men's doubles ranks, pushing men down. They keep their rating and history there, which predict their matches against men as before, and these matches are what the [gender gap](#men-against-women-the-gender-gap) is fitted on; they just aren't ranked, aren't in the inactive list either, and don't count for club strength. Players of unknown gender are ranked in men's and women's disciplines (in mixed doubles they get no rank, see below). The weekly ranking history follows the same rule.

### Mixed doubles: men and women ranked separately

Mixed doubles is rated as one pool, but men and women are ranked in separate lists. Nearly every mixed pair is one man and one woman (32,297 of the 32,425 pairs where both genders are known), so results show how men compare with other men and women with other women, but not how men's mixed ratings compare with women's: raising every man's rating by the same amount and lowering every woman's would predict every result the same.

Gender comes from badmintonportalen's player register. For players not in it, it is the opposite of most of their mixed doubles partners' genders, or otherwise female if they have played women's singles or doubles. Players whose gender is still unknown get no mixed doubles rank.

### Junior rankings (U19)

`/rankings/junior` (men's singles) and `/rankings/junior/<list>` rank the juniors in each discipline from junior matches only: every match in a junior class (U11 to U19) or a junior league is rated again on its own, with the same rules, starting from nothing, so only results between juniors count. Juniors who also play senior classes keep those results in the main rankings, where their rating comes from every match; mixing the two here would rate a junior's senior matches against opponents who aren't in the junior pool. The list is everyone under 19 in the season by birth year, as badmintonportalen's age groups: in a season starting in year S everyone born in S − 18 or later (2008 or later in 2026/27). Players without a known birth year aren't ranked. Active, gender (men's and women's disciplines rank their own gender, mixed doubles ranks men and women separately) and "since last week" (the junior ratings and ranks from the junior matches up to the end of last week) are as in the main rankings. In `data/junior.json`; exported as `junior/<pool>.json`.

### Combined rankings

`/rankings/combined` (men) and `/rankings/combined/women` rank singles, doubles and mixed doubles together; `/rankings/junior/combined` and `/rankings/junior/combined/women` do the same with the junior rankings. A player's score is the average of their standard score in each of their three disciplines (mixed doubles among their own gender): their rating minus the mean rating of the listed players ranked in that discipline, divided by the standard deviation, as for the clubs' [combined list](#strongest-clubs). The disciplines are separate rating scales with different spreads, so averaging the ratings themselves would let the widest spread count most; standard scores make each count the same. 0 is an average listed player, +1 one standard deviation above.

Everyone ranked in at least two of their three disciplines is listed. In a discipline they aren't ranked in (not played in the last 12 months), their rating there counts: their level when they last played it, less any [not playing penalty](#not-playing-penalty) (Jonas Østhassel's 2106 in singles from January 2025, Aimee Hong's 1551 in singles from November 2024; 190 men and 71 women in October 2026). Only ratings from adult play count (19 or older that year, or birth year unknown): juniors come back far better than their old rating (see [Not playing penalty](#not-playing-penalty)), so Mathias Ji Hong's singles rating from 2019, at 15, would put him far below his level. The junior combined lists therefore never use one.

A discipline they never played as an adult counts as their weaker one, so doubles specialists who don't play singles are ranked (Mathias Ji Hong is #17 among men in October 2026, from #13 in men's doubles and #14 in mixed doubles), but leaving a discipline out never raises a score. It also counts at most as the score in it of anyone at least as good in both their other disciplines, so a specialist never ranks above a player who is as good everywhere they play and plays the third discipline too. Without this, 2,436 such pairs among men and 267 among women were the wrong way round: the same rank is worth a different standard score in each discipline (men's mixed doubles has 977 listed players against about 1,500 in singles and doubles, so its scores are lower at the same rank: 2.32 at #30 against 2.44 in singles), and a weaker one from singles or doubles could come out above a better player's actual mixed doubles score. Most of the specialists it applies to are held down by it, by a little. Requiring all three left out 741 men and 225 women, among them some of the best doubles players; averaging only the disciplines played would let a player gain by not playing their weakest. Players ranked in one discipline only are in that discipline's ranking. "Since last week" compares with the same list made from the ratings and ranks at the end of last week; Matches is the matches in the disciplines counted, together. In `data/combined.json`; exported as `rankings/combined-<men|women>.json` and `junior/combined-<men|women>.json`.

Birth years come from each player's profile on badmintonportalen ("Født 2006"): `node fetch-birth-years.mjs` fetches the players in the register and the fetched results who don't have one yet, one request each, into `data/birth-years.json` (null where the profile shows none). The first run takes about 45 minutes; the nightly run only fetches new players. The player pages show the birth year.

### Ranking history

At the top of a player's page, one chart shows their national rank at the end of every week since they started, with a line per discipline, and a table of their rank at the end of each season. The weekly rank uses the same rules as the ranking lists: players are ranked by their rating at the end of the week, among players active then (Covid-adjusted), and in mixed doubles among men or among women. The current week is the ranking itself. The chart has a logarithmic scale with #1 at the top, so a climb from #100 to #50 looks as big as one from #20 to #10.

The ranks are in `data/history/<id>.json` (`ranks`, alongside `ratings`; they run on past the last rating week while the player is still active) and the number of ranked players per week in `data/rank-counts.json`. Each history also has `seasons`, the rating, club, rank and number of ranked players at the end of each season, precomputed by `rate.mjs` for the tables on the player page.

### Club history

The rating graph is coloured by the club the player played for at the time: the club of their last tournament, if it was within the last 12 months, otherwise the club of their last league team.

### Women's singles first

On the page of a woman (by gender in badmintonportalen's player register) who has also played men's singles, women's singles is shown first.

### Matches

A player's page has one tab per discipline they have played, with a graph of all their disciplines together above the tabs. Each tab lists all their matches, showing the last 20 with a button to show all (`data/matches/<id>.json` holds every match, newest first). Each match shows the rating after it and the change it brought, and in doubles the pull towards singles that followed it (see [Doubles pulled towards singles](#doubles-pulled-towards-singles)). Every opponent and partner is shown with their rating before the match and the club they played for at the time (their club history, as on the rating graph); rivals with the club they play for now. A Highlights box, with a tab for each, lists their 5 biggest wins and losses and the 5 matches that raised and lowered their rating most (largest rating change, in any match). Biggest wins are the wins with the lowest win chance before the match ($E_A$); biggest losses are the losses with the highest. Only matches where both players already had 10 rated matches count, since start ratings are too uncertain to make an upset meaningful.

### Rivals

A player's biggest rival is the opponent they have had the closest matches against, in all disciplines together (in doubles both opposing players count as opponents), measured by the average point margin $d$ (as in the [margin of victory weight](#margin-of-victory-weight)) over at least 3 matches. To favour many close matches over a few, the average is pulled towards a typical margin of 0.2 as if there were 10 more matches: $(\sum d + 10 \cdot 0.2) / (n + 10)$. With fewer (2), the biggest rival was usually someone met 3 or 4 times who happened to play very close; with 10, it's a long rivalry, such as Aleksander Jakovlevs and Filip Bøhn (31 matches, 10.7% average margin). The player page shows the closest 3, once for the player rather than per discipline, each with how many of the meetings were in which discipline.

### Biggest upsets

`rate.mjs` writes each week's (Monday to Sunday) 10 biggest upsets to `data/upsets.json`: the matches won with the lowest chance of winning, from the ratings right before the match. Only matches between settled players count: every player has at least 10 matches (as for biggest wins) and a rating certain to within ±250 in singles or ±288 in doubles (RD before the match at most 125 or 144, about the more certain half of ranked players). Without the RD limit, the list filled up with juniors improving faster than their rating. Walkovers and draws are left out. The rankings page highlights the top 3 of the current week, or of the last week with matches; `/upsets` shows the newest week's top 10, `/upsets/<Monday>` any other week's and `/upsets/<year>` that year's newest week, each with the biggest upset of every week of its year. Each player is shown with their rating before the match, the rating the match gained or cost them, and their club at the time and its logo (when the club has one).

### Strongest clubs

Clubs are ranked per pool by a weighted average of their best ranked players (singles) or pairs (doubles), the best counting most:

| Pool                           | Counted                                                                    | Weights, best first   |
| ------------------------------ | -------------------------------------------------------------------------- | --------------------- |
| Men's singles, women's singles | best 4 players                                                             | 40% · 30% · 20% · 10% |
| Men's doubles, women's doubles | best 3 pairs: the club's two best players, the next two, the next two      | 50% · 33% · 17%       |
| Mixed doubles                  | best 4 pairs: its best man with its best woman, the second best of each, … | 40% · 30% · 20% · 10% |

A pair counts at the average of its two players' ratings, as in a match. Pairs are formed from the club's ranked players by rating, not from who actually plays together. In mixed doubles each pair has a man and a woman, since men's and women's mixed ratings can't be compared (see above).

Places a club can't fill (a missing player, or a missing partner) count at the lowest rating among ranked players in the pool (in mixed doubles, among men or among women). So every club with at least one ranked player is listed, and smaller clubs rank lower, as they should; adding a real player can never make a club weaker. Counting the best few, rather than all players, keeps big clubs with many beginners from being ranked low, and the falling weights keep one-star clubs from being ranked high.

The combined list ranks clubs by their average standard score in all five disciplines, so only clubs listed in every discipline are included. In each discipline, a club's score is its strength minus the average strength of the listed clubs, divided by the standard deviation of their strengths: 0 is an average listed club, +1 one standard deviation above it. The pools are separate rating scales with different spreads, so averaging the strengths themselves would let the widest spread count for more. Standard scores make each discipline count equally.

### Club strength history

Each club page shows the club's strength per pool at the end of every week since 2013, with its rank among clubs that week. It is the same weighted average of the best ranked players or pairs as above, using the ratings at the time, with the lowest rating among players active that week for places a club can't fill. A player counts for a week if they were active then (played in the 12 months before it, Covid-adjusted as for the rankings), for the club they played for at the time (as in a player's [club history](#club-history)). Weeks where the club had no ranked player leave a gap.

The current week is the club ranking itself, so the graph ends on the strength and rank shown next to it. That ranking uses players' registered clubs, so a player who has just changed clubs (and not yet played for the new one) shows up as a step in the last week. The history is written per club to `data/club-history/<NBF club id>.json`, only for clubs in badmintonportalen's club list, with each discipline's strength, rank and number of clubs at the end of each season precomputed (`seasons`) for the tables. Each discipline also lists the players or pairs counted (`top`), best first, as periods `[week, [[id], [id, id], ...]]` that start whenever they change (weeks counted from the discipline's `from`), with the players' names in `players` (by id); the current week's are the club ranking's. Hovering a week on a discipline's graph shows them, with a pair that has only one player marked "no partner" and the places not filled counted. On the club page each discipline is a tab, as on the player page, below the graphs of all disciplines together.

The club page also shows all five disciplines on one graph, and the combined score over time. The combined history uses the same standard scores as the combined ranking, computed each week among the clubs with a strength in all five disciplines that week, so a club has no combined value in weeks it was too small to be listed in every discipline. Its current week is also the combined ranking itself.

### Club content

What the site shows for a club besides the ratings (short name, full name, region, website, NBF club id and logo) is edited in Sanity (Studio at `/studio`); until Sanity is set up, it comes from `web/content/clubs.json`, the export of the old site, which `pnpm --filter web import-clubs` imports into Sanity. Players are matched to a club by its short name, as in the results.

### Head to head

`/head-to-head?a=<player id>&b=<player id>` compares two players, chosen with name search (every word must be in the name, accents ignored and æ/ø/å read as ae/o/a; names starting with the search first, then ranked players; searched in the browser, see the search bar). It shows their record against each other (all disciplines, from player A's side) and together as partners, both from the complete match logs. For each discipline both are rated in, it shows the current ratings and A's chance of beating B now from the expected score; in doubles the chance is with equally rated partners, so two players 200 apart make pairs 100 apart. Both players' rating histories in that discipline are drawn on one chart. Winning margins, overall and per discipline, come from the scores of their meetings (walkovers left out): matches, sets and points won by each, each player's average point margin in the matches they won and their biggest win, how many went to a deciding set, and the closest match (smallest point difference). Each meeting in the list shows its point margin. Player pages link to it, also from each rival.

### Doubles head to head

`/head-to-head/doubles?a1=&a2=&b1=&b2=` compares two pairs the same way: their record against each other (the same four players, from pair A's side), each pair's record together, winning margins, and pair A's chance of beating pair B now, from the averages of the partners' ratings. Pairs are compared in the discipline their genders put them in: two men's pairs in men's doubles, two women's pairs in women's doubles, two mixed pairs in mixed doubles. The players' head to head likewise compares singles and men's or women's doubles only between players of the same gender, since women mostly play men's singles when there are too few for women's singles; mixed doubles is compared between anyone. An unknown gender rules nothing out.

### Men against women: the gender gap

The disciplines are rated separately, so a woman's rating in women's singles says nothing by itself about how she would do against men, and mixed doubles can't tell either (see [mixed doubles](#mixed-doubles-men-and-women-ranked-separately)). The link is the women who play men's singles and doubles: their results against men can be set against their rating in their own discipline at the time (`gender-gap.mjs` → `data/gender-gap.json`). A woman rated $w$ in women's singles plays like a man rated

$$w + a + b\,(w - p_0)$$

in men's singles, with $a$ and $b$ fitted by maximum likelihood over those matches (the expected score as above; her rating from the end of the week before the match). In doubles, only matches with a male partner count, and her side plays at the average of her mapped women's doubles rating and his men's doubles rating. With the data up to October 2026:

| Format  | Matches | $a$ (at $p_0$) |          $b$ | Gap at $p_0 - 300$ | $p_0 + 300$ | $p_0 + 600$ | Log loss (no gap) |
| ------- | ------: | -------------: | -----------: | -----------------: | ----------: | ----------: | ----------------: |
| Singles |   4,020 |       −186 ± 5 | −0.42 ± 0.01 |                −61 |        −311 |        −436 |     0.557 (0.717) |
| Doubles |   2,118 |      −190 ± 12 | −0.38 ± 0.04 |                −76 |        −304 |        −418 |     0.505 (0.571) |

The gap grows with the level: girls in the lowest junior classes play about level with boys, and the best women play like men rated several hundred points lower. Fitted separately on bands of women's ratings (with the ratings before v1.14.0, shifted to today's scale), the gap followed the line (singles: +18 below 750, −180 at 950–1150, −254 at 1150–1350, −304 at 1350–1550, −472 above 1550), and fitted on settled players only (50+ matches, 2018 on) it was about the same. The fit covers women rated about 540–1650 in singles and 590–1590 in doubles (5th to 95th percentile); beyond that the line is extrapolated.

The head-to-head pages use it "just for fun", where the players or pairs don't meet in a shared discipline: a man and a woman in singles and in doubles (with equally rated partners), and pairs of different kinds (a men's pair against a women's or mixed pair). Everyone is then put on the men's scale: men at their men's singles or doubles rating, women at their mapped women's rating, a pair at the average.

### Search

Every page has a search bar for players (as in the head-to-head search), clubs by short or full name, tournaments with a draw, and Eliteserien's team strengths and each season in review (e.g. "elite 2024"). Every word of the search must match; choosing a result opens its page. The browser searches by itself: `/api/search-index/<language>` (`nb` or `en`, prerendered, refreshed with the data) has every player (`search-index.json`), club, tournament and Eliteserien page, and is loaded once, when a search field is first focused.

## Tournament draws: draw luck and how it turned out

`node upcoming.mjs` (after `rate.mjs`) works out how lucky each player's draw is in tournaments whose draw is out and, once they are played, how the predictions turned out. `/tournaments` lists them with the season's summary, and `/tournaments/<Cup2000 id>` shows each event.

- **Finding tournaments.** From badmintonportalen's season plan: by default the tournaments whose registration closed in the last 45 days and that aren't over yet (and the ones that ended in the last week); `--season 2026` every tournament of 2026/27 whose registration has closed, played ones too (a finished tournament already fetched after it ended isn't fetched again, unless `--refetch`). The tournament info links to its draw on Cup2000; without the link, the Cup2000 tournament (`data/tournaments.json`, from `list-organisers.mjs`) starting the same day with the organising club's name (before the colon in the title) in its name or organiser is used, if there is exactly one (cancelled, "AVLYST", tournaments are left out). Otherwise: `--portalen <id> --cup2000 <id>`. One tournament: `--portalen <id>` or `--cup2000 <id>`. `--offline` recalculates everything from the saved Cup2000 pages and entry lists (`data/upcoming/raw/`), e.g. after the ratings or the parsing change.
- **Players.** Cup2000 has names and clubs only, so players are identified from the tournament's entry list on badmintonportalen (`SearchRegistrationsByClass` with the negated class id lists every class) and, for a played tournament, its results there (`data/portalen`), which have their ids: first the same name in the same class and discipline, then anywhere in the tournament, then a rated player of that name (from that club if there are several). A player whose name in the draw isn't the one on badmintonportalen (a new surname, say) is identified by hand in `pipeline/identities.txt`: a hash of the draw's name (`node cup2000-results.mjs --hash "First Last"`) and the player id, so the repository doesn't name them. It comes before everything else, here and for the matches of tournaments being played.
- **Ratings** are from the end of the week before the tournament (weekly histories), so a played tournament is predicted as it would have been beforehand. Players without a rating in the event's discipline get one as a new player would (doubles from their singles rating, otherwise the class's start rating), marked ≈.
- **Locked at the start.** The draw luck is a prediction, so it stays as it was before the tournament: from the day after it starts (or as soon as its draw has a result), each event keeps the players, their ratings, the seeds, the chances and the draw luck from the last analysis before (`lockedOn` in its data). Later runs only add the results and the luck from withdrawals (below), worked out with those ratings, and check the predictions against what was locked. An event whose entries changed after the start (a late replacement) is analysed again and locked as it is then; a tournament first analysed after it started is locked from then on. `upcoming.mjs --unlock` analyses started tournaments again, e.g. after a fix. When the ratings move to a new scale (`RATING_SCALE` in `rules.mjs`), a locked tournament is analysed again with the ratings of the week before it on the new scale, keeping the day it was locked.
- **Formats.** Each event's draw is read from Cup2000 as it is, not assumed: groups (ranked by wins, ties at random), and knockout stages whose matches take a draw position, "Winner of match N", "Loser of match N" (a play-off for third) or a group place: "Vinner av Pulje 3", "Nr. 2 fra Pulje 1", and "Nr. 2 fra Pulje X", the best runner-up over all groups (by group wins). So it handles pure knockouts, groups with the winners or the top two going through (e.g. Mossetreffen SEN E: the top two to "Sluttspill 1", the third- and fourth-placed to a B play-off, "Sluttspill 2"), the winners plus the best runner-up, and the X classes' placement play-offs. The main knockout is the one the group winners go to; other stages are B play-offs or placement matches. The final is the match the most other matches lead to (the last one listed can be a play-off for third). Who goes through is read from the draw: in Haugerud's A classes only the group winners; the page says which for each event.
- **Cancelled tournaments.** A tournament drawn but not played is listed in `CANCELLED` in `upcoming.mjs` (badmintonportalen id and why), or has "AVLYST" in its name: it is marked "Not played" on the list and its page, with its draw and luck as published. MAHI Sports Open 2026 (#7093) was cancelled at the last minute, in mourning for the King.
- **Played draws.** Once played, Cup2000 lists the players who came through instead of "Vinner av Pulje 3", and draw positions instead of "Winner of match 12" (and each player's final place). The structure is rebuilt from that: a knockout player who played in a group came through as their group place (their actual rank), and a position that played an earlier match in the stage is that match's winner (or loser). The results (each match's winner, each group's final order) are replayed through the same simulation to give each entry's actual rounds, placement and win. An event counts as played once every match has a winner. A tournament whose results were never entered on Cup2000 can use its results on badmintonportalen (`data/portalen`): who beat whom among the entries, by player ids, with groups ranked by wins, then set and point difference; they count only if they decide the event (MAHI Sports Open 2026 was cancelled). Events with a single entry are left out.
- **The result.** A played event's page shows its winner (or winning pair) in a box of its own: the rating each of them gained or lost in the tournament's week (their rating at the end of the week of the last day minus the one before; `winnerRatingChange`), how they won the final (sets and points, or a walkover) and their chance of winning before the tournament. Events with a final (the main knockout's round of one match) and more than two entries also show the final as a scoreboard: the winner and the runner-up with each set's points, or the walkover. The final comes from the Cup2000 draw (`final` in the event's data: the two entries and the score from the winner's side), so events whose results come from badmintonportalen show only the winner. In October 2026, 210 of the 366 played events have a final.
- **Withdrawals.** In a played event, an entry that lost a match by walkover withdrew: from that match on (by match number) it loses every match, earlier matches stand. Two more simulations give the chances with the withdrawals, with the actual draw and with a fair redraw that has the same withdrawals (wherever the withdrawn entry lands). Luck then includes them: the expectation with the actual draw minus the fair one, both with the withdrawals; the page shows the chances once the withdrawn players were out (actual and fair draw) by default, marks luck that withdrawals changed with * (hovering shows the split into draw luck and withdrawals), and compares results with those chances. E.g. Trondheim's SEN X: Kai Roger Stensen withdrew, so William Aaberg Rølvåg, expected 7.6th, was expected 5.7th once he was out (and finished 6th); being in his group was worth +0.6 places of luck. The withdrawn entries are left out of the check of whether luck showed in the results, which uses the draw luck only. A group standings row without a place (a withdrawn player) ranks after the ranked ones, and a group place left empty in the knockout ("Nr. 4 fra Pulje 2" with nobody) is still that place.
- **Simulation.** Each event is played out 20,000 times with each match won by the expected score of the entries' ratings (a pair's rating is the average of its players'), once with the actual draw and once with a fair draw: the same entries drawn again every time by NBF's rules, the seeds placed as the rules say and everyone else at random.
- **Seeding.** The fair draw seeds by the rules, not by our ratings, and whatever the organiser did: a seed placed elsewhere, or a seed left out, counts as luck.
  - **Points.** The seeds are the entries with the most points on the official ranking list valid the Wednesday after the registration deadline (a Tuesday): the first version published from the day after the deadline (`deadline` from the season plan; the lists come out on Wednesdays and Fridays), or, until that's out, the newest. The version is settled the first time the draw is fetched with a draw published, and kept from then on (later lists don't change the seeds; the organiser seeds with the list there is when they make the draw). Draws saved before this (played tournaments) got the version from the deadline alone. Each class uses its age group's lists (SEN, U13–U19, O35–O80); a pair has the sum of its players' points (mixed doubles from the men's and women's mixed lists). Ties go to the higher singles points (a pair's sum), then the higher rating. An entry without points is never seeded, so an event can have fewer seeds than its draw allows, or none.
  - **How many.** 2 below 16 entries, 4 from 16, 8 from 32, 16 from 64, 32 from 128; in group events at most one per group. Group events too are seeded by the number of entries, not one per group: in this season's draws (222 group events) the organisers kept seeds 1 and 2 apart in 203, seeds 3 and 4 in 30 and 29 of the 30 events with 16 entries or more, and seeds 5–8 in all 4 with 32 or more; below 16 entries, seed 3 was apart from seeds 1 and 2 no more often than by chance (35 against 38 of 75).
  - **Where.** Seed 1 at the top of the draw and seed 2 at the bottom; seeds 3 and 4 drawn into the top of the second quarter and the bottom of the third; seeds 5–8 drawn into the eighths without a seed, each at the end away from the seed in the other eighth of its quarter, and 9–16 the same in the sixteenths (in a draw of 32: 1, 32; 9, 24; 8, 16, 17, 25). Byes stay where the actual draw has them, so an entry with a bye fills every part of the draw under it. In group events, the places are the group winners' places in the main knockout: seed 1 goes to the group whose winner starts at its top, and so on (without such a knockout, the groups in order stand for the draw: seed 1 in the first group, seed 2 in the last).
  - **Club separation** is left out: whether it's enforced can't be seen.
  - **Lists.** `node upcoming.mjs` saves the deadline and the list version with the draw (`data/upcoming/raw/<id>.json`, `seeding`) and fetches the lists of the tournament's age groups once per version into `data/ranking/seeding/<version>/<age group>.json` (player id → points per list; `ranking-lists.mjs`). A draw fetched without a deadline (`--cup2000` alone) or a class without a list (U11, "Åpen") is seeded by rating instead, the strongest entries as many as the rules allow; the page says which (`seededBy`).
- **Rounds and luck.** An entry's rounds are how far it is expected to get in the main knockout: one for getting out of the group, one for every knockout round after that (a bye counts), and one for winning. Luck is its rounds with the actual draw minus with a fair draw; luck sums to about zero over an event. Match wins aren't used, since players in bigger groups play more matches. The most rounds possible (`maxRounds`, the winner's) is the same for everyone in an event, and the event page names its rounds (e.g. out of 6: out of the group, the last 16, quarter-finals, semi-finals, final, winning). The page also shows each entry's chances of getting out of the group (reaching the main knockout, not necessarily winning the group) and of winning the event, actual and fair.
- **Single groups and two entries.** In an event that is one group, everyone plays everyone, and with two entries there is one match, so there is no draw luck (`noLuck`): the page shows only each player's chance of winning and their expected match wins.
- **X classes: placement.** An X class is always 8 players or pairs in two groups of four. The top two play cross-over semi-finals (group 1's winner against group 2's runner-up and the other way round) and the final; the third-placed play for 5th and the fourth-placed for 7th. On Cup2000 these are stages titled "1-4 plassen", "5-6 plassen" and "7-8 plassen" (or "Sluttspill 5.plass", a match for 5th), read as the places they decide; when the titles don't say ("Semi-/Finale", "Sluttspill 1, 2, 3"), an X class's main knockout decides 1–4 and its further stages the next two places each. A withdrawn player (an empty side) shares the places left over. Places are given as: the winner gets the first, the final's loser the next, and losers one level earlier share the next two (the losing semi-finalists 3.5 each, as no match for third is played; a "Loser of match" play-off for third would decide them). When every entry ends in such a stage, its luck is measured in places: the expected placement with a fair draw minus with the actual draw (above zero, the draw helps).
- **How it turned out.** For played events: how many favourites (the best chance of winning with the actual draw) won, against the number expected (the sum of their chances), the winners' average predicted chance, and the most surprising winners. Whether luck showed in the results: each entry's result minus its fair-draw expectation, regressed (through zero) on its luck; a slope of 1 means a draw rated a round luckier gave a round more on average. The event table shows each entry's result against its expectation with the actual draw.
- **2026/27 so far** (15 played tournaments, 306 events): the favourite won 166 events, against 177 expected, and the winners had a 42% chance on average beforehand. The draw luck showed in the results with a slope of 0.87 over 1,617 entries (correlation 0.25: luck is real but small next to how the matches go). Foreign players without a rating are given the class's start rating there, so they are underrated, and they win more than predicted (in the ratings themselves they [start higher](#start-rating)).
- **Links from matches.** The match lists and highlights on player pages (and head to head) link a match's tournament to its page when it has one (matched by the badmintonportalen tournament id in the match key), opening the event of that class and discipline (`/tournaments/<id>/sen-x/men`).
- **Pages.** A tournament page has two views: the events (the default: buttons per class and the event's table) and a summary (`/tournaments/<id>/summary`): how the predictions turned out, one box with tabs for the most surprising winners and the luckiest and unluckiest draws, and how it works, explaining only what the tournament's events need (rounds, X-class places, single groups).
- **Event order.** The event page lists the events by class, seniors first and juniors from the oldest, levels in the order X (grand prix: the 6 highest ranked on badmintonportalen plus 2 wildcards, seniors and juniors alike), E (elite), A, B, C, D, each in the order men's singles, women's singles, men's, women's and mixed doubles.
- **Event table order.** A single group, or an event with just two entries (one match), has no luck and one order: the most likely winner first before it is played (the same as by rating), the final standings after. Otherwise luckiest first, or by group: each group, in number order, under a header with its average rating and its players by rating (players who start in the knockout last; in a played event the places going through are marked: the group winner, the runner-up when the top two go through, and in the X classes all four places); events without groups can be ordered by rating instead; played events also by final standings: the winner first, then by place (X classes) or by how far they got and their group place, ties by rating, numbered with shared places (1, 2, 3, 3, 5, 5, 5, 5, 9, ...: the same round, or the same group place for those out in the groups) (`?order=group`, `?order=rating`, `?order=standings`).

## Eliteserien

The Eliteserien page (`/eliteserien`) estimates how strong the eight teams in the top league are. `node eliteserien.mjs`, run after `rate.mjs`, writes `data/eliteserien.json`.

**Teams.** The players on each team are in `pipeline/eliteserien-2026-27.txt`, from Norges Badmintonforbund's list (<https://www.badminton.no/siteassets/spillere-i-eliteserien-2026-27.pdf>), one per line with their player id: `M|K <id> <name> [| loan <home club>]`. Players on loan from another club play for the team and count for it; they are marked on the page. The ids were matched by name (the list often shortens names: "Amund Huus" is Amund Rikheim Huus) and checked by hand; players without rated matches have `-`. Edit the file when the list changes and run the script again.

**A tie** is 8 matches: 2 men's singles, 2 women's singles, 1 men's doubles, 1 women's doubles and 2 mixed doubles. A player plays at most 2 matches, and at most one in each discipline. The first singles player must have more official ranking points than the second, and the first mixed pair more combined mixed doubles points than the second; on equal points either order is allowed. The points are the current senior ranking lists on badmintonportalen, fetched with `node fetch-ranking.mjs 2002026` into `data/ranking/2002026.json` (players not on a list have 0 points).

**Ratings.** Each player's current singles, doubles and mixed doubles ratings. A missing doubles or mixed rating is estimated from the singles rating, as for a [new doubles player](#start-rating-from-singles); anything else missing counts at the lowest rating among ranked players.

**Lineup.** Each team is assumed to field the lineup with the most expected match wins against an average Eliteserien opponent in each match: the average of the best players over all eight teams (for the two singles, the 8 best and the next 8; doubles and mixed as pair averages). All lineups allowed by the rules are tried, including who plays mixed with whom and, on equal ranking points, the order.

**Strength.** Teams are compared lineup against lineup, match by match (first men's singles against first men's singles, and so on), with the expected score of the ratings ($E_A$, pair averages in doubles). The matches are taken as independent, which gives the chance of winning a tie (5 or more matches), drawing (4-4) or losing it. A team's strength is its expected number of matches won per tie, averaged over ties against the other seven teams.

**Table points.** The league table counts points per tie: 4-0 for winning 6-2 or better, 3-1 for 5-3 and 2-2 for 4-4 (this reproduces the official 2025/2026 table exactly). The match win chances give the chance of every result from 8-0 to 0-8, and so each team's expected table points per tie. The predicted table ranks teams by their expected table points from the regular season, one tie against each other team (28 at most).

Real lineups vary (injuries, tactics, players' availability), so the chances are for each team at full strength.

### What if a tie were 10 matches

`/eliteserien/ten-matches` runs the same model on this season's teams with a tie of 10 matches: a 3rd men's singles and a 2nd men's doubles. `node eliteserien-ten-matches.mjs` (after `rate.mjs`, in every nightly full rebuild) writes `data/eliteserien-ten-matches.json`, with both formats side by side.

- **Rules.** As today: a player plays at most 2 matches and at most one in each discipline; the three singles players play in order of singles ranking points, the first men's doubles pair has more combined men's doubles ranking points than the second, and the first mixed pair more combined mixed doubles points (either order on equal points).
- **Average opponent.** As for 8 matches, with the 3rd men's singles at the average of the 17th to 24th best men's singles ratings and the 2nd men's doubles at the average of the 17th to 32nd best men's doubles ratings.
- **Table points** by the same margins as today: 4-0 for 7-3 or better, 3-1 for 6-4, 2-2 for 5-5. A tie is won with 6 matches.
- **Teams.** 9 men's places need at least 5 men. Haugerud's list has 4, so Advait Mital (Kristiansand) is added to Haugerud for the test (`ADDED` in the script), and the page says so. Both formats use the same players, so the differences are the format's; Advait Mital doesn't make Haugerud's 8-match lineup, so the 8-match numbers equal `/eliteserien`'s.

### Earlier seasons in review

`/eliteserien/<season>` (2021-22 to 2025-26) runs the same model on an earlier season and compares it with what happened. `node eliteserien-review.mjs [season]` (after `rate.mjs`; all seasons without an argument, as in every nightly full rebuild) writes `data/eliteserien-<season>.json`, from the teams in `pipeline/eliteserien-<season>.txt`, the season's ties in the league data and the ranking versions from the day before each round (`node fetch-ranking.mjs 2002025 --before <round's first day>`). Each season's rounds, list and official standings are set in the script's `SEASONS`.

- **Teams.** The lists were not kept up to date during the season: players who played for a team without being on its list are added from their first match, and players listed for one team but playing for another are counted for the team they played for (2025/26: Mathias Ji Hong, Mina Korssund). For 2024/25 the list's registered changes before the first round are applied (Hege Leirud and Johannes Olafsson added); 5 players played without being on it.
- **Lists.** The 2021/22 and 2022/23 lists are as of 28 January 2022 and 29 November 2022 (after the first round); everyone on them counts from the start of the season. Names on the lists were matched to player ids by hand where they differ from badmintonportalen (e.g. Hege Rikheim = Hege Leirud, Natalie Syvertsen = Natalie Kristensen, Mette Skævesland = Mette Skjævesland Pedersen).
- **Ranking before 2025/26.** badmintonportalen keeps only each season's final ranking before 2025/26, not the versions from during the season. The ranking covers the 12 months before its date, so the order rules use the closest season-end list instead: the previous season's (to July) for Lillerunden, the season's own for Storrunden and the play-offs. It only affects which player may play 1st singles or 1st mixed.
- **Groups.** The regular season is the group that isn't a play-off (named "Grunnspill" or "Pulje 1"); the qualification groups against 1. divisjon teams are left out. Table points (6-2 or more 4-0, 5-3 3-1, 4-4 2-2) reproduce the official regular-season tables of all five seasons.
- **Ratings at the time.** Before each round (Lillerunden, Storrunden, play-offs), players' ratings are their rating at the end of the week before, from the weekly histories, and the lineup rules use the ranking published the day before.
- **Potential** is each tie's expected result with both teams' best lineups at the time. It is compared with the expected result with the lineups actually played (each match's win chance right before it, from the match logs) and with the actual result. Walkovers and matches not played are left out (12 of 288 in 2025/26).
- **Table points.** The predicted regular-season table before the season (expected table points from one tie against each team, with the ratings before the first round) is compared with the actual table, and each team's regular-season points with the points expected from the potential of each tie it played.
- **Ties.** Each tie shows its expected score and the home team's chance of winning twice: with both teams' best lineups (potential) and with the lineups actually played. For the lineups played, walkovers count as won by the side given them, as in the result, and matches not played count for neither side. An upset is a tie won by a team with less than a 30% chance with the lineups played: judged on the potential, ties where the favourite simply fielded a weaker team would count as upsets too (2025/26: 4 ties against 2).
- **Play-offs.** In the play-offs (Sluttspill) a tie ends as soon as a team has won 5 matches, and a tie at 4-4 is decided by a golden set: the teams take turns striking out one of the five disciplines (MS, WS, MD, WD, XD), and one set is played in the last one left. In the model the golden set is played in the discipline where the teams' top players or pairs (1st singles, the doubles, 1st mixed) are closest in rating, with that match's win chance, so a play-off tie has no draw: the home team wins with P(5+ of 8) + P(4-4) × P(golden set). Stopping at 5 wins doesn't change who wins, so the odds are still over all 8 matches; with the lineups played, the matches left unplayed count with their listed players' chances from the ratings before the round. The golden set is stored with the tie (`goldenSet` in data/league, from the tie page's "Golden Set" row) but is not rated, being a single set; it decides the tie's winner (2025/26: Haugerud–Moss 4-4, Aleksander Jakovlevs beat Shubham 23-21 in MS, so Haugerud took 3rd; 2024/25: the final Bergen–Kristiansand 4-4, Vilde Espeseth beat Katja Botcharova Ellingsen 21-10 in WS, so Kristiansand won). In 2021/22 there was no golden set yet: the final (Kristiansand–Frogner) and the match for 5th (Sandefjord–Moss) ended 4-4 and were left drawn, so that season's play-off odds keep the draw (`goldenSet: false`).
- **Won − potential** splits into **lineups** (expected with the lineups played, minus the potential: players missing or rested, and opponents not at full strength either) and **performance** (matches won minus the expected with the lineups played).

Before the 2025/26 season the model had Kristiansand first and Bergen second, which is how the play-offs ended; Bergen won the regular season by winning 5.5 matches more than its lineups were expected to. Frogner was predicted third and finished sixth, mostly because it seldom fielded its best lineup.

## How the rules were tested

Changes are judged by log loss (lower is better) on matches the settings weren't tuned on. The current rules were chosen with `benchmark.mjs`, on the 2025/26 and 2026/27 matches with 2023–25 as a holdout, and checked on every season since 2017/18: see [BENCHMARK.md](BENCHMARK.md). Earlier tuning used the matches before 2023 and tested on 2023 onwards, with the parameters and scale of the time.

### Earlier tuning

**Doubles side rating.** Counting only games where all four players have 10+ matches in the discipline (2023 onwards). On the half-size doubles scale of the time, the sum of the partners' ratings is today's average:

| Side rating (half-size scale)                                                            | 2023 onwards |
| ---------------------------------------------------------------------------------------- | -----------: |
| Sum of the partners' ratings, $\kappa = 54$ (used: today's average on the doubles scale) |       0.4519 |
| Average of the partners' ratings, best $\kappa$ (120)                                    |       0.4560 |
| Average of the partners' ratings, $\kappa = 54$                                          |       0.4723 |

Averaging ratings on the singles-sized scale made every doubles match look closer than it was, and a larger K-factor only partly made up for it (also with stricter thresholds of 30 or 60 matches). With the sum, the best $\kappa$ was the same as in singles. Sharing the change equally instead of by uncertainty predicted the pre-2023 matches equally well, and later matches slightly worse.

**Start rating from singles and junior weight.** Both were inspired by table tennis rating systems (such as Germany's TTR) and added together. All doubles games, including those with newcomers, where the start rating matters most (2023 onwards):

| 2023 onwards, doubles               | Before | With both | Change |
| ----------------------------------- | -----: | --------: | -----: |
| All doubles games                   | 0.5304 |    0.5066 |  −4.5% |
| Games with a newcomer (<10 matches) | 0.6302 |    0.5877 |  −6.7% |
| Games between settled players       | 0.4515 |    0.4425 |  −2.0% |
| Favourite wins                      |  73.0% |     74.7% |        |

The pre-2023 matches improved as much. Seeding from singles is most of the gain: just compressing the class start ratings towards the top level start helped far less. Factors from 0.55 to 0.65 did about equally well.

The junior weight, all games counted (change in thousandths of log loss):

| Junior weight | Singles before 2023 | Singles 2023 onwards | Doubles before 2023 | Doubles 2023 onwards |
| ------------- | ------------------: | -------------------: | ------------------: | -------------------: |
| ×1 (none)     |              0.5129 |               0.5153 |              0.5208 |               0.5304 |
| ×1.25         |                −2.9 |                 −3.1 |                −3.5 |                 −3.2 |
| **×1.5**      |            **−3.9** |             **−4.5** |            **−5.0** |             **−4.7** |
| ×1.75         |                −3.6 |                 −4.4 |                −5.0 |                 −4.8 |
| ×2            |                −2.2 |                 −3.2 |                −3.7 |                 −3.8 |
| ×2.5          |                     |                      |                +2.0 |                 +0.8 |

×1.5 was best with the class weights of the time, for newcomers and settled players alike, and ratings did not drift (the doubles figures are without the start rating from singles). With the class weights of v1.14.0, ×1.5 is best again, capped at U19A's weight.

### Tested and not used

**Repeated opponents.** Making repeated matches against the same opponent count less (to reward playing a wider range of opponents) was tested with several weights: $a^n$ for $n$ earlier meetings in the last one or two years ($a$ from 0.6 to 0.9), $1/\sqrt{1+n}$ and $1/(1+n)$. Every variant predicted results worse, both on the tuning seasons and the held-out seasons, and the stronger the reduction the worse. Counting repeated matches more did not help either. Repeated matches carry as much information about the players as any other match, so all matches count the same.

**Higher K-factor for newcomers.** Table tennis systems such as TTR raise the K-factor for a player's first matches. A higher K-factor for a player's first 10, 20 or 30 doubles matches (×1.5 or ×2) predicted results worse on both the tuning and the held-out seasons, and made ratings drift down, since newcomers then lose more points than their opponents win. The same held for singles. Doubles newcomers already move fast, since they take most of their side's rating change (see [doubles](#doubles)).

**Matches against unsettled players counting less.** A result against a player whose rating is still uncertain says less, so it could move ratings less, as in the Glicko system. In thousandths of log loss compared with the rules of the time (positive = worse):

| Variant                                                             | Singles before 2023 | Singles 2023 onwards | Doubles before 2023 | Doubles 2023 onwards | Average rating drift |
| ------------------------------------------------------------------- | ------------------: | -------------------: | ------------------: | -------------------: | -------------------: |
| Change × $g(RD)$ of the opponents (Glicko)                          |                +5.5 |                 +6.5 |                +2.3 |                 +3.9 |                  −15 |
| Change × $g(RD)^3$                                                  |               +19.6 |                +23.3 |                +8.6 |                +13.0 |                  −22 |
| Opponents with fewer than 10 matches count ×0.5                     |               +24.9 |                +30.3 |               +21.9 |                +32.1 |                  −30 |
| Change × $g(RD)$, $\kappa$ ×1.25 to make up for the smaller changes |                +6.0 |                 +6.7 |                +2.7 |                 +3.1 |                  −17 |

Every variant predicted worse, and the stronger the discount the worse; a higher K-factor did not make up for it. Newcomers here are not unknowns: their start rating comes from the class they enter (and from their singles rating in doubles), so a result against them still says a lot about the established player. Discounting only the established player's change also lets rating points leak out, so ratings drifted down over the years. Where uncertainty does matter, in doubles, the side's rating change is already shared by the partners' uncertainty.

**No levels, chess-style K and Glicko's K.** Flat start ratings without class levels, a fixed chess.com-style K, and Glicko's K (alone or after a player's first matches) were tested in 2026 and are in [BENCHMARK.md](BENCHMARK.md): none beat the class levels.

**Also tested in 2026 without a gain** ([BENCHMARK.md](BENCHMARK.md#rounds-48-the-tuned-rules)): a home advantage in league ties (side 1 is the home team in every tie, but many ties are played at shared venues), rating a whole tournament or tie at once from the ratings before it (much worse: ratings need to follow results within a tournament), another expected score scale, a wider or narrower $m(r)$, sharing a doubles side's change equally, and a separate typical margin for sets to 15.

### Comparison with the official ranking

The official NBF ranking lists (badmintonportalen.no/NBF/Ranglister/) rank seniors by points collected in tournaments over the last 12 months. For each season from 2014/2015, the season's final official list and these ratings on the same date were both used to pick the favourite in every game played in the following 12 months between two players on the list (`fetch-ranking.mjs`, `compare-ranking.mjs`):

|                                |  Games | Favourite won |
| ------------------------------ | -----: | ------------: |
| Official ranking (more points) | 41,285 |         64.3% |
| Elo (higher rating)            | 41,285 |         76.7% |

Elo predicted better in every season and both pools, best on the 2021/2022 list (79.7% against 64.3%; only the 486 games after the 2019/2020 list, when Covid stopped most play, did better). When the two disagreed on the favourite (14,412 games), the Elo favourite won 67.8% of the time. In the 28,648 games between established players, with at least 20 rated games each before the list date, the Elo favourite won 78.5% and the official favourite 65.5%: a settled rating predicts a little better, and the testing starts after the warm-up, so new players are the only ones still settling. The rank correlation between official points and Elo is only about 0.4–0.6: official points reward playing many tournaments, Elo only rewards results.
