// The newest week's biggest upsets (components/Upsets.tsx); other weeks and years are at /upsets/<period>.
import type { Metadata } from "next";
import Upsets from "@/components/Upsets";

export const metadata: Metadata = { title: "Biggest upsets" };

export default function UpsetsPage() {
  return <Upsets period={Promise.resolve(null)} />;
}
