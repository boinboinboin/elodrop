// Numbers with a label: StatCard a big one in its own white tile (inside a <dl>), Stat a small one
// in a list of an entry's numbers
import type { ReactNode } from "react";

export default function StatCard({ label, title, children, detail }: { label: ReactNode; title?: string; children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-sm text-gray-600" title={title}>{label}</dt>
      <dd className="text-3xl font-semibold tabular-nums">{children}</dd>
      {detail && <dd className="text-sm text-gray-600">{detail}</dd>}
    </div>
  );
}

export const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-gray-500">{label}</dt>
    <dd className="tabular-nums">{children}</dd>
  </div>
);
