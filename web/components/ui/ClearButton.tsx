"use client";

// The button that empties a search field (the browser's own is hidden, app/globals.css): the site's
// cross, shown while there's text. It keeps the focus in the field, so typing can go on.
import { Cross } from "@/components/SVG";
import { useI18n } from "@/messages/client";

export default function ClearButton({ show, onClear, className = "" }: { show: boolean; onClear: () => void; className?: string }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <button
      type="button"
      aria-label={t("common.clear")}
      // mousedown, not click: the field keeps its focus (and an open list isn't closed by its blur)
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClear}
      className={`p-1 text-gray-400 hover:text-black cursor-pointer ${className}`}
    >
      <Cross className="text-lg" />
    </button>
  );
}
