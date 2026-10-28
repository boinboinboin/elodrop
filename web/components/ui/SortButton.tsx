"use client";

// A column header that sorts by its column (most first), and back to rank order when clicked again
import { CaretDown } from "@/components/SVG";
import { useI18n } from "@/messages/client";

/** `sortTitle`: what a click does ("Sort by matches, most first") */
export default function SortButton({ active, onClick, label, sortTitle }: { active: boolean; onClick: () => void; label: string; sortTitle: string }) {
  const { t } = useI18n();
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
