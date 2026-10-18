// A season as "2025/2026", or "25/26" on phones, where season tables need the room
export default function SeasonLabel({ season }: { season: number }) {
  const short = (year: number) => String(year % 100).padStart(2, "0");
  return (
    <>
      <span className="sm:hidden">{short(season)}/{short(season + 1)}</span>
      <span className="hidden sm:inline">{season}/{season + 1}</span>
    </>
  );
}
