"use client";

// A short list of players in a box, each with a value (and a detail line under the name), as EloStonk's statistics
// (Stats: most picked, best picks…) and a league's most picked (Leagues) show them.
import Link from "@/components/ui/Link";
import { ROW } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";

export default function PlayerList({ title, help, rows }: { title: string; help?: string; rows: { id: number; name: string; value: string; detail?: string; tone?: number }[] }) {
  const { t } = useI18n();
  return (
    <div className="bg-white p-4 min-w-0">
      <h3 className="text-sm text-gray-600 mb-2">{title}</h3>
      {rows.length ? (
        <ol>
          {rows.map((r) => (
            <li key={r.id} className={`${ROW} flex justify-between gap-3 py-1.5`}>
              <span className="min-w-0">
                <Link href={playerHref(r.id)} className="font-semibold hover:text-blue-600 break-words">{r.name}</Link>
                {r.detail && <span className="block text-sm text-gray-600">{r.detail}</span>}
              </span>
              <span className={`tabular-nums whitespace-nowrap ${r.tone === undefined ? "" : toneClass(r.tone)}`}>{r.value}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-gray-400">{t("elostonk.stats.empty")}</p>
      )}
      {help && <p className="text-xs text-gray-500 mt-2">{help}</p>}
    </div>
  );
}
