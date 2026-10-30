// A small outlined label next to a name ("Withdrew", "Not played", "Loan")
import type { ReactNode } from "react";

const TONES = { green: "border-green-700 text-green-700", red: "border-red-700 text-red-700", gray: "border-gray-500 text-gray-700" };

export default function Badge({ tone = "gray", className = "", children }: { tone?: keyof typeof TONES; className?: string; children: ReactNode }) {
  return <span className={`inline-block font-mono text-xs px-1.5 py-0.5 border rounded ${TONES[tone]} ${className}`}>{children}</span>;
}
