# Elo settings benchmark

Alternative rating settings tested against the rules of the time ([README.md](README.md)), using the matches played in **2025/26** and **2026/27** as the benchmark. Run with `node benchmark.mjs` (about 3 seconds per config; `node benchmark.mjs <text>` runs only the configs whose name contains it, plus the current rules).

Results from the data as of 2026-10-26.

## Adopted in v1.14.0

The [method to adopt](#the-method-to-adopt) and the [rating floor](#rating-floor) are the rules since v1.14.0, on the [shifted scale](README.md#rating-scale): a top level start of 800 in singles and 400 per doubles player, with no rating below 0. In everything below, **"current" means the rules before v1.14.0**. The configs of rounds 1–3 and the floor are in commit `f68b101`. `benchmark.mjs` now compares the current rules with the previous ones, rebuilt through the experiment hooks. With the defaults on the 1500 scale they reproduce the earlier calibration exactly, and the current rules give exactly the "floor 0" results (log loss, current rules in full; the previous rules as the change in thousandths):

| Config | All 25/26 S | All 25/26 D | All 26/27 S | All 26/27 D | Settled 25/26 S | Settled 25/26 D | Settled 26/27 S | Settled 26/27 D | Top 25/26 S | Top 25/26 D | Top 26/27 S | Top 26/27 D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| current rules (v1.14.0) | 0.5010 | 0.4893 | 0.5460 | 0.5076 | 0.4387 | 0.4354 | 0.4752 | 0.4673 | 0.4434 | 0.4432 | 0.4694 | 0.4441 |
| previous rules | +11.0 | +14.7 | +7.7 | +16.9 | +6.7 | +1.3 | +2.1 | +4.1 | +5.1 | +0.6 | −0.3 | +1.3 |

The previous rules are 0.3 better in only one cell, top-level singles in 2026/27. In the 2023–25 holdout they are +11.0 and +15.4 on all games, +6.3 and +8.2 settled, and +3.6 and +3.9 at the top level (singles and doubles).

## Method

- Each config rates the **full match history** from 2013, so its ratings have the same years to settle as the real ones. Only the games in the benchmark windows are scored, using the ratings just before each game.
- **Windows:**
  - **2025/26:** 2025-07-01 to 2026-06-30.
  - **2026/27:** from 2026-07-01, the season so far, with sets to 15.
  - **2023/24 to 2024/25:** a holdout, to see whether a setting only fits the benchmark seasons.
- **Games:** decisive games only, since draws are left out. The subsets are:
  - **all:** every game, newcomers included. This is where start ratings matter.
  - **settled:** every player has 10 or more matches in the discipline, as in `rate.mjs`'s calibration.
  - **top level:** SEN X/E/A, Eliteserien, 1st div, U19A, SEN B and O35–O45 (class tiers 0–1). These are the games that decide the top of the rankings.
  - **cross-region:** the two sides come from different regions.
- **Metric:** log loss, which is lower for better predictions. The tables show the current rules in full and every other config as the change in thousandths: −10 is 0.010 lower (better), and +10 is worse. For scale, the margin-of-victory weight, the biggest single improvement in the README, was worth about 25 thousandths. Brier score and favourite-won % are in the full results and agree.

## Configs

| Name | Settings |
| --- | --- |
| **current** | The rules in README.md. |
| **new** (the proposal) | Everyone starts at **800** in singles and **400** per player in doubles, so a new pair starts at 800. **No levels:** no class weights and no class-based start ratings. Cross-region ×2, junior ×1.5. **Softer margin weight** $\min(3, \sqrt{\max(d, 0.02)/0.2})$. m(r) and the not-playing penalty floor are anchored at the start rating instead of 1500, and κ = 54. A doubles newcomer who has played singles starts at $400 + 0.6 \cdot (R_{\text{singles}} - 800)$. |
| **best** | new, with junior ×1 and cross-region ×1, which were better in this setting (see below). |
| **chess K** | new, with chess.com-style Elo: the standard 400 scale, a fixed K and no m(r). |
| **glicko K** | new, with chess.com's actual method: a Glicko-1 K per player from their own rating deviation, large for newcomers and about 10–20 when settled. |
| **hybrid glicko** | Round 2. Today's K for a player's first 10 (or 30) singles matches, then Glicko's K × 1, 1.5 or 2. Doubles keep today's K. Run on the current rules, and on "best". |
| **classes** | Round 3, on the better method from round 2: the class weight with the junior weight built in, set per junior class, e.g. U19A at 100% or at SEN B's 89%. Two variants on today's weights. |
| **milder levels** | Round 2, on the current rules. The class start ratings stay, and the class K weights are raised to a power: √ turns 5% into 22% and 40% into 63%; ^0.75 turns 5% into 11% and 40% into 50%. One variant also gives juniors full weight. Combined with junior ×1, ×1.25 or ×1.5 and margin pow 0.75. |

### Margin weight variants

$x = \max(d, 0.02)/0.2$, where $d$ is the point difference divided by the total points, so a typical match is $x = 1$.

| Name | $w_m$ | 22-20 21-19 | 21-15 21-13 | 21-5 21-3 |
| --- | --- | ---: | ---: | ---: |
| current | $\min(3, x)$ | 0.24 | 1 | 3 |
| pow 0.75 | $\min(3, x^{0.75})$ | 0.35 | 1 | 2.5 |
| pow 0.5 | $\min(3, \sqrt{x})$ | 0.49 | 1 | 1.8 |
| pow 0.33 | $\min(3, x^{1/3})$ | 0.63 | 1 | 1.5 |
| damped 0.5 | $\min(1.5, \max(0.5, 1 + 0.5(x - 1)))$ | 0.62 | 1 | 1.5 |
| none | 1 | 1 | 1 | 1 |

## Results

### The proposal and the best variants

The log loss for **all** games:

| Config | 25/26 singles | 25/26 doubles | 26/27 singles | 26/27 doubles | Holdout singles | Holdout doubles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 0.5120 | 0.5039 | 0.5536 | 0.5244 | 0.5099 | 0.5080 |
| new (as proposed) | −4.6 | −0.7 | +27.5 | +4.3 | −4.2 | +8.0 |
| best (junior ×1, cross-region ×1) | −17.2 | −8.8 | −9.3 | −10.7 | −21.1 | −6.1 |
| best, κ 64 | −18.9 | −10.9 | −9.5 | −11.9 | −23.0 | −8.0 |
| best, no m(r), κ 108 | −18.4 | −10.1 | −6.9 | −13.1 | −21.9 | −7.2 |
| chess K 32 | +8.2 | +28.3 | +15.6 | +23.7 | +7.5 | +31.3 |
| chess K 64 (best chess K) | −7.9 | +4.1 | +9.9 | +3.5 | −8.7 | +9.1 |
| glicko K | +47.1 | +54.2 | +66.4 | +61.3 | +57.4 | +62.8 |

The same configs on **settled** and **top-level** games:

| Config | Settled 25/26 S | Settled 25/26 D | Settled 26/27 S | Settled 26/27 D | Top 25/26 S | Top 25/26 D | Top 26/27 S | Top 26/27 D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 0.4453 | 0.4367 | 0.4773 | 0.4713 | 0.4485 | 0.4439 | 0.4691 | 0.4454 |
| new (as proposed) | +18.5 | +21.0 | +42.7 | +22.5 | +54.6 | +23.5 | +95.6 | +20.2 |
| best | +9.9 | +19.7 | +17.6 | +8.8 | +28.2 | +20.0 | +53.7 | +8.4 |
| best, κ 64 | +8.4 | +17.6 | +16.7 | +7.5 | +28.0 | +17.1 | +54.9 | +5.4 |
| best, no m(r), κ 108 | +4.5 | +14.8 | +11.3 | +4.2 | +24.0 | +13.3 | +53.7 | −0.4 |
| chess K 64 | +10.6 | +23.7 | +26.2 | +17.5 | +38.8 | +27.6 | +72.1 | +23.8 |
| glicko K | +4.1 | +15.2 | +11.0 | +16.6 | −23.6 | +9.9 | −19.7 | +12.9 |

(Full tables, Brier score, favourite-won %, per pool and average ratings: see [Full results](#full-results).)

## Findings

1. **No levels with a flat start predicts the bulk of games better, but the top level worse.**
   - **Better:** with the junior and cross-region weights removed ("best"), all-games log loss drops by 6–23 thousandths in every window, the holdout included. The gain comes from juniors, lower classes and newcomers. A flat start and full K for every match let their ratings catch up faster than the class start ratings and the 5–40% class weights did.
   - **Worse:** settled players get worse by 4–20 thousandths and top-level games by 13–55. In top-level singles 2026/27 it is +54, about twice the whole gain the margin weight once gave.
   - **Why:** the class weights shield the top players' ratings from noisy low-level matches (a strong senior in a 4th div league or a club series now gains and loses the full K there). Putting the class weights back for K only, with the flat start kept ("new, class weights back"), brings the top-level loss down to +8 to +26, but then all games get worse (+2 to +16). So the levels do two jobs, start ratings and shielding, and the flat start alone doesn't replace either.
   - **What it means for the site:** the rankings are mostly about the top of each list, where this setup predicts worse.
2. **Cross-region ×2 and junior ×1.5 no longer help without levels.** Both raised K in specific games to make up for the low class weights. With every match at full K they over-correct: cross-region ×1 is 4–20 thousandths better than ×2, and ×1.5 is about as good as ×1. Junior ×1 is 3–14 better than ×1.5. In the current rules they stay as tuned.
3. **The softer margin weight:**
   - In the new setup, `pow 0.5` and `pow 0.75` are the best, and both are clearly better than today's linear weight. With full K for every match, the current cap of 3 on blowouts is too much (+13 to +59).
   - In the current rules, `pow 0.75` is slightly better than today's weight in nearly every window and subset: −0.1 to −3.9 settled, and −2.8 and −3.1 in 2026/27. It is the one change here that could be adopted on its own. `pow 0.5` is mixed: it is better in 2026/27 and worse in 2025/26.
   - With no margin weight at all, every config is 8–34 worse, so the margin itself stays.
4. **chess.com-style K does worse than our K.** A fixed K of 32 on the standard 400 scale is 8–31 thousandths worse on all games. Raising K to 64 brings singles close to "new" but stays worse in doubles. Our K with m(r) or a tuned κ is better. Real Glicko (chess.com's method) is the worst on all games (+47 to +66). Newcomers start at RD 260 and swing by hundreds of points, and with a flat start of 800 the leaking points let average ratings sink (men's average 601 against a start of 800). It does have one striking result: on **top-level singles it is the best config of all** (−24 in 2025/26, −20 in 2026/27, −9 in the holdout). Settled top players have a small RD and so a small, steady K, while players still finding their level move fast. Its all-games score is ruined by the newcomers' swings, not by the top.
5. **Anchoring m(r) at the start rather than dropping it** does about the same: "best, κ 64" against "best, no m(r), κ 108". Without m(r) the settled and top-level numbers are slightly better, so in this setup a single K for everyone is as good.
6. **Doubles seed from singles:** keeping it matters. A flat 400 is 14–19 thousandths worse in doubles.
7. **κ:**
   - Without the class weights, the average K is much higher, so the proposal's κ = 54 with junior ×1.5 and cross-region ×2 overshoots (+28 in 2026/27 singles). κ = 32–40 fixes that for "new".
   - Once the junior and cross-region weights are gone, κ 54–80 is best.
8. **No drift:** the average ratings at the end are 765–790 in singles and 362–392 per player in doubles, a little below the start, as the not-playing penalty takes points above the floor. Glicko is the exception, as noted above.

## Round 2: Glicko for established players, milder class weights

Both leads from the first round, run against the current rules:

| Config | All 25/26 S | All 25/26 D | All 26/27 S | All 26/27 D | Settled 25/26 S | Settled 25/26 D | Settled 26/27 S | Settled 26/27 D | Top 25/26 S | Top 25/26 D | Top 26/27 S | Top 26/27 D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 0.5120 | 0.5039 | 0.5536 | 0.5244 | 0.4453 | 0.4367 | 0.4773 | 0.4713 | 0.4485 | 0.4439 | 0.4691 | 0.4454 |
| current, margin pow 0.75 | −0.8 | +0.5 | −2.8 | −3.1 | −2.4 | −0.1 | −2.5 | −3.9 | −5.0 | −0.7 | −2.1 | +0.1 |
| hybrid glicko after 10, ×1.5 | +26.4 | +3.8 | +21.4 | +2.4 | +14.3 | +1.4 | +13.0 | +1.2 | −5.3 | +1.4 | +5.4 | +1.0 |
| hybrid glicko on best, after 10, ×1.5 | −16.4 | −8.2 | −16.6 | −9.5 | +2.5 | +19.2 | +0.3 | +8.3 | +5.8 | +19.2 | +23.9 | +7.7 |
| milder levels √, junior ×1 | −13.7 | −11.6 | −6.2 | −4.5 | −3.0 | −1.6 | +4.9 | +4.9 | +2.7 | +2.4 | +4.1 | +1.4 |
| milder levels √, junior ×1.25, margin pow 0.75 | −18.1 | −14.7 | −9.8 | −10.3 | −8.2 | −4.4 | +1.7 | −0.7 | −1.6 | −1.2 | +3.7 | −2.1 |
| milder levels ^0.75, margin pow 0.75 | −11.1 | −8.5 | −6.6 | −7.4 | −7.1 | −3.5 | −1.4 | −3.0 | −3.3 | −1.9 | +1.0 | −2.3 |
| **milder levels ^0.75, junior ×1.25, margin pow 0.75** | **−9.8** | **−7.2** | **−7.5** | **−7.5** | **−6.2** | **−2.2** | **−2.3** | **−3.1** | **−4.4** | **−0.4** | **−0.1** | **−0.1** |
| milder levels: juniors full weight, junior ×1 | −2.3 | −5.9 | +19.4 | +4.2 | +13.3 | +1.0 | +38.7 | +13.4 | +7.9 | −1.9 | +18.0 | −6.5 |

In the 2023–25 holdout, the bold config scores −10.2 and −8.4 on all games, −5.7 and −5.2 settled, and −2.7 and −2.6 at the top level (singles and doubles).

- **Glicko for established players doesn't work.**
  - On the current rules, the hybrid is 2–43 thousandths worse on all games and settled singles at every scale and switch-over point tried.
  - On "best" it gains on all games, but loses on settled doubles and at the top level.
  - Glicko's K isn't zero-sum, so singles ratings sink (men's average 1163 to 1182 against 1198).
  - First-round Glicko's top-level singles gain was relative to a setup without class weights and didn't hold up as a K rule of its own.
- **Milder class weights work.**
  - The class start ratings stay, and lower classes count somewhat more than today.
  - Juniors and lower classes then catch up faster, without opening the top players' ratings to low-level noise as removing the weights did.
  - The square root gains the most on all games, but costs a little on settled and top-level singles in 2026/27 (+2 to +4).
  - With ^0.75 the gain is smaller, but it holds everywhere.
- **Juniors at full weight is too much.** Settled games get worse (+13 and +39 in singles), confirming the first round: the weights on junior classes do real work.
- **Margin pow 0.75 adds to the milder weights.** Most of the settled and top-level gains in the combined configs come from it.

### The better method

Class weights raised to **^0.75**, junior weight **×1.25** and margin weight **pow 0.75**. Everything else stays as it is today: the class start ratings, cross-region ×2, κ = 54, m(r) and the doubles seed.

The weight each class actually gets is the class weight times the junior weight: $w_c \cdot w_j$, with $w_j$ = ×1.5 today and ×1.25 in the new method for junior classes and leagues (U9–U19), and 1 for everyone else. Juniors and seniors on the same tier are therefore listed separately:

| Classes and leagues | Today: $w_c$ | Today: $w_c \cdot w_j$ | New: $w_c$ | New: $w_c \cdot w_j$ |
| --- | ---: | ---: | ---: | ---: |
| SEN X/E/A, Eliteserien, 1. HS and 1. DS in 1st div | 100% | **100%** | 100% | **100%** |
| U19A/X, Junior NM for lag (U19) | 85% | **128%** | 89% | **111%** |
| SEN B, O35–O45, other 1st div games | 85% | **85%** | 89% | **89%** |
| U17A/X, U17 leagues, Landsfinale U17, U17/U19 singles series | 60% | **90%** | 68% | **85%** |
| SEN C, O50–O55, 2nd div, 1st div qualification | 60% | **60%** | 68% | **68%** |
| U15A/X, U15 leagues, Landsfinalen U15 | 40% | **60%** | 50% | **63%** |
| SEN D, O60+, 3rd div | 40% | **40%** | 50% | **50%** |
| U13A/X, U19B, U17B, U13 leagues, U13/U15 singles series | 25% | **38%** | 35% | **44%** |
| U11A, U15B, U13B | 10% | **15%** | 18% | **22%** |
| 4th div, other senior series | 10% | **10%** | 18% | **18%** |
| Other junior classes (U11B, U9, …), Nybegynnerserie | 5% | **8%** | 11% | **13%** |
| Other senior (Åpen HC, internal club events) | 5% | **5%** | 11% | **11%** |

The new method moves the junior and senior weights in opposite directions at the top of the junior classes, and in the same direction below:
- **Top junior classes go down.** U19A counts 128% today, more than SEN A. With the new method it counts 111%, and U17A 85% instead of 90%.
- **Lower classes go up, junior and senior alike.** From U15A and SEN D down, everything counts more than today.

The tiers stay the same; only the weights change.

- **Better everywhere:** it scores better than today in every window (both benchmark seasons and the 2023–25 holdout) and every subset (all games, settled, top level and cross-region), in both singles and doubles. It is also better in every one of the five pools (2025/26 and 2026/27 together, all games):

  | Pool | Current | New |
  | --- | ---: | ---: |
  | Men's singles | 0.5225 | 0.5133 |
  | Women's singles | 0.5064 | 0.4963 |
  | Men's doubles | 0.5030 | 0.4961 |
  | Women's doubles | 0.4945 | 0.4877 |
  | Mixed doubles | 0.5170 | 0.5090 |

- **Size of the gain:** about 7–10 thousandths on all games and 2–6 on settled games, about a third of what the margin-of-victory weight once gave.
- **Brier score:** better in all four columns.
- **Favourite won:** up in 2025/26 (74.6% against 73.9% in singles, 75.4% against 75.0% in doubles), slightly down in 2026/27 (71.6% against 71.7%, 74.2% against 74.6%). Log loss and Brier score also count how confident the predictions are, which is what improved.
- **No drift:** average ratings are unchanged (within 1 point per pool).
- **Bigger gains at a small cost:** if a larger gain on the whole field matters more than the top, the √ variant (junior ×1.25, margin pow 0.75) gains about twice as much on all games, at a cost of up to +4 on top-level singles in 2026/27.

## Round 3: junior class weights

With the junior weight on top, U19A counts 128% today and 111% in the better method, more than SEN X/E/A. Junior results are a less reliable measure on the senior scale, so this round tests U19A and U17A at or below the senior levels. The base is the better method, and its class weight and junior weight are set together for each junior class:

| Config | U19A | U17A | All 25/26 S | All 25/26 D | All 26/27 S | All 26/27 D | Settled 25/26 S | Settled 25/26 D | Settled 26/27 S | Settled 26/27 D | Top 25/26 S | Top 25/26 D | Top 26/27 S | Top 26/27 D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 128% | 90% | 0.5120 | 0.5039 | 0.5536 | 0.5244 | 0.4453 | 0.4367 | 0.4773 | 0.4713 | 0.4485 | 0.4439 | 0.4691 | 0.4454 |
| better method (round 2) | 111% | 85% | −9.8 | −7.2 | −7.5 | −7.5 | −6.2 | −2.2 | −2.3 | −3.1 | −4.4 | −0.4 | −0.1 | −0.1 |
| U19A 100% | 100% | 85% | −10.2 | −7.3 | −7.6 | −7.7 | −6.4 | −2.3 | −2.2 | −3.0 | −4.8 | −0.2 | +0.0 | −0.4 |
| U19A 95% | 95% | 85% | −10.3 | −7.4 | −7.6 | −7.8 | −6.5 | −2.3 | −2.2 | −3.0 | −5.0 | −0.1 | +0.1 | −0.5 |
| **U19A 89% (= SEN B)** | **89%** | **85%** | **−10.5** | **−7.4** | **−7.6** | **−7.9** | **−6.6** | **−2.3** | **−2.1** | **−3.0** | **−5.1** | **+0.1** | **+0.3** | **−0.7** |
| U19A 80% | 80% | 85% | −10.6 | −7.5 | −7.6 | −8.0 | −6.7 | −2.3 | −1.9 | −2.9 | −5.2 | +0.3 | +0.5 | −0.8 |
| U19A 89%, U17A 75% | 89% | 75% | −10.6 | −7.5 | −7.9 | −7.6 | −6.5 | −2.0 | −2.1 | −2.3 | −5.0 | +0.6 | +0.2 | +0.6 |
| No junior weight in U19A and U17A | 89% | 68% | −10.6 | −7.5 | −8.0 | −7.2 | −6.4 | −1.7 | −2.1 | −1.6 | −4.8 | +1.0 | +0.3 | +1.5 |
| No junior weight at all | 89% | 68% | −6.6 | −4.4 | −6.5 | −6.2 | −3.2 | +0.4 | −1.3 | −1.8 | −3.8 | +2.1 | +1.0 | +3.0 |
| Today's weights, U19A 100% | 100% | 90% | −1.6 | −0.5 | −0.8 | −0.7 | −1.5 | −0.3 | −0.5 | −0.1 | −2.9 | +0.3 | −1.3 | −1.0 |
| Today's weights, U19A 85% (= SEN B) | 85% | 90% | −2.1 | −0.6 | −1.0 | −1.0 | −2.0 | −0.3 | −0.6 | −0.2 | −3.6 | +0.7 | −1.4 | −1.5 |

In "No junior weight at all", the junior classes from U15A down lose the ×1.25 as well and count as their senior tier (U15A 50%, like SEN D). In every other config they keep it.

- **U19A doesn't need to count more than seniors.** Bringing it down from 111% to 100%, 95% or SEN B's 89% is as good or slightly better on all and settled games (about 0.1–0.7). Top-level games are within ±0.7: singles in 2025/26 a little better (−5.1 against −4.4), doubles in 2025/26 and singles in 2026/27 a little worse (+0.1 and +0.3 against −0.4 and −0.1). The gap from 100% down to 89% is under 0.4 everywhere. On today's rules the same change (U19A from 128% to 85%) is also a small gain, by 0.2–3.6.
- **U17A can stay at 85%.** Lowering it to 75% or 68% doesn't help, and makes doubles worse (+0.6 to +1.6 on settled and top-level doubles).
- **The junior weight does matter below U19.** Without it for U15 and below, all-games log loss is 3–4 worse than with ×1.25.
- **The differences are small.** All the U19A variants from 80% to 111% are within 1 thousandth of each other. The data allows any of them, so U19A can be set where it makes sense: at SEN B's level, between SEN A and SEN C.

### The method to adopt

The better method from round 2, with **U19A/X and Junior NM for lag at 89%, the same as SEN B** (no junior weight on top). Every other class is as in the table above, and the junior weight ×1.25 stays for U17 and below.

| Classes and leagues | Today | New |
| --- | ---: | ---: |
| SEN X/E/A, Eliteserien, 1. HS and 1. DS in 1st div | 100% | 100% |
| U19A/X, Junior NM for lag (U19) | 128% | 89% |
| SEN B, O35–O45, other 1st div games | 85% | 89% |
| U17A/X, U17 leagues, Landsfinale U17, U17/U19 singles series | 90% | 85% |
| SEN C, O50–O55, 2nd div, 1st div qualification | 60% | 68% |
| U15A/X, U15 leagues, Landsfinalen U15 | 60% | 63% |
| SEN D, O60+, 3rd div | 40% | 50% |
| U13A/X, U19B, U17B, U13 leagues, U13/U15 singles series | 38% | 44% |
| U11A, U15B, U13B | 15% | 22% |
| 4th div, other senior series | 10% | 18% |
| Other junior classes (U11B, U9, …), Nybegynnerserie | 8% | 13% |
| Other senior (Åpen HC, internal club events) | 5% | 11% |

Margin weight pow 0.75. Everything else as today.

## Rating floor

If the ratings are shifted so that the top-level start is 800 in singles and 400 per doubles player (purely cosmetic), the weakest players go below zero. In October 2026 that is 14 active singles players and 288 active doubles players. A floor stops this, but unlike the shift it changes ratings: a player on the floor loses less than their opponent gains, so points are added at the bottom. The floor applies to start ratings too, so a doubles newcomer in the lowest classes starts at the floor (today's 1050 is −50 on the shifted scale).

Tested on the method to adopt. A shifted floor $f$ is $f + 700$ in singles and $f + 1100$ in doubles on today's scale:

| Config | All 25/26 S | All 25/26 D | All 26/27 S | All 26/27 D | Settled 25/26 S | Settled 25/26 D | Settled 26/27 S | Settled 26/27 D | Top 25/26 S | Top 25/26 D | Top 26/27 S | Top 26/27 D | Average doubles rating (MD, WD, XD) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| method to adopt, no floor | −10.5 | −7.4 | −7.6 | −7.9 | −6.6 | −2.3 | −2.1 | −3.0 | −5.1 | +0.1 | +0.3 | −0.7 | 1293, 1301, 1321 |
| **floor 0** | **−11.0** | **−14.7** | **−7.7** | **−16.9** | **−6.7** | **−1.3** | **−2.1** | **−4.1** | **−5.1** | **−0.6** | **+0.3** | **−1.3** | **1297, 1307, 1325** |
| floor 100 | −12.3 | −28.4 | −8.5 | −29.8 | −6.6 | +1.3 | −1.8 | +0.4 | −5.0 | −2.5 | +0.6 | −3.1 | 1320, 1333, 1344 |
| floor 200 | −17.1 | −26.5 | −13.7 | −30.5 | −6.7 | +9.3 | −2.8 | +7.4 | −4.7 | +0.1 | +2.1 | −1.8 | 1374, 1387, 1391 |

The changes are against the current rules, as in the other tables.

- **Floor 0 improves predictions.**
  - All-games doubles log loss improves by another 7–9 thousandths, and singles barely changes, since only 14 active singles players are affected.
  - The weakest doubles players' ratings sink further than their results justify. The floor stops that and lifts the lowest-class doubles starts a little.
  - The cost is a few points of inflation in doubles (average +4 to +6) and a little less gain on settled doubles in 2025/26 (−1.3 against −2.3).
- **Higher floors gain more on all games, but inflate doubles.** At 100 and 200, the average doubles rating rises by 20–90 points. Settled doubles gets worse (up to +9.3), because the floor then holds up players who really are that weak.
- **Recommended: floor 0** (700 / 1100 on today's scale) together with the shift. There are no negative ratings, predictions are as good or better everywhere except settled doubles 2025/26, where the gain is a little smaller, and inflation is negligible.

## Recommendation

- **Adopt the method in [round 3](#the-method-to-adopt).** It beats the current rules on all games and on settled games in every window, and is level with them at the top. In `rules.mjs` the change is:
  - The tier weights become `weight ** 0.75`.
  - The junior weight becomes 1.25, except for tier 1 (U19A/X, Junior NM for lag), where it is 1.
  - The margin weight becomes `min(3, x ** 0.75)`.

  With the cosmetic shift to 800 / 400, add the [rating floor](#rating-floor) at 0.

  The README sections on the class level weight, the junior weight and the margin weight need their numbers updated, with the class table listing juniors and seniors separately.
- **Don't adopt the proposal** (flat 800 / 400 start, no levels). Its best version predicts the whole field better, but costs 13–55 thousandths on top-level games, the ones that decide the rankings.
- **Not worth pursuing:** chess.com-style fixed K, Glicko's K (alone or after a player's first matches), and juniors at full class weight.

## Full results

Output of `node benchmark.mjs` on 2026-10-26 (log loss: current in full, others as the change in thousandths).


#### Log loss, all games (current in full, others: change in thousandths)

| Config | 2025/26 singles | 2025/26 doubles | 2026/27 singles | 2026/27 doubles | holdout 2023–25 singles | holdout 2023–25 doubles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 0.5120 | 0.5039 | 0.5536 | 0.5244 | 0.5099 | 0.5080 |
| current, margin pow 0.5 | +1.9 | +3.8 | -1.3 | -2.0 | +3.3 | +1.0 |
| current, margin pow 0.75 | -0.8 | +0.5 | -2.8 | -3.1 | -0.1 | -1.1 |
| current, margin pow 0.33 | +5.6 | +7.6 | +1.6 | +0.7 | +7.2 | +4.3 |
| current, margin damped 0.5 | +4.1 | +4.3 | +0.1 | -0.6 | +5.3 | +1.8 |
| current, margin none | +19.2 | +22.3 | +13.8 | +14.6 | +20.4 | +18.1 |
| new | -4.6 | -0.7 | +27.5 | +4.3 | -4.2 | +8.0 |
| new, κ 24 | -5.8 | +6.4 | +8.6 | +4.7 | -7.5 | +10.6 |
| new, κ 32 | -10.1 | -0.4 | +9.6 | -0.0 | -11.6 | +4.8 |
| new, κ 40 | -10.4 | -2.9 | +14.0 | -0.8 | -11.3 | +3.4 |
| new, κ 70 | +9.1 | +9.1 | +49.8 | +17.7 | +11.4 | +20.7 |
| new, doubles seed flat | -4.6 | +12.5 | +27.5 | +27.8 | -4.2 | +20.8 |
| new, junior ×1 | -12.1 | -5.8 | +8.4 | -3.2 | -14.3 | -0.9 |
| new, cross-region ×1 | -17.4 | -9.0 | -1.4 | -10.0 | -20.0 | -4.1 |
| new, margin current | +18.5 | +13.2 | +58.6 | +24.8 | +18.9 | +25.9 |
| new, margin pow 0.75 | +3.4 | +2.7 | +40.0 | +10.2 | +3.6 | +13.2 |
| new, margin pow 0.33 | -4.7 | +1.0 | +24.7 | +4.8 | -4.6 | +8.7 |
| new, margin damped 0.5 | -3.8 | -0.1 | +26.7 | +5.4 | -3.8 | +8.9 |
| new, margin none | +9.8 | +17.1 | +34.2 | +21.0 | +8.2 | +23.2 |
| chess K 16 | +34.7 | +59.6 | +31.4 | +50.5 | +35.1 | +61.8 |
| chess K 24 | +18.4 | +40.9 | +21.5 | +34.4 | +18.1 | +43.4 |
| chess K 32 | +8.2 | +28.3 | +15.6 | +23.7 | +7.5 | +31.3 |
| chess K 40 | +1.4 | +19.3 | +12.0 | +16.1 | +0.5 | +22.7 |
| chess K 48 | -3.2 | +12.7 | +10.1 | +10.5 | -4.2 | +16.6 |
| chess K 64 | -7.9 | +4.1 | +9.9 | +3.5 | -8.7 | +9.1 |
| glicko K | +47.1 | +54.2 | +66.4 | +61.3 | +57.4 | +62.8 |
| new, class weights back | +14.1 | +14.5 | +9.8 | +2.2 | +14.1 | +16.0 |
| new, class weights back, κ 70 | +10.1 | +9.6 | +10.5 | -0.9 | +9.5 | +11.9 |
| best (new, junior ×1, cross-region ×1) | -17.2 | -8.8 | -9.3 | -10.7 | -21.1 | -6.1 |
| best, κ 32 | -4.7 | +5.5 | -1.9 | +0.2 | -7.7 | +7.9 |
| best, κ 40 | -11.1 | -1.8 | -6.1 | -5.5 | -14.5 | +0.7 |
| best, κ 64 | -18.9 | -10.9 | -9.5 | -11.9 | -23.0 | -8.0 |
| best, cross-region ×1.5 | -17.1 | -9.6 | -3.3 | -9.4 | -20.1 | -5.7 |
| best, margin pow 0.75 | -17.4 | -10.2 | -7.5 | -9.7 | -21.9 | -6.5 |
| best, margin pow 0.33 | -14.9 | -6.0 | -8.6 | -9.5 | -18.6 | -4.0 |
| best, margin damped 0.5 | -16.1 | -8.4 | -9.6 | -10.4 | -20.2 | -5.8 |
| best, margin current | -14.3 | -8.6 | -2.2 | -5.0 | -19.3 | -3.7 |
| best, doubles seed flat | -17.2 | +5.9 | -9.3 | +8.8 | -21.1 | +8.3 |
| best, no m(r), κ 80 | -15.7 | -4.8 | -7.3 | -8.6 | -18.8 | -2.2 |
| best, no m(r), κ 108 | -18.4 | -10.1 | -6.9 | -13.1 | -21.9 | -7.2 |
| best, no m(r), κ 135 | -16.2 | -10.3 | -2.4 | -12.8 | -20.1 | -7.0 |
| best, κ 80 | -18.6 | -11.1 | -6.8 | -10.7 | -22.8 | -7.5 |
| hybrid glicko after 10, ×1 | +42.9 | +5.3 | +34.0 | +3.4 | +40.9 | +0.9 |
| hybrid glicko after 10, ×1.5 | +26.4 | +3.8 | +21.4 | +2.4 | +24.3 | +0.7 |
| hybrid glicko after 10, ×2 | +20.8 | +2.6 | +20.0 | +2.0 | +18.2 | +0.8 |
| hybrid glicko after 30, ×1.5 | +25.6 | +2.4 | +20.1 | +2.1 | +23.8 | +0.9 |
| milder levels √ | -11.8 | -11.8 | +3.3 | -2.2 | -13.2 | -7.0 |
| milder levels √, junior ×1 | -13.7 | -11.6 | -6.2 | -4.5 | -15.7 | -11.0 |
| milder levels ^0.75 | -8.6 | -7.7 | -1.5 | -2.8 | -9.6 | -5.8 |
| milder levels ^0.75, junior ×1 | -5.9 | -4.5 | -4.0 | -2.6 | -7.0 | -5.6 |
| milder levels √, junior ×1, margin pow 0.75 | -16.4 | -13.0 | -10.9 | -10.0 | -17.6 | -13.8 |
| milder levels √, junior ×1.25, margin pow 0.75 | -18.1 | -14.7 | -9.8 | -10.3 | -19.1 | -13.9 |
| milder levels ^0.75, margin pow 0.75 | -11.1 | -8.5 | -6.6 | -7.4 | -11.5 | -8.4 |
| milder levels ^0.75, junior ×1.25, margin pow 0.75 | -9.8 | -7.2 | -7.5 | -7.5 | -10.2 | -8.4 |
| hybrid glicko on best, after 10, ×1 | -5.6 | -7.5 | -11.1 | -8.5 | -7.1 | -6.7 |
| hybrid glicko on best, after 10, ×1.5 | -16.4 | -8.2 | -16.6 | -9.5 | -18.1 | -6.3 |
| classes: U19A capped at 100% | -10.2 | -7.3 | -7.6 | -7.7 | -10.5 | -8.6 |
| classes: U19A 100% | -10.2 | -7.3 | -7.6 | -7.7 | -10.5 | -8.6 |
| classes: U19A 95% | -10.3 | -7.4 | -7.6 | -7.8 | -10.6 | -8.7 |
| classes: U19A 89% (= SEN B) | -10.5 | -7.4 | -7.6 | -7.9 | -10.7 | -8.8 |
| classes: U19A 80% | -10.6 | -7.5 | -7.6 | -8.0 | -10.9 | -8.9 |
| classes: U19A 89%, U17A 75% | -10.6 | -7.5 | -7.9 | -7.6 | -11.0 | -9.1 |
| classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2) | -10.6 | -7.5 | -8.0 | -7.2 | -11.1 | -9.1 |
| classes: no junior weight at all | -6.6 | -4.4 | -6.5 | -6.2 | -7.0 | -6.7 |
| classes, today's weights: U19A 100% | -1.6 | -0.5 | -0.8 | -0.7 | -1.1 | -0.8 |
| classes, today's weights: U19A 85% (= SEN B) | -2.1 | -0.6 | -1.0 | -1.0 | -1.6 | -1.0 |
| adopted, floor 0 (shifted scale) | -11.0 | -14.7 | -7.7 | -16.9 | -11.0 | -15.4 |
| adopted, floor 100 (shifted scale) | -12.3 | -28.4 | -8.5 | -29.8 | -12.6 | -28.3 |
| adopted, floor 200 (shifted scale) | -17.1 | -26.5 | -13.7 | -30.5 | -17.2 | -24.1 |
| milder levels: juniors full weight, junior ×1 | -2.3 | -5.9 | +19.4 | +4.2 | -4.6 | +5.2 |

Games: 2025/26 singles 13760, 2025/26 doubles 10710, 2026/27 singles 2208, 2026/27 doubles 1740, holdout 2023–25 singles 27286, holdout 2023–25 doubles 20879

#### Log loss, settled games (current in full, others: change in thousandths)

| Config | 2025/26 singles | 2025/26 doubles | 2026/27 singles | 2026/27 doubles | holdout 2023–25 singles | holdout 2023–25 doubles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 0.4453 | 0.4367 | 0.4773 | 0.4713 | 0.4353 | 0.4470 |
| current, margin pow 0.5 | -1.6 | +2.6 | -0.8 | -3.6 | +2.3 | -3.2 |
| current, margin pow 0.75 | -2.4 | -0.1 | -2.5 | -3.9 | -0.6 | -3.2 |
| current, margin pow 0.33 | +1.2 | +6.4 | +2.6 | -0.9 | +6.3 | -1.1 |
| current, margin damped 0.5 | -0.0 | +3.6 | +0.7 | -1.2 | +4.3 | -2.7 |
| current, margin none | +14.4 | +22.8 | +18.2 | +15.1 | +20.8 | +11.1 |
| new | +18.5 | +21.0 | +42.7 | +22.5 | +19.0 | +20.6 |
| new, κ 24 | +17.0 | +29.9 | +33.0 | +21.0 | +18.2 | +27.9 |
| new, κ 32 | +13.4 | +22.7 | +32.3 | +16.9 | +14.2 | +21.1 |
| new, κ 40 | +13.4 | +19.8 | +34.5 | +16.7 | +13.9 | +18.6 |
| new, κ 70 | +29.9 | +28.6 | +57.2 | +35.7 | +30.5 | +29.1 |
| new, doubles seed flat | +18.5 | +28.0 | +42.7 | +32.4 | +19.0 | +27.5 |
| new, junior ×1 | +11.4 | +17.8 | +28.2 | +14.2 | +10.4 | +15.0 |
| new, cross-region ×1 | +9.9 | +17.9 | +23.8 | +8.5 | +10.0 | +14.3 |
| new, margin current | +39.2 | +28.1 | +72.8 | +37.6 | +35.4 | +32.4 |
| new, margin pow 0.75 | +26.0 | +21.2 | +55.5 | +26.5 | +23.9 | +23.8 |
| new, margin pow 0.33 | +18.2 | +24.4 | +40.0 | +23.7 | +20.0 | +21.7 |
| new, margin damped 0.5 | +18.8 | +22.8 | +41.1 | +22.9 | +19.8 | +21.6 |
| new, margin none | +31.8 | +43.5 | +50.1 | +39.1 | +34.7 | +35.9 |
| chess K 16 | +56.4 | +87.0 | +59.9 | +70.5 | +61.7 | +83.7 |
| chess K 24 | +37.8 | +65.1 | +45.4 | +51.3 | +41.8 | +62.2 |
| chess K 32 | +26.6 | +50.7 | +36.9 | +39.0 | +29.8 | +48.1 |
| chess K 40 | +19.5 | +40.5 | +31.6 | +30.5 | +22.1 | +38.2 |
| chess K 48 | +14.9 | +33.2 | +28.3 | +24.5 | +17.2 | +31.1 |
| chess K 64 | +10.6 | +23.7 | +26.2 | +17.5 | +12.5 | +22.1 |
| glicko K | +4.1 | +15.2 | +11.0 | +16.6 | +2.6 | +25.6 |
| new, class weights back | +18.6 | +21.4 | +15.4 | +8.2 | +22.7 | +16.6 |
| new, class weights back, κ 70 | +14.1 | +17.3 | +13.5 | +6.9 | +17.6 | +13.1 |
| best (new, junior ×1, cross-region ×1) | +9.9 | +19.7 | +17.6 | +8.8 | +8.9 | +14.7 |
| best, κ 32 | +20.9 | +33.7 | +26.1 | +19.6 | +21.8 | +30.0 |
| best, κ 40 | +15.1 | +26.5 | +21.6 | +14.0 | +15.3 | +22.3 |
| best, κ 64 | +8.4 | +17.6 | +16.7 | +7.5 | +6.8 | +12.0 |
| best, cross-region ×1.5 | +8.1 | +16.3 | +20.1 | +8.9 | +7.2 | +12.6 |
| best, margin pow 0.75 | +10.3 | +17.0 | +20.3 | +9.8 | +7.7 | +14.6 |
| best, margin pow 0.33 | +11.7 | +23.2 | +18.0 | +10.0 | +11.5 | +16.3 |
| best, margin damped 0.5 | +10.6 | +20.7 | +16.8 | +8.7 | +9.8 | +14.8 |
| best, margin current | +13.5 | +17.0 | +25.5 | +13.7 | +9.2 | +16.8 |
| best, doubles seed flat | +9.9 | +27.5 | +17.6 | +18.5 | +8.9 | +22.3 |
| best, no m(r), κ 80 | +6.3 | +19.8 | +11.9 | +8.2 | +6.3 | +15.1 |
| best, no m(r), κ 108 | +4.5 | +14.8 | +11.3 | +4.2 | +3.6 | +9.1 |
| best, no m(r), κ 135 | +7.4 | +14.8 | +15.1 | +5.0 | +5.8 | +8.3 |
| best, κ 80 | +8.4 | +17.2 | +17.6 | +7.9 | +6.1 | +10.9 |
| hybrid glicko after 10, ×1 | +29.4 | +2.1 | +22.8 | +1.4 | +29.2 | +0.4 |
| hybrid glicko after 10, ×1.5 | +14.3 | +1.4 | +13.0 | +1.2 | +12.6 | +0.2 |
| hybrid glicko after 10, ×2 | +11.4 | +1.0 | +14.3 | +1.2 | +8.7 | +0.1 |
| hybrid glicko after 30, ×1.5 | +18.8 | +0.9 | +17.1 | +0.8 | +17.8 | +0.6 |
| milder levels √ | -0.2 | -3.0 | +15.9 | +6.8 | -2.5 | -0.4 |
| milder levels √, junior ×1 | -3.0 | -1.6 | +4.9 | +4.9 | -5.9 | -1.8 |
| milder levels ^0.75 | -3.0 | -2.7 | +3.8 | +1.9 | -4.0 | -1.6 |
| milder levels ^0.75, junior ×1 | -1.0 | +0.7 | +1.0 | +2.8 | -2.5 | -0.1 |
| milder levels √, junior ×1, margin pow 0.75 | -7.1 | -2.6 | +0.1 | -0.7 | -8.0 | -5.7 |
| milder levels √, junior ×1.25, margin pow 0.75 | -8.2 | -4.4 | +1.7 | -0.7 | -8.9 | -6.6 |
| milder levels ^0.75, margin pow 0.75 | -7.1 | -3.5 | -1.4 | -3.0 | -6.5 | -5.6 |
| milder levels ^0.75, junior ×1.25, margin pow 0.75 | -6.2 | -2.2 | -2.3 | -3.1 | -5.7 | -5.2 |
| hybrid glicko on best, after 10, ×1 | +13.4 | +18.7 | +9.5 | +7.5 | +14.1 | +13.6 |
| hybrid glicko on best, after 10, ×1.5 | +2.5 | +19.2 | +0.3 | +8.3 | +3.1 | +14.1 |
| classes: U19A capped at 100% | -6.4 | -2.3 | -2.2 | -3.0 | -5.9 | -5.4 |
| classes: U19A 100% | -6.4 | -2.3 | -2.2 | -3.0 | -5.9 | -5.4 |
| classes: U19A 95% | -6.5 | -2.3 | -2.2 | -3.0 | -6.1 | -5.5 |
| classes: U19A 89% (= SEN B) | -6.6 | -2.3 | -2.1 | -3.0 | -6.2 | -5.6 |
| classes: U19A 80% | -6.7 | -2.3 | -1.9 | -2.9 | -6.3 | -5.7 |
| classes: U19A 89%, U17A 75% | -6.5 | -2.0 | -2.1 | -2.3 | -6.2 | -5.4 |
| classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2) | -6.4 | -1.7 | -2.1 | -1.6 | -6.1 | -5.2 |
| classes: no junior weight at all | -3.2 | +0.4 | -1.3 | -1.8 | -2.9 | -3.1 |
| classes, today's weights: U19A 100% | -1.5 | -0.3 | -0.5 | -0.1 | -1.2 | -0.8 |
| classes, today's weights: U19A 85% (= SEN B) | -2.0 | -0.3 | -0.6 | -0.2 | -1.6 | -1.1 |
| adopted, floor 0 (shifted scale) | -6.7 | -1.3 | -2.1 | -4.1 | -6.3 | -8.2 |
| adopted, floor 100 (shifted scale) | -6.6 | +1.3 | -1.8 | +0.4 | -6.7 | -8.9 |
| adopted, floor 200 (shifted scale) | -6.7 | +9.3 | -2.8 | +7.4 | -7.2 | -2.1 |
| milder levels: juniors full weight, junior ×1 | +13.3 | +1.0 | +38.7 | +13.4 | +5.8 | +4.1 |

Games: 2025/26 singles 9357, 2025/26 doubles 6160, 2026/27 singles 1403, 2026/27 doubles 961, holdout 2023–25 singles 18136, holdout 2023–25 doubles 11690

#### Log loss, cross-region games (current in full, others: change in thousandths)

| Config | 2025/26 singles | 2025/26 doubles | 2026/27 singles | 2026/27 doubles | holdout 2023–25 singles | holdout 2023–25 doubles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 0.4671 | 0.4627 | 0.5160 | 0.5128 | 0.4613 | 0.4578 |
| current, margin pow 0.5 | -1.3 | +1.5 | -1.6 | -11.5 | +1.5 | +0.1 |
| current, margin pow 0.75 | -2.9 | -0.8 | -2.8 | -8.1 | -1.1 | -1.9 |
| current, margin pow 0.33 | +1.8 | +4.9 | +1.3 | -11.9 | +5.1 | +3.5 |
| current, margin damped 0.5 | +1.5 | +2.6 | -0.6 | -12.1 | +3.9 | +1.1 |
| current, margin none | +15.8 | +20.1 | +13.6 | -4.4 | +18.8 | +18.2 |
| new | +2.6 | +2.6 | +23.4 | +34.0 | -0.3 | +12.1 |
| new, κ 24 | +2.2 | +2.6 | +6.6 | +9.9 | -1.0 | +12.1 |
| new, κ 32 | -2.0 | -2.3 | +7.2 | +12.8 | -5.8 | +6.7 |
| new, κ 40 | -2.5 | -2.9 | +11.2 | +18.7 | -6.2 | +6.0 |
| new, κ 70 | +15.1 | +16.0 | +43.1 | +57.1 | +13.1 | +26.6 |
| new, doubles seed flat | +2.6 | +24.5 | +23.4 | +39.1 | -0.3 | +26.4 |
| new, junior ×1 | -3.4 | -2.9 | +9.1 | +18.3 | -9.6 | +3.3 |
| new, cross-region ×1 | -0.4 | -1.1 | -2.6 | +12.2 | -4.0 | +8.2 |
| new, margin current | +30.0 | +16.2 | +56.3 | +64.8 | +16.6 | +29.4 |
| new, margin pow 0.75 | +12.3 | +5.8 | +36.8 | +45.6 | +4.9 | +16.6 |
| new, margin pow 0.33 | +2.0 | +4.7 | +20.3 | +30.0 | +0.6 | +13.6 |
| new, margin damped 0.5 | +3.4 | +3.8 | +20.8 | +28.7 | +1.0 | +13.9 |
| new, margin none | +17.5 | +23.5 | +30.0 | +34.2 | +16.3 | +31.2 |
| chess K 16 | +39.1 | +55.5 | +31.1 | +33.9 | +42.3 | +67.2 |
| chess K 24 | +21.6 | +34.1 | +18.2 | +20.5 | +23.8 | +45.6 |
| chess K 32 | +11.2 | +20.7 | +11.3 | +13.3 | +12.2 | +31.7 |
| chess K 40 | +4.8 | +11.6 | +7.6 | +9.5 | +4.6 | +22.3 |
| chess K 48 | +0.7 | +5.3 | +6.2 | +7.6 | -0.4 | +15.7 |
| chess K 64 | -2.7 | -1.9 | +8.0 | +7.4 | -5.3 | +8.1 |
| glicko K | +51.1 | +38.3 | +69.6 | +51.3 | +35.2 | +53.2 |
| new, class weights back | +10.6 | +10.9 | +5.2 | +1.4 | +10.4 | +15.8 |
| new, class weights back, κ 70 | +7.8 | +8.2 | +9.2 | +3.8 | +5.7 | +12.0 |
| best (new, junior ×1, cross-region ×1) | +2.0 | +0.1 | -7.4 | +5.9 | -4.4 | +8.3 |
| best, κ 32 | +14.9 | +12.9 | +1.5 | +7.7 | +10.7 | +23.6 |
| best, κ 40 | +8.5 | +6.1 | -3.3 | +5.8 | +3.2 | +15.9 |
| best, κ 64 | -0.2 | -1.4 | -8.2 | +7.7 | -7.1 | +5.8 |
| best, cross-region ×1.5 | -4.5 | -5.1 | -2.9 | +8.1 | -10.8 | +2.1 |
| best, margin pow 0.75 | +1.8 | -1.1 | -6.3 | +10.9 | -5.6 | +7.7 |
| best, margin pow 0.33 | +4.2 | +2.7 | -6.4 | +3.8 | -1.9 | +10.4 |
| best, margin damped 0.5 | +3.2 | +0.5 | -7.9 | +3.2 | -3.2 | +8.6 |
| best, margin current | +4.4 | +0.4 | -2.4 | +19.4 | -3.6 | +10.3 |
| best, doubles seed flat | +2.0 | +18.7 | -7.4 | +14.0 | -4.4 | +22.2 |
| best, no m(r), κ 80 | +0.5 | +0.7 | -4.8 | -0.1 | -5.2 | +9.8 |
| best, no m(r), κ 108 | -1.3 | -3.3 | -1.7 | +0.9 | -8.6 | +4.4 |
| best, no m(r), κ 135 | +1.4 | -2.4 | +5.4 | +5.5 | -6.9 | +4.4 |
| best, κ 80 | -1.0 | -0.7 | -7.0 | +12.8 | -8.3 | +5.3 |
| hybrid glicko after 10, ×1 | +34.9 | +4.1 | +23.6 | -0.4 | +35.3 | -1.0 |
| hybrid glicko after 10, ×1.5 | +20.4 | +3.0 | +18.1 | -0.4 | +19.9 | -1.0 |
| hybrid glicko after 10, ×2 | +18.2 | +2.4 | +23.4 | +0.1 | +16.8 | -0.6 |
| hybrid glicko after 30, ×1.5 | +22.3 | +2.0 | +21.4 | +0.9 | +20.3 | -0.6 |
| milder levels √ | -1.6 | -5.7 | +13.6 | +19.4 | -6.8 | -3.2 |
| milder levels √, junior ×1 | -6.8 | -7.1 | +4.1 | +10.9 | -10.6 | -7.9 |
| milder levels ^0.75 | -3.5 | -4.7 | +4.2 | +7.5 | -6.3 | -4.2 |
| milder levels ^0.75, junior ×1 | -4.0 | -2.4 | +1.1 | +2.9 | -5.1 | -4.4 |
| milder levels √, junior ×1, margin pow 0.75 | -11.4 | -9.7 | -0.8 | -1.3 | -13.5 | -11.5 |
| milder levels √, junior ×1.25, margin pow 0.75 | -11.4 | -10.6 | +0.7 | +1.6 | -14.1 | -11.3 |
| milder levels ^0.75, margin pow 0.75 | -8.3 | -6.8 | -1.1 | -2.7 | -9.2 | -7.6 |
| milder levels ^0.75, junior ×1.25, margin pow 0.75 | -8.3 | -6.1 | -2.1 | -5.6 | -8.5 | -7.8 |
| hybrid glicko on best, after 10, ×1 | +14.9 | +1.5 | -11.0 | +6.3 | +10.4 | +6.5 |
| hybrid glicko on best, after 10, ×1.5 | +0.9 | +0.6 | -19.6 | +5.9 | -2.9 | +7.0 |
| classes: U19A capped at 100% | -8.8 | -6.2 | -1.7 | -5.9 | -8.8 | -8.1 |
| classes: U19A 100% | -8.8 | -6.2 | -1.7 | -5.9 | -8.8 | -8.1 |
| classes: U19A 95% | -9.0 | -6.3 | -1.5 | -6.1 | -9.0 | -8.2 |
| classes: U19A 89% (= SEN B) | -9.2 | -6.3 | -1.2 | -6.2 | -9.1 | -8.3 |
| classes: U19A 80% | -9.3 | -6.3 | -0.8 | -6.4 | -9.2 | -8.4 |
| classes: U19A 89%, U17A 75% | -9.4 | -6.1 | -1.2 | -6.8 | -9.2 | -8.5 |
| classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2) | -9.5 | -5.9 | -1.1 | -7.0 | -9.2 | -8.5 |
| classes: no junior weight at all | -6.5 | -3.6 | -1.7 | -6.7 | -6.0 | -6.1 |
| classes, today's weights: U19A 100% | -2.1 | -0.4 | +0.7 | -0.9 | -1.2 | -1.1 |
| classes, today's weights: U19A 85% (= SEN B) | -2.8 | -0.4 | +1.2 | -1.3 | -1.7 | -1.5 |
| adopted, floor 0 (shifted scale) | -9.3 | -10.9 | -1.2 | -11.6 | -9.4 | -13.1 |
| adopted, floor 100 (shifted scale) | -10.4 | -19.6 | -2.3 | -19.9 | -10.8 | -20.2 |
| adopted, floor 200 (shifted scale) | -14.1 | -15.3 | -9.4 | -22.0 | -14.4 | -15.8 |
| milder levels: juniors full weight, junior ×1 | +8.3 | +0.9 | +29.2 | +23.8 | +1.6 | +9.1 |

Games: 2025/26 singles 4603, 2025/26 doubles 2941, 2026/27 singles 799, 2026/27 doubles 494, holdout 2023–25 singles 8289, holdout 2023–25 doubles 5085

#### Log loss, top level games (current in full, others: change in thousandths)

| Config | 2025/26 singles | 2025/26 doubles | 2026/27 singles | 2026/27 doubles | holdout 2023–25 singles | holdout 2023–25 doubles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 0.4485 | 0.4439 | 0.4691 | 0.4454 | 0.4207 | 0.4451 |
| current, margin pow 0.5 | -5.9 | +1.1 | +0.8 | +3.8 | -2.5 | -1.7 |
| current, margin pow 0.75 | -5.0 | -0.7 | -2.1 | +0.1 | -2.9 | -2.4 |
| current, margin pow 0.33 | -3.7 | +4.4 | +5.4 | +9.1 | +0.1 | +0.8 |
| current, margin damped 0.5 | -3.6 | +2.1 | +4.6 | +7.4 | -0.9 | -1.0 |
| current, margin none | +11.0 | +21.1 | +25.5 | +31.1 | +13.8 | +13.9 |
| new | +54.6 | +23.5 | +95.6 | +20.2 | +48.3 | +25.3 |
| new, κ 24 | +42.2 | +35.2 | +72.6 | +32.3 | +43.7 | +32.8 |
| new, κ 32 | +41.9 | +27.7 | +75.7 | +24.0 | +41.2 | +26.4 |
| new, κ 40 | +44.7 | +24.1 | +81.5 | +20.2 | +42.0 | +23.9 |
| new, κ 70 | +71.0 | +28.6 | +116.4 | +27.4 | +60.5 | +32.6 |
| new, doubles seed flat | +54.6 | +33.3 | +95.6 | +38.4 | +48.3 | +36.2 |
| new, junior ×1 | +34.9 | +19.9 | +62.0 | +15.6 | +29.2 | +18.0 |
| new, cross-region ×1 | +39.1 | +19.2 | +77.0 | +6.8 | +40.6 | +19.5 |
| new, margin current | +76.6 | +30.7 | +126.4 | +27.3 | +65.6 | +36.3 |
| new, margin pow 0.75 | +62.6 | +24.8 | +106.6 | +20.7 | +54.5 | +28.6 |
| new, margin pow 0.33 | +53.5 | +25.5 | +94.0 | +23.5 | +47.5 | +25.7 |
| new, margin damped 0.5 | +55.3 | +24.0 | +97.5 | +22.0 | +48.0 | +25.1 |
| new, margin none | +65.5 | +41.0 | +108.2 | +41.4 | +57.0 | +36.1 |
| chess K 16 | +65.0 | +84.5 | +89.1 | +91.6 | +73.7 | +84.2 |
| chess K 24 | +52.9 | +65.4 | +79.4 | +70.2 | +58.1 | +63.8 |
| chess K 32 | +46.0 | +52.7 | +74.0 | +55.2 | +49.0 | +50.5 |
| chess K 40 | +41.9 | +43.6 | +71.2 | +44.1 | +43.4 | +41.3 |
| chess K 48 | +39.7 | +36.8 | +70.2 | +35.5 | +40.1 | +34.7 |
| chess K 64 | +38.8 | +27.6 | +72.1 | +23.8 | +37.7 | +26.6 |
| glicko K | -23.6 | +9.9 | -19.7 | +12.9 | -8.7 | +9.9 |
| new, class weights back | +10.8 | +11.2 | +25.6 | +7.7 | +9.2 | +8.4 |
| new, class weights back, κ 70 | +13.9 | +9.2 | +29.4 | +6.4 | +10.9 | +7.9 |
| best (new, junior ×1, cross-region ×1) | +28.2 | +20.0 | +53.7 | +8.4 | +28.1 | +17.2 |
| best, κ 32 | +36.1 | +35.0 | +57.1 | +25.3 | +38.2 | +31.0 |
| best, κ 40 | +31.7 | +27.7 | +54.6 | +17.0 | +32.8 | +24.1 |
| best, κ 64 | +28.0 | +17.1 | +54.9 | +5.4 | +26.9 | +14.9 |
| best, cross-region ×1.5 | +28.7 | +17.6 | +54.8 | +9.6 | +26.1 | +15.5 |
| best, margin pow 0.75 | +31.0 | +19.0 | +56.6 | +6.8 | +29.4 | +17.6 |
| best, margin pow 0.33 | +28.5 | +22.0 | +54.0 | +10.8 | +28.7 | +18.3 |
| best, margin damped 0.5 | +28.2 | +19.9 | +54.2 | +8.5 | +27.6 | +16.7 |
| best, margin current | +36.7 | +19.9 | +63.0 | +7.1 | +32.7 | +19.8 |
| best, doubles seed flat | +28.2 | +28.7 | +53.7 | +22.3 | +28.1 | +27.4 |
| best, no m(r), κ 80 | +23.5 | +19.4 | +49.5 | +7.4 | +22.6 | +16.6 |
| best, no m(r), κ 108 | +24.0 | +13.3 | +53.7 | -0.4 | +22.4 | +12.1 |
| best, no m(r), κ 135 | +28.5 | +12.2 | +60.8 | -2.1 | +26.6 | +12.5 |
| best, κ 80 | +30.1 | +15.6 | +58.9 | +3.8 | +27.6 | +14.2 |
| hybrid glicko after 10, ×1 | -0.6 | +1.6 | +7.0 | +1.4 | +9.5 | -0.1 |
| hybrid glicko after 10, ×1.5 | -5.3 | +1.4 | +5.4 | +1.0 | +0.8 | -0.0 |
| hybrid glicko after 10, ×2 | +5.8 | +1.2 | +19.0 | +1.3 | +8.3 | +0.6 |
| hybrid glicko after 30, ×1.5 | -3.4 | +1.1 | +7.5 | +0.1 | +2.3 | -0.4 |
| milder levels √ | +7.8 | -1.0 | +14.3 | -4.0 | +9.0 | +0.5 |
| milder levels √, junior ×1 | +2.7 | +2.4 | +4.1 | +1.4 | +2.0 | +1.0 |
| milder levels ^0.75 | +2.4 | -0.9 | +4.5 | -2.2 | +3.1 | -0.4 |
| milder levels ^0.75, junior ×1 | +0.1 | +3.0 | +1.4 | +3.2 | -0.6 | +1.4 |
| milder levels √, junior ×1, margin pow 0.75 | -1.9 | +1.1 | +2.9 | +1.0 | -1.2 | -1.8 |
| milder levels √, junior ×1.25, margin pow 0.75 | -1.6 | -1.2 | +3.7 | -2.1 | +0.3 | -2.9 |
| milder levels ^0.75, margin pow 0.75 | -3.3 | -1.9 | +1.0 | -2.3 | -0.8 | -3.1 |
| milder levels ^0.75, junior ×1.25, margin pow 0.75 | -4.4 | -0.4 | -0.1 | -0.1 | -2.7 | -2.6 |
| hybrid glicko on best, after 10, ×1 | +7.7 | +18.7 | +17.0 | +7.8 | +17.4 | +16.0 |
| hybrid glicko on best, after 10, ×1.5 | +5.8 | +19.2 | +23.9 | +7.7 | +13.5 | +16.2 |
| classes: U19A capped at 100% | -4.8 | -0.2 | +0.0 | -0.4 | -3.2 | -2.7 |
| classes: U19A 100% | -4.8 | -0.2 | +0.0 | -0.4 | -3.2 | -2.7 |
| classes: U19A 95% | -5.0 | -0.1 | +0.1 | -0.5 | -3.3 | -2.7 |
| classes: U19A 89% (= SEN B) | -5.1 | +0.1 | +0.3 | -0.7 | -3.5 | -2.6 |
| classes: U19A 80% | -5.2 | +0.3 | +0.5 | -0.8 | -3.6 | -2.5 |
| classes: U19A 89%, U17A 75% | -5.0 | +0.6 | +0.2 | +0.6 | -3.4 | -2.3 |
| classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2) | -4.8 | +1.0 | +0.3 | +1.5 | -3.3 | -1.9 |
| classes: no junior weight at all | -3.8 | +2.1 | +1.0 | +3.0 | -3.0 | -1.0 |
| classes, today's weights: U19A 100% | -2.9 | +0.3 | -1.3 | -1.0 | -2.0 | -0.4 |
| classes, today's weights: U19A 85% (= SEN B) | -3.6 | +0.7 | -1.4 | -1.5 | -2.6 | -0.4 |
| adopted, floor 0 (shifted scale) | -5.1 | -0.6 | +0.3 | -1.3 | -3.6 | -3.9 |
| adopted, floor 100 (shifted scale) | -5.0 | -2.5 | +0.6 | -3.1 | -3.7 | -6.8 |
| adopted, floor 200 (shifted scale) | -4.7 | +0.1 | +2.1 | -1.8 | -3.8 | -5.7 |
| milder levels: juniors full weight, junior ×1 | +7.9 | -1.9 | +18.0 | -6.5 | +9.6 | +0.5 |

Games: 2025/26 singles 3735, 2025/26 doubles 4209, 2026/27 singles 647, 2026/27 doubles 711, holdout 2023–25 singles 6967, holdout 2023–25 doubles 7901

#### Favourite won and Brier score, all games

| Config | 2025/26 singles | 2025/26 doubles | 2026/27 singles | 2026/27 doubles |
| --- | ---: | ---: | ---: | ---: |
| current | 73.9% · 0.1712 | 75.0% · 0.1673 | 71.7% · 0.1863 | 74.6% · 0.1746 |
| current, margin pow 0.5 | 73.5% · 0.1726 | 74.6% · 0.1696 | 70.7% · 0.1870 | 73.4% · 0.1750 |
| current, margin pow 0.75 | 73.9% · 0.1713 | 74.9% · 0.1680 | 71.3% · 0.1861 | 74.3% · 0.1741 |
| current, margin pow 0.33 | 73.3% · 0.1742 | 74.4% · 0.1712 | 70.5% · 0.1882 | 73.3% · 0.1761 |
| current, margin damped 0.5 | 73.3% · 0.1736 | 74.6% · 0.1698 | 70.3% · 0.1875 | 73.4% · 0.1754 |
| current, margin none | 72.2% · 0.1797 | 73.4% · 0.1769 | 69.5% · 0.1921 | 72.6% · 0.1808 |
| new | 75.3% · 0.1659 | 75.5% · 0.1653 | 71.9% · 0.1882 | 74.9% · 0.1721 |
| new, κ 24 | 74.5% · 0.1686 | 74.5% · 0.1703 | 70.8% · 0.1892 | 73.7% · 0.1769 |
| new, κ 32 | 74.9% · 0.1665 | 74.9% · 0.1674 | 71.0% · 0.1878 | 73.9% · 0.1743 |
| new, κ 40 | 75.2% · 0.1656 | 75.4% · 0.1659 | 71.4% · 0.1874 | 74.1% · 0.1729 |
| new, κ 70 | 75.4% · 0.1679 | 75.8% · 0.1665 | 72.0% · 0.1907 | 75.6% · 0.1730 |
| new, doubles seed flat | 75.3% · 0.1659 | 74.4% · 0.1714 | 71.9% · 0.1882 | 72.3% · 0.1823 |
| new, junior ×1 | 75.1% · 0.1651 | 75.4% · 0.1647 | 72.4% · 0.1857 | 74.1% · 0.1718 |
| new, cross-region ×1 | 75.7% · 0.1632 | 75.7% · 0.1636 | 73.5% · 0.1819 | 74.7% · 0.1705 |
| new, margin current | 75.4% · 0.1702 | 75.7% · 0.1673 | 71.7% · 0.1934 | 74.8% · 0.1764 |
| new, margin pow 0.75 | 75.4% · 0.1672 | 75.6% · 0.1655 | 71.5% · 0.1903 | 74.9% · 0.1732 |
| new, margin pow 0.33 | 75.3% · 0.1664 | 75.3% · 0.1663 | 72.0% · 0.1880 | 74.9% · 0.1727 |
| new, margin damped 0.5 | 75.4% · 0.1664 | 75.5% · 0.1655 | 71.8% · 0.1880 | 75.0% · 0.1725 |
| new, margin none | 74.4% · 0.1720 | 74.6% · 0.1723 | 71.2% · 0.1911 | 74.0% · 0.1784 |
| chess K 16 | 71.9% · 0.1847 | 71.4% · 0.1913 | 68.6% · 0.2010 | 70.4% · 0.1959 |
| chess K 24 | 72.6% · 0.1784 | 72.4% · 0.1839 | 69.1% · 0.1965 | 71.3% · 0.1892 |
| chess K 32 | 73.2% · 0.1744 | 73.0% · 0.1791 | 70.0% · 0.1936 | 72.2% · 0.1848 |
| chess K 40 | 73.6% · 0.1718 | 73.7% · 0.1756 | 70.3% · 0.1915 | 72.2% · 0.1816 |
| chess K 48 | 74.0% · 0.1701 | 73.9% · 0.1731 | 70.7% · 0.1900 | 73.1% · 0.1792 |
| chess K 64 | 74.4% · 0.1681 | 74.6% · 0.1697 | 71.0% · 0.1883 | 73.6% · 0.1759 |
| glicko K | 75.1% · 0.1717 | 75.0% · 0.1748 | 72.1% · 0.1905 | 73.2% · 0.1867 |
| new, class weights back | 72.6% · 0.1773 | 73.5% · 0.1741 | 70.1% · 0.1917 | 73.4% · 0.1767 |
| new, class weights back, κ 70 | 73.3% · 0.1754 | 73.9% · 0.1717 | 70.6% · 0.1907 | 73.9% · 0.1749 |
| best (new, junior ×1, cross-region ×1) | 75.3% · 0.1640 | 75.5% · 0.1642 | 73.2% · 0.1815 | 74.2% · 0.1712 |
| best, κ 32 | 74.3% · 0.1690 | 74.6% · 0.1698 | 71.4% · 0.1863 | 73.4% · 0.1759 |
| best, κ 40 | 74.6% · 0.1665 | 75.0% · 0.1671 | 71.9% · 0.1840 | 74.1% · 0.1736 |
| best, κ 64 | 75.5% · 0.1630 | 75.7% · 0.1632 | 73.6% · 0.1804 | 74.3% · 0.1703 |
| best, cross-region ×1.5 | 75.3% · 0.1637 | 75.6% · 0.1637 | 72.4% · 0.1828 | 74.8% · 0.1707 |
| best, margin pow 0.75 | 75.5% · 0.1637 | 75.8% · 0.1635 | 73.0% · 0.1816 | 74.8% · 0.1712 |
| best, margin pow 0.33 | 75.1% · 0.1649 | 75.2% · 0.1654 | 72.6% · 0.1820 | 74.6% · 0.1718 |
| best, margin damped 0.5 | 75.1% · 0.1644 | 75.5% · 0.1644 | 72.8% · 0.1813 | 74.5% · 0.1713 |
| best, margin current | 75.3% · 0.1645 | 75.6% · 0.1637 | 72.5% · 0.1827 | 74.7% · 0.1724 |
| best, doubles seed flat | 75.3% · 0.1640 | 74.2% · 0.1703 | 73.2% · 0.1815 | 71.8% · 0.1792 |
| best, no m(r), κ 80 | 74.6% · 0.1652 | 75.0% · 0.1663 | 72.1% · 0.1828 | 74.1% · 0.1723 |
| best, no m(r), κ 108 | 74.9% · 0.1639 | 75.3% · 0.1641 | 72.5% · 0.1811 | 74.3% · 0.1702 |
| best, no m(r), κ 135 | 75.1% · 0.1641 | 75.4% · 0.1636 | 73.5% · 0.1807 | 74.8% · 0.1695 |
| best, κ 80 | 75.7% · 0.1623 | 75.9% · 0.1625 | 73.7% · 0.1795 | 75.1% · 0.1696 |
| hybrid glicko after 10, ×1 | 71.5% · 0.1870 | 74.7% · 0.1691 | 69.2% · 0.1999 | 74.4% · 0.1754 |
| hybrid glicko after 10, ×1.5 | 72.4% · 0.1807 | 74.8% · 0.1686 | 70.2% · 0.1952 | 74.5% · 0.1751 |
| hybrid glicko after 10, ×2 | 73.0% · 0.1780 | 74.9% · 0.1682 | 70.5% · 0.1935 | 74.5% · 0.1751 |
| hybrid glicko after 30, ×1.5 | 72.7% · 0.1802 | 74.9% · 0.1681 | 69.8% · 0.1948 | 74.5% · 0.1751 |
| milder levels √ | 75.6% · 0.1647 | 76.3% · 0.1614 | 72.3% · 0.1838 | 74.8% · 0.1715 |
| milder levels √, junior ×1 | 75.2% · 0.1653 | 76.1% · 0.1623 | 72.3% · 0.1830 | 74.9% · 0.1717 |
| milder levels ^0.75 | 74.9% · 0.1672 | 75.9% · 0.1638 | 72.3% · 0.1845 | 74.6% · 0.1727 |
| milder levels ^0.75, junior ×1 | 74.4% · 0.1689 | 75.4% · 0.1656 | 71.6% · 0.1851 | 75.2% · 0.1734 |
| milder levels √, junior ×1, margin pow 0.75 | 75.3% · 0.1646 | 75.7% · 0.1624 | 72.2% · 0.1821 | 74.5% · 0.1708 |
| milder levels √, junior ×1.25, margin pow 0.75 | 75.4% · 0.1637 | 76.0% · 0.1615 | 72.2% · 0.1817 | 74.3% · 0.1704 |
| milder levels ^0.75, margin pow 0.75 | 74.6% · 0.1668 | 75.6% · 0.1641 | 72.0% · 0.1836 | 74.3% · 0.1720 |
| milder levels ^0.75, junior ×1.25, margin pow 0.75 | 74.6% · 0.1675 | 75.4% · 0.1648 | 71.6% · 0.1840 | 74.2% · 0.1722 |
| hybrid glicko on best, after 10, ×1 | 74.7% · 0.1685 | 75.6% · 0.1647 | 72.0% · 0.1825 | 73.6% · 0.1722 |
| hybrid glicko on best, after 10, ×1.5 | 75.1% · 0.1644 | 75.4% · 0.1645 | 73.1% · 0.1794 | 73.6% · 0.1718 |
| classes: U19A capped at 100% | 74.6% · 0.1674 | 75.4% · 0.1648 | 71.6% · 0.1839 | 74.3% · 0.1722 |
| classes: U19A 100% | 74.6% · 0.1674 | 75.4% · 0.1648 | 71.6% · 0.1839 | 74.3% · 0.1722 |
| classes: U19A 95% | 74.6% · 0.1674 | 75.4% · 0.1648 | 71.5% · 0.1839 | 74.3% · 0.1722 |
| classes: U19A 89% (= SEN B) | 74.6% · 0.1673 | 75.4% · 0.1648 | 71.5% · 0.1839 | 74.4% · 0.1722 |
| classes: U19A 80% | 74.6% · 0.1672 | 75.3% · 0.1648 | 71.5% · 0.1839 | 74.6% · 0.1721 |
| classes: U19A 89%, U17A 75% | 74.6% · 0.1673 | 75.4% · 0.1648 | 71.7% · 0.1839 | 74.5% · 0.1724 |
| classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2) | 74.5% · 0.1673 | 75.4% · 0.1648 | 71.7% · 0.1840 | 74.4% · 0.1725 |
| classes: no junior weight at all | 74.5% · 0.1689 | 75.2% · 0.1661 | 71.4% · 0.1848 | 74.3% · 0.1729 |
| classes, today's weights: U19A 100% | 74.0% · 0.1708 | 74.9% · 0.1672 | 71.4% · 0.1861 | 74.6% · 0.1744 |
| classes, today's weights: U19A 85% (= SEN B) | 74.0% · 0.1706 | 75.0% · 0.1672 | 71.4% · 0.1861 | 74.7% · 0.1743 |
| adopted, floor 0 (shifted scale) | 74.6% · 0.1672 | 75.6% · 0.1627 | 71.5% · 0.1839 | 74.7% · 0.1692 |
| adopted, floor 100 (shifted scale) | 74.6% · 0.1669 | 76.5% · 0.1574 | 71.4% · 0.1837 | 75.7% · 0.1643 |
| adopted, floor 200 (shifted scale) | 74.8% · 0.1654 | 76.6% · 0.1575 | 71.8% · 0.1822 | 75.3% · 0.1632 |
| milder levels: juniors full weight, junior ×1 | 75.5% · 0.1652 | 76.2% · 0.1626 | 72.6% · 0.1858 | 74.9% · 0.1731 |

#### Log loss per pool, 2025/26 and 2026/27 together, all games

| Config | men | women | mensDoubles | womensDoubles | mixedDoubles |
| --- | ---: | ---: | ---: | ---: | ---: |
| current | 0.5225 | 0.5064 | 0.5030 | 0.4945 | 0.5170 |
| current, margin pow 0.5 | 0.5227 | 0.5111 | 0.5059 | 0.5031 | 0.5174 |
| current, margin pow 0.75 | 0.5208 | 0.5068 | 0.5030 | 0.4969 | 0.5157 |
| current, margin pow 0.33 | 0.5258 | 0.5158 | 0.5095 | 0.5087 | 0.5201 |
| current, margin damped 0.5 | 0.5244 | 0.5140 | 0.5066 | 0.5054 | 0.5171 |
| current, margin none | 0.5385 | 0.5306 | 0.5242 | 0.5261 | 0.5332 |
| new | 0.5249 | 0.5005 | 0.5117 | 0.4849 | 0.5117 |
| new, κ 24 | 0.5193 | 0.5012 | 0.5131 | 0.5009 | 0.5185 |
| new, κ 32 | 0.5164 | 0.4962 | 0.5079 | 0.4909 | 0.5122 |
| new, κ 40 | 0.5173 | 0.4953 | 0.5068 | 0.4858 | 0.5098 |
| new, κ 70 | 0.5402 | 0.5142 | 0.5246 | 0.4930 | 0.5198 |
| new, doubles seed flat | 0.5249 | 0.5005 | 0.5259 | 0.4918 | 0.5303 |
| new, junior ×1 | 0.5151 | 0.4929 | 0.5040 | 0.4839 | 0.5066 |
| new, cross-region ×1 | 0.5084 | 0.4887 | 0.5014 | 0.4739 | 0.5046 |
| new, margin current | 0.5483 | 0.5264 | 0.5296 | 0.4943 | 0.5253 |
| new, margin pow 0.75 | 0.5330 | 0.5103 | 0.5166 | 0.4851 | 0.5157 |
| new, margin pow 0.33 | 0.5244 | 0.4998 | 0.5129 | 0.4886 | 0.5123 |
| new, margin damped 0.5 | 0.5256 | 0.5006 | 0.5131 | 0.4867 | 0.5107 |
| new, margin none | 0.5387 | 0.5125 | 0.5304 | 0.5067 | 0.5260 |
| chess K 16 | 0.5554 | 0.5438 | 0.5637 | 0.5584 | 0.5701 |
| chess K 24 | 0.5404 | 0.5276 | 0.5451 | 0.5398 | 0.5520 |
| chess K 32 | 0.5311 | 0.5172 | 0.5330 | 0.5267 | 0.5398 |
| chess K 40 | 0.5250 | 0.5101 | 0.5245 | 0.5169 | 0.5311 |
| chess K 48 | 0.5211 | 0.5051 | 0.5184 | 0.5092 | 0.5247 |
| chess K 64 | 0.5176 | 0.4997 | 0.5107 | 0.4984 | 0.5167 |
| glicko K | 0.5617 | 0.5810 | 0.5393 | 0.6057 | 0.5673 |
| new, class weights back | 0.5344 | 0.5238 | 0.5207 | 0.5111 | 0.5223 |
| new, class weights back, κ 70 | 0.5318 | 0.5187 | 0.5167 | 0.5041 | 0.5181 |
| best (new, junior ×1, cross-region ×1) | 0.5071 | 0.4888 | 0.5004 | 0.4772 | 0.5044 |
| best, κ 32 | 0.5179 | 0.5029 | 0.5121 | 0.4975 | 0.5174 |
| best, κ 40 | 0.5122 | 0.4958 | 0.5060 | 0.4878 | 0.5107 |
| best, κ 64 | 0.5059 | 0.4866 | 0.4991 | 0.4730 | 0.5027 |
| best, cross-region ×1.5 | 0.5086 | 0.4883 | 0.5000 | 0.4779 | 0.5031 |
| best, margin pow 0.75 | 0.5075 | 0.4881 | 0.4996 | 0.4733 | 0.5044 |
| best, margin pow 0.33 | 0.5090 | 0.4914 | 0.5030 | 0.4816 | 0.5060 |
| best, margin damped 0.5 | 0.5078 | 0.4899 | 0.5013 | 0.4785 | 0.5037 |
| best, margin current | 0.5112 | 0.4908 | 0.5020 | 0.4730 | 0.5072 |
| best, doubles seed flat | 0.5071 | 0.4888 | 0.5142 | 0.4863 | 0.5244 |
| best, no m(r), κ 80 | 0.5084 | 0.4908 | 0.5035 | 0.4840 | 0.5073 |
| best, no m(r), κ 108 | 0.5067 | 0.4872 | 0.4993 | 0.4750 | 0.5028 |
| best, no m(r), κ 135 | 0.5096 | 0.4889 | 0.4998 | 0.4721 | 0.5034 |
| best, κ 80 | 0.5069 | 0.4863 | 0.5000 | 0.4701 | 0.5030 |
| hybrid glicko after 10, ×1 | 0.5551 | 0.5696 | 0.5048 | 0.5022 | 0.5245 |
| hybrid glicko after 10, ×1.5 | 0.5415 | 0.5479 | 0.5041 | 0.4999 | 0.5225 |
| hybrid glicko after 10, ×2 | 0.5383 | 0.5387 | 0.5037 | 0.4980 | 0.5211 |
| hybrid glicko after 30, ×1.5 | 0.5408 | 0.5467 | 0.5042 | 0.4980 | 0.5200 |
| milder levels √ | 0.5136 | 0.4949 | 0.4915 | 0.4799 | 0.5094 |
| milder levels √, junior ×1 | 0.5109 | 0.4911 | 0.4924 | 0.4811 | 0.5076 |
| milder levels ^0.75 | 0.5156 | 0.4972 | 0.4955 | 0.4853 | 0.5115 |
| milder levels ^0.75, junior ×1 | 0.5174 | 0.4996 | 0.4998 | 0.4891 | 0.5120 |
| milder levels √, junior ×1, margin pow 0.75 | 0.5077 | 0.4887 | 0.4908 | 0.4808 | 0.5044 |
| milder levels √, junior ×1.25, margin pow 0.75 | 0.5066 | 0.4872 | 0.4886 | 0.4787 | 0.5041 |
| milder levels ^0.75, margin pow 0.75 | 0.5124 | 0.4952 | 0.4942 | 0.4862 | 0.5090 |
| milder levels ^0.75, junior ×1.25, margin pow 0.75 | 0.5133 | 0.4963 | 0.4961 | 0.4877 | 0.5090 |
| hybrid glicko on best, after 10, ×1 | 0.5140 | 0.5053 | 0.5010 | 0.4809 | 0.5057 |
| hybrid glicko on best, after 10, ×1.5 | 0.5051 | 0.4924 | 0.5005 | 0.4797 | 0.5049 |
| classes: U19A capped at 100% | 0.5130 | 0.4960 | 0.4962 | 0.4875 | 0.5086 |
| classes: U19A 100% | 0.5130 | 0.4960 | 0.4962 | 0.4875 | 0.5086 |
| classes: U19A 95% | 0.5128 | 0.4959 | 0.4963 | 0.4874 | 0.5085 |
| classes: U19A 89% (= SEN B) | 0.5127 | 0.4958 | 0.4964 | 0.4873 | 0.5082 |
| classes: U19A 80% | 0.5125 | 0.4957 | 0.4965 | 0.4872 | 0.5080 |
| classes: U19A 89%, U17A 75% | 0.5126 | 0.4953 | 0.4965 | 0.4870 | 0.5082 |
| classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2) | 0.5127 | 0.4951 | 0.4967 | 0.4868 | 0.5082 |
| classes: no junior weight at all | 0.5159 | 0.4998 | 0.4997 | 0.4910 | 0.5103 |
| classes, today's weights: U19A 100% | 0.5211 | 0.5049 | 0.5031 | 0.4938 | 0.5157 |
| classes, today's weights: U19A 85% (= SEN B) | 0.5206 | 0.5044 | 0.5034 | 0.4936 | 0.5152 |
| adopted, floor 0 (shifted scale) | 0.5122 | 0.4956 | 0.4905 | 0.4756 | 0.5010 |
| adopted, floor 100 (shifted scale) | 0.5110 | 0.4939 | 0.4782 | 0.4569 | 0.4882 |
| adopted, floor 200 (shifted scale) | 0.5062 | 0.4891 | 0.4843 | 0.4539 | 0.4868 |
| milder levels: juniors full weight, junior ×1 | 0.5253 | 0.5022 | 0.5002 | 0.4830 | 0.5137 |

#### Average rating at the end, per pool

| Config | men | women | mensDoubles | womensDoubles | mixedDoubles |
| --- | ---: | ---: | ---: | ---: | ---: |
| current | 1198 | 1201 | 1292 | 1300 | 1320 |
| current, margin pow 0.5 | 1201 | 1205 | 1295 | 1305 | 1323 |
| current, margin pow 0.75 | 1199 | 1202 | 1294 | 1302 | 1321 |
| current, margin pow 0.33 | 1203 | 1207 | 1296 | 1307 | 1324 |
| current, margin damped 0.5 | 1202 | 1206 | 1296 | 1306 | 1324 |
| current, margin none | 1207 | 1212 | 1299 | 1311 | 1328 |
| new | 775 | 772 | 374 | 366 | 381 |
| new, κ 24 | 775 | 770 | 380 | 373 | 381 |
| new, κ 32 | 773 | 768 | 377 | 370 | 379 |
| new, κ 40 | 772 | 768 | 375 | 367 | 379 |
| new, κ 70 | 780 | 780 | 374 | 368 | 387 |
| new, doubles seed flat | 775 | 772 | 386 | 385 | 387 |
| new, junior ×1 | 771 | 767 | 373 | 366 | 377 |
| new, cross-region ×1 | 769 | 766 | 373 | 365 | 379 |
| new, margin current | 773 | 771 | 371 | 362 | 381 |
| new, margin pow 0.75 | 773 | 771 | 372 | 363 | 381 |
| new, margin pow 0.33 | 777 | 775 | 375 | 368 | 383 |
| new, margin damped 0.5 | 777 | 775 | 374 | 368 | 383 |
| new, margin none | 787 | 786 | 380 | 376 | 390 |
| chess K 16 | 790 | 788 | 392 | 389 | 391 |
| chess K 24 | 786 | 784 | 388 | 385 | 388 |
| chess K 32 | 783 | 780 | 386 | 381 | 386 |
| chess K 40 | 780 | 777 | 383 | 377 | 383 |
| chess K 48 | 777 | 774 | 380 | 374 | 381 |
| chess K 64 | 772 | 768 | 376 | 368 | 377 |
| glicko K | 601 | 534 | 293 | 237 | 276 |
| new, class weights back | 778 | 772 | 382 | 377 | 378 |
| new, class weights back, κ 70 | 777 | 770 | 380 | 373 | 376 |
| best (new, junior ×1, cross-region ×1) | 769 | 764 | 374 | 368 | 377 |
| best, κ 32 | 775 | 771 | 381 | 376 | 382 |
| best, κ 40 | 772 | 768 | 378 | 372 | 380 |
| best, κ 64 | 768 | 764 | 372 | 365 | 377 |
| best, cross-region ×1.5 | 770 | 765 | 373 | 366 | 377 |
| best, margin pow 0.75 | 767 | 761 | 372 | 365 | 376 |
| best, margin pow 0.33 | 771 | 767 | 376 | 370 | 379 |
| best, margin damped 0.5 | 770 | 766 | 375 | 369 | 378 |
| best, margin current | 765 | 760 | 371 | 362 | 375 |
| best, doubles seed flat | 769 | 764 | 386 | 384 | 386 |
| best, no m(r), κ 80 | 778 | 775 | 380 | 376 | 382 |
| best, no m(r), κ 108 | 773 | 770 | 376 | 370 | 379 |
| best, no m(r), κ 135 | 768 | 765 | 372 | 365 | 375 |
| best, κ 80 | 769 | 764 | 371 | 363 | 377 |
| hybrid glicko after 10, ×1 | 1163 | 1143 | 1289 | 1294 | 1311 |
| hybrid glicko after 10, ×1.5 | 1173 | 1158 | 1290 | 1295 | 1313 |
| hybrid glicko after 10, ×2 | 1182 | 1172 | 1290 | 1297 | 1315 |
| hybrid glicko after 30, ×1.5 | 1178 | 1164 | 1291 | 1297 | 1315 |
| milder levels √ | 1197 | 1199 | 1288 | 1292 | 1320 |
| milder levels √, junior ×1 | 1197 | 1199 | 1290 | 1296 | 1320 |
| milder levels ^0.75 | 1197 | 1199 | 1290 | 1296 | 1319 |
| milder levels ^0.75, junior ×1 | 1198 | 1201 | 1292 | 1300 | 1320 |
| milder levels √, junior ×1, margin pow 0.75 | 1198 | 1201 | 1291 | 1299 | 1321 |
| milder levels √, junior ×1.25, margin pow 0.75 | 1198 | 1200 | 1290 | 1296 | 1321 |
| milder levels ^0.75, margin pow 0.75 | 1198 | 1201 | 1292 | 1299 | 1321 |
| milder levels ^0.75, junior ×1.25, margin pow 0.75 | 1199 | 1201 | 1293 | 1300 | 1321 |
| hybrid glicko on best, after 10, ×1 | 745 | 730 | 371 | 362 | 369 |
| hybrid glicko on best, after 10, ×1.5 | 757 | 745 | 372 | 364 | 372 |
| classes: U19A capped at 100% | 1199 | 1201 | 1293 | 1300 | 1321 |
| classes: U19A 100% | 1199 | 1201 | 1293 | 1300 | 1321 |
| classes: U19A 95% | 1199 | 1201 | 1293 | 1301 | 1321 |
| classes: U19A 89% (= SEN B) | 1199 | 1201 | 1293 | 1301 | 1321 |
| classes: U19A 80% | 1199 | 1201 | 1293 | 1301 | 1321 |
| classes: U19A 89%, U17A 75% | 1199 | 1201 | 1293 | 1301 | 1321 |
| classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2) | 1199 | 1201 | 1293 | 1301 | 1321 |
| classes: no junior weight at all | 1200 | 1202 | 1294 | 1302 | 1322 |
| classes, today's weights: U19A 100% | 1198 | 1200 | 1293 | 1300 | 1320 |
| classes, today's weights: U19A 85% (= SEN B) | 1198 | 1200 | 1293 | 1300 | 1320 |
| adopted, floor 0 (shifted scale) | 1199 | 1202 | 1297 | 1307 | 1325 |
| adopted, floor 100 (shifted scale) | 1201 | 1204 | 1320 | 1333 | 1344 |
| adopted, floor 200 (shifted scale) | 1206 | 1213 | 1374 | 1387 | 1391 |
| milder levels: juniors full weight, junior ×1 | 1201 | 1204 | 1290 | 1292 | 1328 |
