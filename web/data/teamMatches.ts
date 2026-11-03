// League team matches (pipeline/team-matches.mjs): the weeks, each week's team matches, each team match and the season's power ranking
import type { TeamMatch, TeamMatchesIndex, TeamMatchWeek, TeamPowerRanking } from "@/types";
import { load } from "./load";

export const getTeamMatchesIndex = async () => load<TeamMatchesIndex>("team-matches/index.json");
export const getTeamMatchWeek = async (monday: string) => (/^\d{4}-\d{2}-\d{2}$/.test(monday) ? load<TeamMatchWeek>(`team-matches/weeks/${monday}.json`) : null);
export const getTeamMatch = async (matchId: number) => load<TeamMatch>(`team-matches/${matchId}.json`);
export const getTeamPowerRanking = async () => load<TeamPowerRanking>("team-matches/power.json");
