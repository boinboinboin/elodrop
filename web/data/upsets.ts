// The biggest upsets of each week
import type { UpsetWeek } from "@/types";
import { load } from "./load";

export const getUpsetsIndex = async () => load<{ generatedAt: string; years: string[]; latest: UpsetWeek | null }>("upsets/index.json");
export const getUpsetYear = async (year: string) => (await load<{ weeks: UpsetWeek[] }>(`upsets/${year}.json`))?.weeks ?? [];
