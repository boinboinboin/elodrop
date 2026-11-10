// Shared by the Eliteserien season page's parts (app/[lang]/(site)/eliteserien/page.tsx)
import { EMPTY } from "@/utils/format";

/** A team's section on the page */
export const teamId = (team: string) => `team-${team.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-")}`;

/**
 * A forecast's chance: "–" when it can't happen, "100%" when it's settled, else as a prediction ("37%", "<1%",
 * ">99%"; `chance` from useI18n/getI18n)
 */
export const outcome = (x: number, chance: (x: number) => string, pct: (x: number) => string) => (x <= 0 ? EMPTY : x >= 1 ? pct(1) : chance(x));

/** The colour of a chance in a heat map: the theme's first chart colour, deeper with the chance, light enough for dark text */
export const heat = (x: number) => `color-mix(in srgb, var(--color-chart-1) ${Math.round(6 + x * 56)}%, var(--color-white))`;
