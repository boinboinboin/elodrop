// The badges page's numbers (achievements.json, pipeline/achievements.mjs): how many players have earned each badge
import type { AchievementStats } from "@/types";
import { load } from "./load";

export const getAchievementStats = () => load<AchievementStats>("achievements.json");
