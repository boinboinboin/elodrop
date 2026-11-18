// Each side's chance as a split bar, without words (components/head-to-head/ChanceBar.tsx has them over it). On its own,
// with no server code, so client components (the account's overview) can use it too.
import { OTHER_COLOR, SIDE_COLORS } from "@/utils/chart";

/** The bar alone: named by `label` for screen readers, or hidden from them when the chances are in words beside it */
export function SplitBar({ chance, draw = 0, label, className = "" }: { chance: number; draw?: number; label?: string; className?: string }) {
  return (
    <div className={`flex h-3 gap-0.5 ${className}`} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      <div className="rounded-l" style={{ width: `${(chance * 100).toFixed(1)}%`, background: SIDE_COLORS[0] }} />
      {draw > 0 && <div style={{ width: `${(draw * 100).toFixed(1)}%`, background: OTHER_COLOR }} />}
      <div className="rounded-r flex-1" style={{ background: SIDE_COLORS[1] }} />
    </div>
  );
}
