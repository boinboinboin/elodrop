// Each side's chance of winning as a split bar: A's share from the left, B's from the right, in the
// sides' colours
import { getI18n } from "@/messages/server";
import { SIDE_COLORS } from "@/utils/chart";

export default async function ChanceBar({ names, chance }: { names: [string, string]; chance: number }) {
  const { pct } = await getI18n();
  return (
    <>
      <div className="flex justify-between gap-4 text-sm mb-1 tabular-nums">
        <span><strong className="text-base">{pct(chance)}</strong> {names[0]}</span>
        <span className="text-right">{names[1]} <strong className="text-base">{pct(1 - chance)}</strong></span>
      </div>
      <div className="flex h-3 gap-0.5" role="img" aria-label={`${names[0]} ${pct(chance)}, ${names[1]} ${pct(1 - chance)}`}>
        <div className="rounded-l" style={{ width: `${(chance * 100).toFixed(1)}%`, background: SIDE_COLORS[0] }} />
        <div className="rounded-r flex-1" style={{ background: SIDE_COLORS[1] }} />
      </div>
    </>
  );
}
