// Shapes of the files written by pipeline/export.mjs (see its header for the layout).

export type Pool = "men" | "women" | "mensDoubles" | "womensDoubles" | "mixedDoubles";
export type Gender = "M" | "K";

export interface PlayerRef {
  id: number;
  name: string;
  rating: number;
  /** In a match: the club they played for at the time (missing in exports from before it was added) */
  club?: string | null;
}

/** A player's standing in one pool (ratings.json pools[pool][i]) */
export interface RatingEntry {
  rank: number | null;
  /** The rank at the end of last week (null: not ranked then; missing in older exports) */
  previousRank?: number | null;
  /** The rating gained or lost since the end of last week (null: started this week) */
  ratingChange?: number | null;
  id: number;
  rating: number;
  rd: number;
  start: number;
  peak: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  firstPlayed: string;
  firstWeek: string;
  name: string;
  lastPlayed: string;
  club: string | null;
  gender: Gender | null;
  genderInferred?: boolean;
  active: boolean;
  plusMinus: number;
}

/** A player in the junior rankings (junior/<pool>.json): from junior matches only, ranked players only */
export type JuniorEntry = Pick<RatingEntry, "rank" | "previousRank" | "ratingChange" | "id" | "name" | "club" | "gender" | "rating" | "rd" | "plusMinus" | "peak" | "matches" | "wins" | "draws" | "losses" | "firstPlayed" | "lastPlayed"> & {
  rank: number;
  birthYear: number;
};

/** A player in a combined ranking (rankings/combined-<men|women>.json, junior/combined-<...>.json) */
export interface CombinedEntry {
  rank: number;
  previousRank: number | null;
  id: number;
  name: string;
  club: string | null;
  gender: Gender;
  /** The average standard score in the three disciplines */
  score: number;
  /** Matches played in the disciplines ranked in, together */
  matches: number;
  lastPlayed: string;
  /**
   * Singles, doubles and mixed doubles: the rank and rating in each; an inactive rating counted has rank null and the day
   * last played; null: no rating counted (a discipline counted as their weaker one)
   */
  pools: Partial<Record<Pool, { rank: number | null; rating: number; lastPlayed?: string } | null>>;
}

export interface SeasonRow {
  season: number;
  rating: number;
  club: string | null;
  rank: number | null;
  ranked: number | null;
}

/** Weekly history: values[i] is the value at the end of week i from `from` (a Monday) */
export interface History {
  from: string;
  ratings: (number | null)[];
  clubs: [number, string][];
  ranks?: (number | null)[];
  rankCounts?: number[];
  seasons?: SeasonRow[];
}

export interface Match {
  day: string;
  event: string;
  key?: string;
  partner: PlayerRef | null;
  opponents: PlayerRef[];
  rating: number;
  change: number;
  result: number;
  winChance: number;
  score: string;
  // Added for head to head
  pool?: Pool;
  poolLabel?: string;
  setsFor?: number | null;
  setsAgainst?: number | null;
  pointsFor?: number | null;
  pointsAgainst?: number | null;
  margin?: number | null;
}

/** A rival over all disciplines (pipeline/rate.mjs): the opponent with the closest matches */
export interface Rival {
  /** With their club now */
  opponent: Pick<PlayerRef, "id" | "name" | "club">;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  margin: number;
  lastPlayed: string;
  /** The meetings per discipline */
  pools: Partial<Record<Pool, number>>;
}

export interface MatchLog {
  /** The newest matches (all of them in exports before the split; see getPlayerMatches) */
  all: Match[];
  /** How many matches there are in all */
  count?: number;
  biggestWins: Match[];
  biggestLosses: Match[];
  biggestGains: Match[];
  biggestDrops: Match[];
}

export interface PlayerPool extends RatingEntry {
  label: string;
  history: History | null;
  matchLog: MatchLog | null;
}

export interface Player {
  id: number;
  name: string;
  club: string | null;
  /** From their profile on badmintonportalen (null: not shown there; missing in older exports) */
  birthYear?: number | null;
  /** The closest rivals over all disciplines (missing in exports from before they were) */
  rivals?: Rival[];
  /** In page order: the player's own gender's disciplines first */
  pools: Partial<Record<Pool, PlayerPool>>;
}

export interface ClubTopPlayer {
  id: number;
  name: string;
  rating: number;
  gender: Gender | null;
}

export interface ClubStanding {
  rank: number;
  /** The rank at the end of last week (null: not ranked then; missing in older exports) */
  previousRank?: number | null;
  /** The strength gained or lost since the end of last week */
  strengthChange?: number | null;
  club: string;
  strength: number;
  players: number;
  top: ClubTopPlayer[][];
}

export interface CombinedClubStanding {
  rank: number;
  previousRank?: number | null;
  club: string;
  score: number;
  players: number;
  pools: Partial<Record<Pool, { rank: number; strength: number; players: number }>>;
}

export interface ClubStrengthRule {
  slots: number;
  pairs?: "doubles" | "mixed" | null;
  weights: number[];
}

export interface ClubsFile {
  generatedAt: string;
  clubs: Record<Pool, ClubStanding[]> & { combined: CombinedClubStanding[] };
  clubStrength: Record<Pool, ClubStrengthRule>;
}

export interface ClubHistoryPool {
  from: string;
  strength: (number | null)[];
  rank: (number | null)[];
  clubs: (number | null)[];
  seasons?: { season: number; strength: number | null; rank: number | null; clubs: number | null }[];
  /** The players or pairs counted, as periods [week index, [[id], [id, id], ...]] (best first) */
  top?: [number, number[][]][];
}

export interface ClubHistory {
  /** Names of the players counted (in `top`), by id */
  players: Record<string, string>;
  pools: Partial<Record<Pool | "combined", ClubHistoryPool>>;
}

export interface Meta {
  /** When the ratings were calculated */
  generatedAt: string;
  /** When the pipeline finished building the site's data (missing in exports from before it was added) */
  updatedAt?: string;
  pools: Record<Pool, string>;
  eliteserien: { current: string | null; seasons: string[] };
  tournamentLinks: Record<string, number>;
  players: number;
}

export interface UpsetPlayer extends PlayerRef {
  change?: number;
  club: string | null;
}

export interface Upset {
  day: string;
  pool: Pool;
  poolLabel?: string;
  event: string;
  key?: string;
  winChance: number;
  winners: UpsetPlayer[];
  losers: UpsetPlayer[];
  score: string;
}

export interface UpsetWeek {
  week: string;
  matches: Upset[];
}

// ---- Tournament draws (pipeline/upcoming.mjs) ----

export interface Chances {
  wins: number;
  groupWin: number;
  knockout: number;
  win: number;
  groupRank: number | null;
  progress: number;
  place: number | null;
}

export interface Luck {
  wins: number;
  groupWin: number;
  knockout: number;
  win: number;
  progress: number;
  place?: number;
  score: number;
  draw?: number;
  withdrawals?: number;
}

export interface EntryPlayer {
  id: number | null;
  name: string;
  club: string | null;
  matchedBy: string | null;
  rating: number;
  rank: number | null;
  estimated: boolean;
}

export interface Entry {
  players: EntryPlayer[];
  rating: number;
  /** Official ranking points for the seeding (a pair: the sum); null without (or no list) */
  points?: number | null;
  group: number | null;
  actual: Chances;
  fair: Chances;
  luck: Luck | null;
  result: Chances | null;
  after: Chances | null;
  fairAfter: Chances | null;
  withdrew: boolean;
}

export interface TournamentEvent {
  className: string;
  discipline: string;
  pool: Pool;
  poolLabel?: string;
  title: string;
  /** The seeds (entry indices), best first */
  seeds: number[];
  /** What the seeds are by: the official ranking points, or (without a list) the ratings */
  seededBy?: "ranking" | "rating";
  groups: { name: string; number: number; entries: number[]; rating: number }[];
  knockout: boolean;
  stages: { title: string; main: boolean; places: [number, number] | null }[];
  maxRounds: number;
  singleGroup: boolean;
  noLuck?: boolean;
  placement: boolean;
  advance: { ranks: number[]; best: number[] };
  played: boolean;
  /**
   * The main knockout's final once the event is played (missing in older exports; null without one): the winner's and
   * the runner-up's entry indices, and each set's points from the winner's side, or a walkover
   */
  final?: { winner: number; runnerUp: number; walkover: boolean; sets: [number, number][] } | null;
  /** Played: the rating each of the winner's players gained or lost in the tournament's week (null: no rating before) */
  winnerRatingChange?: (number | null)[] | null;
  entries: Entry[];
  unknownPlaceholders: string[];
}

export interface LuckSums {
  n: number;
  xx: number;
  xy: number;
  yy: number;
}

export interface Evaluation {
  events: number;
  winners: number;
  favouritesWon: number;
  favouritesExpected: number;
  winnerChance: number;
  logLoss: number;
  luck: { rounds: LuckSums; places: LuckSums };
}

export interface Tournament {
  cup2000Id: number;
  portalenId: number | null;
  name: string;
  cancelled: string | null;
  startDate: string | null;
  endDate: string | null;
  /** The registration deadline, and the ranking list version the seeding is from */
  deadline?: string | null;
  rankingVersion?: string | null;
  fetchedAt: string;
  runs: number;
  events: TournamentEvent[];
  evaluation: Evaluation;
  unmatched: string[];
}

export interface TournamentSummary extends Omit<Tournament, "events" | "unmatched"> {
  events: number;
  entries: number;
  played: number;
}

export interface TournamentsIndex {
  generatedAt: string;
  evaluation: Evaluation;
  tournaments: TournamentSummary[];
}

/** A club's content (CMS): short name, full name, region, website, NBF id and logo */
export interface ClubEntry {
  title: string;
  slug: string;
  fullName: string | null;
  region: string | null;
  website: string | null;
  nbfClubId: number | null;
  logo: string | null;
}

export * from "./head-to-head";

// The Eliteserien files are large and only read by their own pages, so they are typed loosely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;
