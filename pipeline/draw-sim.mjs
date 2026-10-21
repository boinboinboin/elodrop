// Monte Carlo simulation of one tournament event's draw (groups and knockout), with each match
// won by the expected score from the entries' ratings. Used by upcoming.mjs for draw luck.
//
// An event is a list of draw slots and:
// - groups: [{ name, slots: [slot, ...], matches: [[slot, slot, match no], ...] }]: each group is
//   played as listed (round robin if no matches are listed) and ranked by wins, ties drawn at random;
// - stages: [{ title, main, matches: [{ no, sides: [source, source] }] }]: knockout matches in
//   playing order. A source is { slot }, { winnerOf: match no }, { loserOf: match no } (a play-off
//   for third), { group, rank } (e.g. the group
//   winner, "Vinner av Pulje 3"), { bestOfRank } (the best of the groups' runners-up, "Nr. 2 fra
//   Pulje X": most group wins, ties at random) or null; a match with one side missing is a
//   walkover (no win).
//   A stage can have `places` [first, last]: the places it decides ("1-4 plassen"). Its winner
//   gets the first, the loser of its final the next, the losers one level earlier share the next
//   two (3rd–4th: 3.5 each, unless a play-off for third decides them), and so on. When every entry
//   ends in such a stage (as in the X classes: two groups of four, the top two to the 1–4 places,
//   the third-placed playing for 5th and the last for 7th), each entry gets an expected placement.
// The event winner wins the main stage's final: the match the most other matches lead to (not
// simply the last one listed, which can be a play-off for third), or the only group if there is
// no stage.
//
// Entry e plays from slot e in the actual draw. In a redraw, the seeds (by default the strongest
// entries by rating; upcoming.mjs passes the official seeding) are placed by the rules (see
// seedPositions) and everyone else is shuffled over the other slots.
import { expectedScore } from "./rules.mjs";

// Seeds by the number of entries (NBF's rules, as BWF's: 2 below 16, 4 from 16, 8 from 32, 16 from
// 64, 32 from 128); in group events also at most one per group. The organisers' group draws agree:
// seeds 3 and 4 are kept apart from 16 entries, but below 16 only seeds 1 and 2.
export function seedCount(event) {
  const n = event.slots;
  const count = n < 16 ? 2 : n < 32 ? 4 : n < 64 ? 8 : n < 128 ? 16 : 32;
  return event.groups.length > 1 ? Math.min(count, event.groups.length) : count;
}

// The main knockout as a tree, top of the draw first: a match is { sides: [node, node] }, a place
// in the draw { leaf } and an empty side null. The leaves are slots in a knockout, or groups (their
// index) in a group event: the places their winners go to. With no such knockout, the groups (or
// slots) in order, as a balanced tree.
function drawTree(event) {
  const grouped = event.groups.length > 1;
  const main = event.stages.find((s) => s.main);
  const byNo = new Map((main?.matches ?? []).map((m) => [m.no, m]));
  const finalNo = main ? stageLevels(main).finalNo : null;
  const node = (src, depth = 0) =>
    !src || depth > 12 ? null
    : src.winnerOf !== undefined ? (byNo.has(src.winnerOf) ? { sides: byNo.get(src.winnerOf).sides.map((x) => node(x, depth + 1)) } : null)
    : grouped ? (src.group !== undefined && src.rank === 1 ? { leaf: src.group } : null)
    : src.slot !== undefined ? { leaf: src.slot }
    : null;
  const tree = finalNo !== null ? node({ winnerOf: finalNo }) : null;
  if (tree && leaves(tree).length >= 2) return tree;
  const balanced = (list) => (list.length === 1 ? { leaf: list[0] } : { sides: [balanced(list.slice(0, Math.ceil(list.length / 2))), balanced(list.slice(Math.ceil(list.length / 2)))] });
  return balanced(grouped ? event.groups.map((_, i) => i) : [...Array(event.slots).keys()]);
}
const leaves = (node) => (!node ? [] : node.leaf !== undefined ? [node.leaf] : node.sides.flatMap(leaves));
// The draw cut into 2^depth equal parts, top first: each part's leaves. A leaf higher up (an entry
// with a bye) fills every part under it.
const parts = (node, depth) =>
  depth === 0 ? [leaves(node)]
  : !node ? Array(2 ** depth).fill([])
  : node.leaf !== undefined ? Array(2 ** depth).fill([node.leaf])
  : node.sides.flatMap((side) => parts(side, depth - 1));

// Where the seeds go, by the rules: per tier of seeds (1–2, 3–4, 5–8, 9–16, 17–32) the leaves
// they're drawn into. Seed 1 at the top of the draw and seed 2 at the bottom; seeds 3 and 4 drawn
// into the top of the second quarter and the bottom of the third; seeds 5–8 into the eighths
// without a seed, 9–16 the sixteenths and so on, each at the end away from the seed next to it
// (as BWF's draw of 32: 5–8 at 8, 16, 17 and 25).
export function seedPositions(event, count = seedCount(event)) {
  const tree = drawTree(event);
  const all = leaves(tree);
  if (count < 1 || !all.length) return [];
  const tiers = [[...new Set([all[0], all.at(-1)])]];
  const taken = new Set(tiers[0]);
  for (let depth = 2; 2 ** (depth - 1) < count; depth++) {
    const tier = new Set();
    parts(tree, depth).forEach((part, i) => {
      if (!part.length || part.some((leaf) => taken.has(leaf))) return;
      const top = depth === 2 ? i === 1 : i % 2 === 0;
      tier.add(top ? part[0] : part.at(-1));
    });
    for (const leaf of tier) taken.add(leaf);
    tiers.push([...tier]);
  }
  // Leaves as slots: a group's seed plays from its first slot
  return tiers.map((tier) => tier.map((leaf) => (event.groups.length > 1 ? event.groups[leaf].slots[0] : leaf)));
}

// The most rounds an entry can get (see simulate's `progress`): the event winner's. With a
// knockout: out of the group (if there are groups), every level up to the final, and winning it;
// the same for everyone, as a bye counts as a round. In groups only: the matches in the biggest group.
export function maxRounds(event) {
  const main = event.stages.find((s) => s.main);
  if (!main) return Math.max(0, ...event.groups.map((g) => g.slots.length - 1));
  const byNo = new Map(main.matches.map((m) => [m.no, m]));
  const depth = (m) => Math.max(0, ...m.sides.map((src) => (src?.winnerOf !== undefined && byNo.has(src.winnerOf) ? 1 + depth(byNo.get(src.winnerOf)) : 0)));
  const fed = new Set(main.matches.flatMap((m) => m.sides.map((src) => src?.winnerOf)).filter(Boolean));
  const top = Math.max(...main.matches.filter((m) => !fed.has(m.no)).map(depth));
  return (event.groups.length ? 1 : 0) + top + 1;
}

// A knockout stage's levels: its final 0 (the match the most other matches lead to), the matches
// feeding it 1, and so on; `thirdNo`: a play-off for third (both sides losers of level-1 matches)
function stageLevels(stage) {
  const byNo = new Map(stage.matches.map((m) => [m.no, m]));
  const feeders = (m) => m.sides.reduce((sum, src) => sum + (src?.winnerOf !== undefined && byNo.has(src.winnerOf) ? 1 + feeders(byNo.get(src.winnerOf)) : 0), 0);
  const fed = new Set(stage.matches.flatMap((m) => m.sides.map((src) => src?.winnerOf)).filter(Boolean));
  const final = stage.matches.filter((m) => !fed.has(m.no)).map((m) => [m, feeders(m)]).sort((a, b) => b[1] - a[1])[0]?.[0];
  const level = new Map();
  if (!final) return { level, finalNo: null, top: 0, thirdNo: null };
  level.set(final.no, 0);
  for (let i = stage.matches.length - 1; i >= 0; i--) {
    const m = stage.matches[i];
    if (!level.has(m.no)) continue;
    for (const src of m.sides) if (src?.winnerOf !== undefined) level.set(src.winnerOf, level.get(m.no) + 1);
  }
  const third = stage.matches.find((m) => m.sides.every((src) => src?.loserOf !== undefined && level.get(src.loserOf) === 1));
  return { level, finalNo: final.no, top: Math.max(0, ...level.values()), thirdNo: third?.no ?? null };
}

const shuffle = (list, random) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

// Small fast seeded generator, so runs are repeatable (mulberry32)
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Per entry over `runs` simulations: expected match wins, the chances of winning their group,
// reaching the main knockout stage and winning the event, and `progress`: the expected number of
// rounds they get through. A round is a level of the main knockout counted back from the final
// (reaching the semi-final is one round more than the quarter-final, winning one more than the
// final), so a bye counts as a round got through; with no knockout, progress is the match wins.
// With `redraw`, every run first redraws the entries as above: `seeding` is the seeds, best first
// (by default the strongest entries by rating, as many as seedCount). With `forced` (a played draw's
// results: { winners: { match no: 1 | 2 }, groupOrder: [[slot, ...] per group] }, or for results
// known only by who beat whom, { pairs: Map("entry|entry" → winning entry) }), the matches go as
// they did: one run gives each entry's actual outcome.
// With `withdrawn` (Map entry → match no), an entry that withdrew loses every match from that one
// on (numbered after it; generated round-robin matches have no number and count as after).
export function simulate(event, ratings, { runs = 20000, redraw = false, seeding = null, seed = 1, forced = null, withdrawn = null } = {}) {
  const n = event.slots;
  const random = rng(seed);
  // chance[a][b]: entry a beats entry b
  const chance = ratings.map((ra) => ratings.map((rb) => expectedScore(ra, rb)));
  const seeds = seeding ?? [...ratings.keys()].sort((a, b) => ratings[b] - ratings[a]).slice(0, seedCount(event));
  // Each tier of seeds with the slots it's drawn into (seeds 1 and 2 not drawn: top and bottom)
  const positions = redraw ? seedPositions(event, seeds.length) : [];
  const tiers = positions.map((slots, t) => ({ seeds: seeds.slice(t && 2 ** t, 2 ** (t + 1)), slots }));
  const totals = ratings.map(() => ({ wins: 0, groupWin: 0, knockout: 0, win: 0, groupRank: 0 }));
  const groupMatches = event.groups.map((g) =>
    g.matches?.length ? g.matches : g.slots.flatMap((a, i) => g.slots.slice(i + 1).map((b) => [a, b, null]))
  );
  const main = event.stages.find((s) => s.main);
  const levels = new Map(event.stages.map((stage) => [stage, stageLevels(stage)]));
  const { level, finalNo, top } = main ? levels.get(main) : { level: new Map(), finalNo: null, top: 0 };
  const placed = event.stages.filter((s) => s.places);
  const placements = new Float64Array(ratings.length);
  let placedRuns = 0;
  const progress = new Float64Array(ratings.length);

  const atSlot = [...Array(n).keys()]; // entry playing from each slot
  for (let run = 0; run < runs; run++) {
    if (redraw) {
      // The seeds into their places (a tier with more places than seeds takes some at random; seeds
      // left without one are drawn as the others), then everyone else over the free slots
      const placed = new Set();
      const used = new Set();
      for (const [t, tier] of tiers.entries()) {
        const slots = t ? shuffle(tier.slots.slice(), random) : tier.slots;
        const order = t ? shuffle(tier.seeds.slice(), random) : tier.seeds;
        for (let k = 0; k < Math.min(order.length, slots.length); k++) {
          atSlot[slots[k]] = order[k];
          placed.add(order[k]);
          used.add(slots[k]);
        }
      }
      const rest = shuffle([...Array(n).keys()].filter((e) => !placed.has(e)), random);
      let k = 0;
      for (let slot = 0; slot < n; slot++) if (!used.has(slot)) atSlot[slot] = rest[k++];
    }
    const play = (a, b, no) => {
      const side = forced?.winners?.[no];
      const known = forced?.pairs?.get(`${a}|${b}`) ?? forced?.pairs?.get(`${b}|${a}`);
      const out = (e) => {
        const from = withdrawn?.get(e);
        return from !== undefined && (no === null || no === undefined || +no >= from);
      };
      const walkover = !side && known === undefined && out(a) !== out(b) ? (out(a) ? b : a) : null;
      const winner = side === 1 ? a : side === 2 ? b : known !== undefined ? known : walkover ?? (random() < chance[a][b] ? a : b);
      totals[winner].wins++;
      return winner;
    };

    // Groups: ranked by wins, ties at random
    const groupWins = new Map(); // entry -> wins in its group
    const ranking = event.groups.map((g, gi) => {
      const wins = new Map(g.slots.map((s) => [atSlot[s], 0]));
      for (const [x, y, no] of groupMatches[gi]) {
        const w = play(atSlot[x], atSlot[y], no);
        wins.set(w, wins.get(w) + 1);
      }
      for (const [e, w] of wins) groupWins.set(e, w);
      const order = forced?.groupOrder?.[gi]
        ? forced.groupOrder[gi].map((s) => atSlot[s])
        : [...wins.keys()].map((e) => [e, wins.get(e) + random() * 0.5]).sort((p, q) => q[1] - p[1]).map(([e]) => e);
      if (order.length) totals[order[0]].groupWin++;
      order.forEach((e, i) => (totals[e].groupRank += i + 1));
      return order;
    });

    // The best entry ranked `rank` in its group, by group wins (ties at random), once per run
    const bestCache = new Map();
    const bestOfRank = (rank) => {
      if (!bestCache.has(rank)) {
        const candidates = ranking.map((order) => order[rank - 1]).filter((e) => e !== undefined);
        bestCache.set(rank, candidates.map((e) => [e, groupWins.get(e) + random() * 0.5]).sort((p, q) => q[1] - p[1])[0]?.[0] ?? null);
      }
      return bestCache.get(rank);
    };

    // Knockout stages
    let winner = event.stages.length ? null : event.groups.length === 1 ? ranking[0][0] : null;
    const winners = new Map(); // match no -> entry
    const losers = new Map(); // match no -> entry
    const place = new Map(); // entry -> placement this run
    const deepest = new Map(); // entry -> lowest main-stage level reached
    for (const stage of event.stages) {
      const reached = new Set();
      let last = null;
      for (const m of stage.matches) {
        const [a, b] = m.sides.map((src) =>
          !src ? null
          : src.slot !== undefined ? atSlot[src.slot]
          : src.winnerOf !== undefined ? winners.get(src.winnerOf) ?? null
          : src.loserOf !== undefined ? losers.get(src.loserOf) ?? null
          : src.bestOfRank !== undefined ? bestOfRank(src.bestOfRank)
          : ranking[src.group]?.[src.rank - 1] ?? null
        );
        for (const e of [a, b]) {
          if (e === null) continue;
          reached.add(e);
          if (stage === main && level.has(m.no)) deepest.set(e, Math.min(deepest.get(e) ?? Infinity, level.get(m.no)));
        }
        last = a !== null && b !== null ? play(a, b, m.no) : a ?? b;
        winners.set(m.no, last);
        const loser = last === a ? b : a;
        losers.set(m.no, loser);
        // Placement: the loser of a match at level L shares places first + 2^L .. first + 2^(L+1) − 1
        const { level: stageLevel, finalNo: stageFinal, thirdNo } = levels.get(stage);
        if (stage.places && loser !== null) {
          const [first, last_] = stage.places;
          if (m.no === thirdNo) place.set(loser, Math.min(first + 3, last_));
          else if (stageLevel.has(m.no) && !(thirdNo && stageLevel.get(m.no) === 1)) {
            const l = stageLevel.get(m.no);
            const from = first + 2 ** l;
            const to = Math.min(last_, first + 2 ** (l + 1) - 1);
            place.set(loser, (from + to) / 2);
          }
        }
        if (stage.places && m.no === thirdNo && last !== null) place.set(last, stage.places[0] + 2);
        if (stage.places && m.no === stageFinal && last !== null) place.set(last, stage.places[0]);
      }
      if (stage === main) {
        for (const e of reached) totals[e].knockout++;
        winner = winners.get(finalNo) ?? null;
      }
    }
    if (winner !== null) totals[winner].win++;
    if (main) {
      for (const [e, l] of deepest) progress[e] += top - l;
      if (winner !== null) progress[winner]++;
    }
    // Anyone left unplaced (e.g. withdrawn, with a walkover for their opponent) shares the places
    // left over
    if (placed.length && place.size && place.size < n) {
      const taken = new Set();
      for (const p of place.values()) for (let k = Math.ceil(p - 0.5); k <= Math.floor(p + 0.5); k++) taken.add(k);
      const free = [...Array(n).keys()].map((k) => k + 1).filter((k) => !taken.has(k));
      const share = free.length ? free.reduce((a, b) => a + b, 0) / free.length : n;
      for (let e = 0; e < n; e++) if (!place.has(e)) place.set(e, share);
    }
    if (placed.length && place.size === n) {
      for (const [e, p] of place) placements[e] += p;
      placedRuns++;
    }
  }
  return totals.map((t, e) => ({
    wins: t.wins / runs,
    groupWin: t.groupWin / runs,
    knockout: t.knockout / runs,
    win: t.win / runs,
    // Expected place in the group (with `forced`: the actual one); null outside groups
    groupRank: event.groups.length ? t.groupRank / runs || null : null,
    progress: main ? progress[e] / runs + (event.groups.length ? t.knockout / runs : 0) : t.wins / runs,
    // Expected placement, when every entry is placed (null otherwise)
    place: placed.length && placedRuns === runs ? placements[e] / runs : null,
  }));
}
