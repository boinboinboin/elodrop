// A white box of content (a chart, a table, a record), with a heading and a line under it if given
import type { ReactNode } from "react";

export default function Card({ title, subtitle, className = "", children }: { title?: ReactNode; subtitle?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={`bg-white p-4 md:p-6 ${className}`}>
      {title && <h3 className="text-xl mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}
