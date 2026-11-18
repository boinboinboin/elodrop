// EloStonk's rounds (in step with pipeline/elostonk.mjs and the database's stonk_round_of): a round is known by its
// Friday, runs to the next Thursday (Norwegian days) and locks at that Friday 00:00 in Norway.

/** Today in Norway ("2026-11-18") */
export const osloToday = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
/** A day moved by `n` days */
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** The round a day is in: its Friday */
export function roundOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday - 5 + 7) % 7));
}
/** The round under way (locked), and the next one (squads are saved for it) */
export const currentRound = (now = new Date()) => roundOf(osloToday(now));
export const nextRound = (now = new Date()) => addDays(currentRound(now), 7);
/** The moment a round locks: its Friday 00:00 in Norway */
export function lockOf(round: string): Date {
  // Norway is UTC+1 or +2: find the offset at that day's noon, then 00:00 local
  const noon = new Date(`${round}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
  const offset = local.getTime() - new Date(noon.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(Date.parse(`${round}T00:00:00Z`) - offset);
}
/** The season a round is in: it starts in July */
export const seasonOfRound = (round: string) => (+round.slice(5, 7) >= 7 ? +round.slice(0, 4) : +round.slice(0, 4) - 1);
