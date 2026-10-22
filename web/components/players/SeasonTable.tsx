// A table by season with one column per discipline (MS, WS, ... on phones), the table view of the
// player page's history charts; if it's still too wide, it scrolls inside its box
import type { ReactNode } from "react";
import PoolName from "@/components/format/PoolName";
import SeasonLabel from "@/components/format/SeasonLabel";
import { t } from "@/messages/i18n";
import type { Pool, SeasonRow } from "@/types";

export default function SeasonTable({
  pools,
  rows,
  cell,
}: {
  pools: Pool[];
  /** Each season's rows by discipline, oldest first */
  rows: [number, Partial<Record<Pool, SeasonRow>>][];
  cell: (row: SeasonRow | undefined) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="mt-2 text-left">
        <thead className="text-sm text-gray-600">
          <tr>
            <th scope="col" className="py-1 pr-3 sm:pr-6 font-normal">{t("common.table.season")}</th>
            {pools.map((pool) => (
              <th key={pool} scope="col" className="py-1 pr-3 sm:pr-6 font-normal text-right whitespace-nowrap">
                <PoolName pool={pool} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm sm:text-base">
          {rows.map(([season, byPool]) => (
            <tr key={season}>
              <td className="py-1 pr-3 sm:pr-6 whitespace-nowrap"><SeasonLabel season={season} /></td>
              {pools.map((pool) => (
                <td key={pool} className="py-1 pr-3 sm:pr-6 text-right tabular-nums whitespace-nowrap">{cell(byPool[pool])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
