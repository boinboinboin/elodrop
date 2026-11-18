// Each side's chance of winning as a split bar: A's share from the left, B's from the right, in the
// sides' colours; with `draw` (a team match), the chance of a draw between them in grey. ChanceBar
// has the chances in words over it; SplitBar is just the bar, for lists that give them elsewhere
// (the Eliteserien page's ties), in its own module so client components can use it.
import { SplitBar } from "@/components/head-to-head/SplitBar";
import { getI18n } from "@/messages/server";

export default async function ChanceBar({ names, chance, draw = 0 }: { names: [string, string]; chance: number; draw?: number }) {
  const { pct, t } = await getI18n();
  const other = 1 - chance - draw;
  const drawText = t("teamMatches.match.draw");
  return (
    <>
      <div className="flex justify-between gap-4 text-sm mb-1 tabular-nums">
        <span><strong className="text-base">{pct(chance)}</strong> {names[0]}</span>
        {draw > 0 && <span className="text-center text-gray-600"><strong className="text-base text-gray-900">{pct(draw)}</strong> {drawText}</span>}
        <span className="text-right">{names[1]} <strong className="text-base">{pct(other)}</strong></span>
      </div>
      <SplitBar chance={chance} draw={draw} label={`${names[0]} ${pct(chance)}, ${draw > 0 ? `${drawText} ${pct(draw)}, ` : ""}${names[1]} ${pct(other)}`} />
    </>
  );
}
