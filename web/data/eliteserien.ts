// Eliteserien: this season's team strengths and the earlier seasons in review
import type { Loose } from "@/types";
import { load } from "./load";

export const getEliteserien = async () => load<Loose>("eliteserien.json");
export const getEliteserienReview = async (season: string) => (/^\d{4}-\d{2}$/.test(season) ? load<Loose>(`eliteserien-${season}.json`) : null);
