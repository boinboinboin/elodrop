// Tournament draws, draw luck and how the predictions turned out
import type { DrawnFile, Tournament, TournamentsIndex } from "@/types";
import { load } from "./load";

export const getTournamentsIndex = async () => load<TournamentsIndex>("tournaments/index.json");

/** Who is drawn in a tournament not over yet (the Following card's, loaded in the browser; this one for local development) */
export const getDrawn = async () => load<DrawnFile>("tournaments/drawn.json");

export async function getTournament(cup2000Id: number): Promise<Tournament | null> {
  // The events' discipline names are the page's (i18n.pools[event.pool]), not the data's English poolLabel
  return load<Tournament>(`tournaments/${cup2000Id}.json`);
}
