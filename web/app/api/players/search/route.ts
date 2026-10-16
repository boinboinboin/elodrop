// Player search for the player pickers: ?q=<name> → [{ id, name, club }]
import { searchPlayers } from "@/lib/data";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 60);
  return Response.json(await searchPlayers(q, 10));
}
