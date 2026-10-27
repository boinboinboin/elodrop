// The "change since last week" column's header in the ranking tables: a click sorts by the biggest gain since last week,
// the next by the biggest loss, and the next goes back to rank order. It shows which: "+" sorted by gain, "−" by loss,
// "±" in rank order.
import { CaretDown, CaretUp } from "@/components/SVG";
import { t } from "@/messages/i18n";

export type ChangeOrder = "gain" | "loss" | null;

/** The order after a click */
export const nextChangeOrder = (order: ChangeOrder): ChangeOrder => (order === null ? "gain" : order === "gain" ? "loss" : null);

export default function ChangeSortButton({ order, onClick }: { order: ChangeOrder; onClick: () => void }) {
  const Caret = order === "loss" ? CaretUp : CaretDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 cursor-pointer hover:text-black ${order ? "text-black" : ""}`}
      title={t(order === null ? "common.changeSort.gain" : order === "gain" ? "common.changeSort.loss" : "common.backToRankOrder")}
    >
      <span aria-hidden="true">{order === "gain" ? "+" : order === "loss" ? "−" : "±"}</span>
      <span className="sr-only">{t("common.table.changeSinceLastWeek")}</span>
      <Caret className={`text-[0.7em] ${order ? "" : "opacity-30"}`} />
    </button>
  );
}
