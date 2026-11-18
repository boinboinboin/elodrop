// A player's points in the recent rounds as small bars, oldest left: green up, red down, a dot for a round without
// matches. The stonk chart in the player search and the squad.
const W = 6;
const GAP = 2;
const H = 24;

export default function Sparkline({ points, label }: { points: number[]; label: string }) {
  const values = [...points].reverse();
  const max = Math.max(50, ...values.map((v) => Math.abs(v)));
  const mid = H / 2;
  return (
    <svg width={values.length * (W + GAP)} height={H} role="img" aria-label={label} className="shrink-0 overflow-visible">
      <line x1={0} x2={values.length * (W + GAP) - GAP} y1={mid} y2={mid} stroke="var(--color-gray-300)" strokeWidth={1} />
      {values.map((v, i) => {
        const h = Math.max(1, (Math.abs(v) / max) * (mid - 1));
        return v === 0 ? (
          <circle key={i} cx={i * (W + GAP) + W / 2} cy={mid} r={1.2} fill="var(--color-gray-400)" />
        ) : (
          <rect key={i} x={i * (W + GAP)} y={v > 0 ? mid - h : mid} width={W} height={h} fill={v > 0 ? "var(--color-green-700)" : "var(--color-red-700)"} />
        );
      })}
    </svg>
  );
}
