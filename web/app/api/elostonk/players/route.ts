// EloStonk's players for the game's page (components/elostonk): who can be picked, their ratings, their points in the
// recent rounds and their upcoming tournaments (pipeline/elostonk.mjs). Built from cached data only, so it's prerendered
// and refreshed with its file (one ISR write per data update), and the browser loads it once per visit.
import { getStonkPlayers } from "@/data/elostonk";

export async function GET() {
  const file = await getStonkPlayers();
  return Response.json(file ?? { minAge: 18, rounds: [], players: [] });
}
