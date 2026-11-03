// League team matches (pipeline/team-matches.mjs): the weeks, each week's team matches, each team match and each season's divisions
import type { TeamMatch, TeamMatchesIndex, TeamMatchWeek, TeamDivision } from "@/types";
import { load } from "./load";

export const getTeamMatchesIndex = async () => load<TeamMatchesIndex>("team-matches/index.json");
export const getTeamMatchWeek = async (monday: string) => (/^\d{4}-\d{2}-\d{2}$/.test(monday) ? load<TeamMatchWeek>(`team-matches/weeks/${monday}.json`) : null);
export const getTeamMatch = async (matchId: number) => load<TeamMatch>(`team-matches/${matchId}.json`);
export const getTeamDivision = async (season: number, slug: string) => (/^[a-z0-9-]+$/.test(slug) ? load<TeamDivision>(`team-matches/divisions/${season}/${slug}.json`) : null);
