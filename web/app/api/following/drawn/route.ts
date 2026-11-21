// Who is drawn in a tournament not over yet (tournaments/drawn.json), for the Following card in local development: the
// site itself reads the file straight from the data bucket (NEXT_PUBLIC_DATA_URL, components/account/useFollowed.ts),
// so this isn't asked for in production.
import { getDrawn } from "@/data/tournaments";

export async function GET() {
  return Response.json((await getDrawn()) ?? { generatedAt: "", tournaments: {}, players: {} });
}
