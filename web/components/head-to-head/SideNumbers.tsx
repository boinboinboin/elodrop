// One side's rating in a comparison: who (the label), the rating in big, and details under it;
// the second side right-aligned
import type { ReactNode } from "react";

export default function SideNumbers({ label, value, right = false, children }: { label: ReactNode; value: ReactNode; right?: boolean; children?: ReactNode }) {
  return (
    <dl className={right ? "text-right" : ""}>
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-3xl font-semibold tabular-nums">{value}</dd>
      {children}
    </dl>
  );
}
