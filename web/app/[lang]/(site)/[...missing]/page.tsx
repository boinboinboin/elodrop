// Any address the site doesn't have: its own "not found" page (../not-found.tsx, with the header and
// footer) instead of Next.js's plain one
import { notFound } from "next/navigation";

export default function Missing() {
  notFound();
}
