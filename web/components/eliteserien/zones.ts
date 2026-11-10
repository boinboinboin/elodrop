// Eliteserien's outcomes and their colours (app/globals.css, --color-zone-*): the title (green), the top 4 and its
// play-offs for the title (blue), 7th and the qualification (yellow), 8th and relegation (red)
import type { EliteserienOutcome } from "@/types";

export const ZONES: EliteserienOutcome[] = ["champion", "top4", "qualification", "relegated"];
export const zoneColor = (zone: EliteserienOutcome) => `var(--color-zone-${zone})`;
