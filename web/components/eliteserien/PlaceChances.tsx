// Where each team finishes (pipeline/eliteserien-forecast.mjs): the chance of each final place after the play-offs, as a
// heat map in the head to head's colours, the teams in table order. The places' headings have their outcome's colour
// under them (zones.ts): 1st the title, 2nd to 4th the top 4, 7th the qualification, 8th relegated.
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast } from "@/types";
import Team from "@/components/clubs/Team";
import { heat, outcome } from "./share";
import { zoneColor } from "./zones";

const PLACE_ZONES = ["champion", "top4", "top4", "top4", null, null, "qualification", "relegated"] as const;

export default async function PlaceChances({ forecast, clubs }: { forecast: EliteserienForecast; clubs: Record<string, ClubEntry> }) {
  const { t, chance, pct } = await getI18n();
  const places = forecast.table[0]?.finalPlaces.map((_, i) => i + 1) ?? [];
  return (
    <div className="bg-white overflow-x-auto p-2">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className="p-2" />
            {places.map((place) => (
              <th key={place} scope="col" className="p-2 font-normal text-gray-600 text-center tabular-nums whitespace-nowrap">
                {t("eliteserien.places.place", { place })}
                {PLACE_ZONES[place - 1] && <span aria-hidden="true" className="block h-0.5 mt-1 rounded-full" style={{ background: zoneColor(PLACE_ZONES[place - 1]!) }} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {forecast.table.map((row) => (
            <tr key={row.team}>
              <th scope="row" className="p-2 font-normal text-left whitespace-nowrap"><Team name={row.team} clubs={clubs} size={5} /></th>
              {row.finalPlaces.map((x, i) => (
                <td
                  key={i}
                  className="p-2 text-center tabular-nums whitespace-nowrap border-2 border-white text-gray-900"
                  style={x > 0 ? { background: heat(x) } : undefined}
                  title={t("eliteserien.places.cellTitle", { team: row.team, place: i + 1, chance: outcome(x, chance, pct) })}
                >
                  {x >= 0.005 ? outcome(x, chance, pct) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
