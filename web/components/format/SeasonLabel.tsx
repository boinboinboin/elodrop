// A season as "2025/2026", or "25/26" on phones, where season tables need the room
import { seasonLabel } from "@/utils/format";

export default function SeasonLabel({ season }: { season: number }) {
  return (
    <>
      <span className="sm:hidden">{seasonLabel(season, true)}</span>
      <span className="hidden sm:inline">{seasonLabel(season)}</span>
    </>
  );
}
