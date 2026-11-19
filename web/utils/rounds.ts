// EloStonk's rounds (in step with pipeline/elostonk.mjs and the database's stonk_round_of): a round is known by its
// Friday, runs to the next Thursday (Norwegian days: its matches) and locks at that Friday 14:00 in Norway (LOCK_HOUR).

/** Today in Norway ("2026-11-18") */
export const osloToday = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
/** A day moved by `n` days */
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** The round a day is in: its Friday */
export function roundOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday - 5 + 7) % 7));
}
/** The hour (Norwegian time) a round locks on its Friday */
export const LOCK_HOUR = 14;
/**
 * The round under way (locked), and the next one (squads are saved for it): the Friday of the moment LOCK_HOUR hours
 * earlier (a clock change is always on a Sunday, so never in between)
 */
export const currentRound = (now = new Date()) => roundOf(osloToday(new Date(now.getTime() - LOCK_HOUR * 3_600_000)));
export const nextRound = (now = new Date()) => addDays(currentRound(now), 7);
/** The moment a round locks: its Friday 14:00 in Norway */
export function lockOf(round: string): Date {
  // Norway is UTC+1 or +2: find the offset at that day's noon, then LOCK_HOUR local
  const noon = new Date(`${round}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
  const offset = local.getTime() - new Date(noon.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(Date.parse(`${round}T00:00:00Z`) + LOCK_HOUR * 3_600_000 - offset);
}
/** The season a round is in: it starts in July */
export const seasonOfRound = (round: string) => (+round.slice(5, 7) >= 7 ? +round.slice(0, 4) : +round.slice(0, 4) - 1);
