// Each club's next fixtures and last results (team-matches/clubs.json), for the Following card in local development:
// the site itself reads the file straight from the data bucket (NEXT_PUBLIC_DATA_URL, components/account/useFollowed.ts),
// so this isn't asked for in production.
import { getClubTeamMatches } from "@/data/teamMatches";

export async function GET() {
  return Response.json((await getClubTeamMatches()) ?? { generatedAt: "", season: 0, clubs: {} });
}
