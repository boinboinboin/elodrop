// The winning margins of the sides' meetings over all disciplines, in a box of their own (its heading
// an h2, the section's, so not a ui/Card)
import MarginsTable from "@/components/head-to-head/MarginsTable";
import { getI18n } from "@/messages/server";
import type { Margins } from "@/types";

export default async function MarginsCard({ margins, names, showPool, doubles = false }: { margins: Margins; names: [string, string]; showPool: boolean; doubles?: boolean }) {
  const { plural, t } = await getI18n();
  return (
    <div className="bg-white p-4 md:p-6 mt-6">
      <h2 className="text-xl mb-1">{t("headToHead.margins.title")}</h2>
      <p className="text-sm text-gray-600 mb-4">{plural(doubles ? "headToHead.margins.introDoubles" : "headToHead.margins.intro", margins.matches)}</p>
      <MarginsTable mg={margins} names={names} showPool={showPool} />
    </div>
  );
}
