// What the account code shares with pages that never load it: whether accounts are on, the age limit, and the types of
// the account's rows (supabase/migrations).

/** Accounts are on where the site has a Supabase project (utils/supabase.ts) */
export const ACCOUNTS = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * The youngest age for an account. The same as the database's `min_age` setting, which checks the birth year again.
 * 15: Norway's age for consenting on one's own is 13 today, and 15 is proposed; from 15 no parent's consent is needed
 * either way.
 */
export const MIN_AGE = 15;

/** Whole years from a birth date ("2010-05-31") to `today` */
export function ageOn(birthDate: string, today = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  const age = today.getFullYear() - y;
  const birthdayPassed = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  return birthdayPassed ? age : age - 1;
}

/** Where the session is kept in the browser (utils/supabase.ts): the account code is loaded only when it's there */
export const STORAGE_KEY = "elodrop-auth";

/**
 * When the age gate refused a birth date in this browser, kept for a day, so another date isn't simply tried at once
 * (for a day only: a parent on the same device can still make their own account after)
 */
const TOO_YOUNG_KEY = "elodrop-too-young";
const TOO_YOUNG_HOURS = 24;

export function refusedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(TOO_YOUNG_KEY));
    return at > 0 && Date.now() - at < TOO_YOUNG_HOURS * 3_600_000;
  } catch {
    return false;
  }
}

export function rememberRefusal() {
  try {
    localStorage.setItem(TOO_YOUNG_KEY, String(Date.now()));
  } catch {
    // Not kept: the database refuses the year anyway
  }
}

export interface Profile {
  user_id: string;
  nickname: string;
  birth_year: number;
  player_id: number | null;
  player_claimed_at: string | null;
  can_report: boolean;
  /** Set by the owner (the dashboard): suggestions shown at once and not limited, reports and the claim without the waits */
  trusted: boolean;
  /** When the username last changed (null: never since sign-up; the next change is then free) */
  nickname_changed_at: string | null;
  created_at: string;
}

export type FollowKind = "player" | "club";

/** How long after a claim before it may change, and before an error report may be sent about it (as the database) */
export const CLAIM_LOCK_DAYS = 30;
/** How often the username may change, after a first free change (as the database) */
export const USERNAME_LOCK_DAYS = 30;
/** A username: 3–20 letters (accented ones too), digits, _ . or - (the database's profiles_username_format) */
export const USERNAME_PATTERN = "[A-Za-z0-9ÆØÅæøåÄÖÜäöüÉéÈèÊêÁáÀàÓóÒòÍíÚúÑñÇç_.\\-]{3,20}";
export const REPORT_CLAIM_DAYS = 14;
export const REPORT_ACCOUNT_DAYS = 30;

/** The database's refusals (raise exception '<code>' in supabase/migrations), for their messages */
export const ACCOUNT_ERRORS = [
  "too_young",
  "nickname_blocked",
  "nickname_taken",
  "claim_too_soon",
  "account_too_new",
  "too_many_pending",
  "reports_off",
  "reports_blocked",
  "not_your_player",
  "report_open",
  "too_many_reports",
  "player_reported",
  // EloStonk (supabase/migrations/*_elostonk.sql)
  "squad_invalid",
  "not_eligible",
  "too_many_from_club",
  "needs_both_genders",
  "no_profile",
  "league_not_found",
  "league_full",
  "too_many_leagues",
  "not_owner",
  "too_many_tries",
  "too_fast",
  "name_blocked",
  "username_too_soon",
  "username_invalid",
] as const;
export type AccountError = (typeof ACCOUNT_ERRORS)[number] | "unknown";

/** The refusal in a Supabase error: a trigger's code, or a taken nickname (the unique index) */
export function accountError(error: { message?: string; code?: string } | null): AccountError | null {
  if (!error) return null;
  if (error.code === "23505" && error.message?.includes("nickname")) return "nickname_taken";
  // The username's format (supabase/migrations/*_usernames.sql: profiles_username_format)
  if (error.code === "23514" && error.message?.includes("profiles_")) return "username_invalid";
  return ACCOUNT_ERRORS.find((code) => error.message === code) ?? "unknown";
}

export const daysSince = (iso: string, now = Date.now()) => (now - new Date(iso).getTime()) / 86_400_000;
