// A column header that sorts by its column (most first), and back to rank order when clicked again
import { CaretDown } from "@/components/SVG";
import { t } from "@/messages/i18n";

/** `sortTitle`: what a click does ("Sort by matches, most first") */
export default function SortButton({ active, onClick, label, sortTitle }: { active: boolean; onClick: () => void; label: string; sortTitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 cursor-pointer hover:text-black ${active ? "text-black" : ""}`}
      title={active ? t("common.backToRankOrder") : sortTitle}
    >
      {label}
      <CaretDown className={`text-[0.7em] ${active ? "" : "opacity-30"}`} />
    </button>
  );
}
