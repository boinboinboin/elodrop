// Eliteserien: this season's team strengths, the earlier seasons in review and the 10-match test
import type { Loose } from "@/types";
import { load } from "./load";

export const getEliteserien = async () => load<Loose>("eliteserien.json");
export const getEliteserienReview = async (season: string) => (/^\d{4}-\d{2}$/.test(season) ? load<Loose>(`eliteserien-${season}.json`) : null);
export const getEliteserienTenMatches = async () => load<Loose>("eliteserien-ten-matches.json");
