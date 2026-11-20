// EloStonk's squad rules for variety, in step with the database's check_picks (supabase/migrations/
// *_stonk_rules_leagues_standings.sql, the stonk_max_per_club setting), which decides: at most MAX_PER_CLUB players from
// one club (players without a club don't count) and at least one man and one woman. Squads saved before the rules keep
// playing until changed, so the picker only checks them when saving.
import type { StonkPlayer } from "@/components/elostonk/useStonk";

export const MAX_PER_CLUB = 2;

type Rated = Pick<StonkPlayer, "club" | "gender">;

/** How many players of a squad are from each club */
export function clubCounts(players: Rated[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of players) if (p.club) counts.set(p.club, (counts.get(p.club) ?? 0) + 1);
  return counts;
}

/** What a squad breaks: the clubs over the limit, and the genders missing (only once the squad is full) */
export function squadProblems(players: Rated[], full: boolean): { clubs: string[]; missing: ("M" | "K")[] } {
  const clubs = [...clubCounts(players)].filter(([, n]) => n > MAX_PER_CLUB).map(([club]) => club);
  const missing = full ? (["M", "K"] as const).filter((g) => !players.some((p) => p.gender === g)) : [];
  return { clubs, missing };
}

/** Whether a squad follows the rules (for the team of the round) */
export const followsRules = (players: Rated[]) => {
  const { clubs, missing } = squadProblems(players, true);
  return !clubs.length && !missing.length;
};
