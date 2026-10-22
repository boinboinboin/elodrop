// The sides' record against each other as a big "wins – losses", with the number of meetings (and
// draws) under it; "Never met" when they haven't
import { plural, t } from "@/messages/i18n";
import type { Record3 } from "@/types";

/** `pairs`: say that pair A's wins come first */
export default function RecordScore({ record, pairs = false }: { record: Record3; pairs?: boolean }) {
  if (!record.matches) return <p className="text-gray-600">{t("headToHead.record.neverMet")}</p>;
  return (
    <>
      <p className="text-4xl sm:text-5xl font-semibold tabular-nums">
        {record.wins}<span className="text-gray-400 mx-2">–</span>{record.losses}
      </p>
      <p className="text-sm text-gray-600">
        {plural("headToHead.record.against", record.matches)}
        {record.draws ? t("headToHead.record.drawn", { count: record.draws }) : ""}
        {pairs && t("headToHead.record.pairAFirst")}
      </p>
    </>
  );
}

/** A record as a sentence: "Met 3 times in men's singles: Ola won 2, lost 1." (`met`: the first part) */
export function recordSentence(met: string, name: string, record: Record3): string {
  const result = t("headToHead.record.result", { name, wins: record.wins, losses: record.losses }) + (record.draws ? t("headToHead.record.drew", { draws: record.draws }) : "");
  return t("headToHead.record.summary", { met, result });
}
