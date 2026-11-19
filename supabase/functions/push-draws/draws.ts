// Who is drawn where: from a tournament's file on the data bucket (pipeline/upcoming.mjs's tournaments/<id>.json), each
// player's events in it, and the notification's text for them in Norwegian or English.

export type Pool = "men" | "women" | "mensDoubles" | "womensDoubles" | "mixedDoubles";
export interface TournamentFile {
  cup2000Id: number;
  name: string;
  cancelled: string | null;
  startDate: string | null;
  endDate: string | null;
  events: {
    className: string;
    pool: Pool;
    singleGroup?: boolean;
    groups: { name: string; number: number; entries: number[] }[];
    entries: { players: { id: number | null }[]; withdrew: boolean }[];
  }[];
}
export interface Drawn {
  className: string;
  pool: Pool;
  /** Their group's number (null: the event is one group, or a knockout without groups) */
  group: number | null;
}

/** Each player's events in the tournament (withdrawn entries left out) */
export function drawnPlayers(t: TournamentFile): Map<number, Drawn[]> {
  const byPlayer = new Map<number, Drawn[]>();
  for (const e of t.events) {
    e.entries.forEach((entry, index) => {
      if (entry.withdrew) return;
      const group = e.singleGroup || e.groups.length < 2 ? null : (e.groups.find((g) => g.entries.includes(index))?.number ?? null);
      for (const p of entry.players) {
        if (!p.id) continue;
        if (!byPlayer.has(p.id)) byPlayer.set(p.id, []);
        byPlayer.get(p.id)!.push({ className: e.className, pool: e.pool, group });
      }
    });
  }
  return byPlayer;
}

const POOLS: Record<"nb" | "en", Record<Pool, string>> = {
  nb: { men: "Herresingle", women: "Damesingle", mensDoubles: "Herredouble", womensDoubles: "Damedouble", mixedDoubles: "Mixed double" },
  en: { men: "Men's singles", women: "Women's singles", mensDoubles: "Men's doubles", womensDoubles: "Women's doubles", mixedDoubles: "Mixed doubles" },
};

/** The notification: "You're drawn in …", the events with their groups, and the account page (its overview has the draw and the chances) */
export function message(t: Pick<TournamentFile, "cup2000Id" | "name">, events: Drawn[], lang: "nb" | "en") {
  const group = lang === "nb" ? "pulje" : "group";
  const body = events.map((e) => `${POOLS[lang][e.pool]} ${e.className}${e.group ? `, ${group} ${e.group}` : ""}`).join(" · ");
  return {
    title: lang === "nb" ? `Du er trukket i ${t.name}` : `You're drawn in ${t.name}`,
    body,
    url: lang === "nb" ? "/account" : "/en/account",
    // One notification per tournament on a device, replaced rather than stacked if it ever comes again
    tag: `draw-${t.cup2000Id}`,
  };
}
