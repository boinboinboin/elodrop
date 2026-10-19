import Link from "next/link";
import { ArrowRight } from "@/components/Icons";

export default function NotFound() {
  return (
    <section className="base-section">
      <div className="base-container px-4">
        <h1 className="h1">Not found</h1>
        <p className="text-2xl mt-2 max-w-3xl">There is no such player, club or tournament here, or it has no ratings yet.</p>
        <p className="mt-4">
          <Link href="/" className="underline hover:text-blue-600">Back to the rankings <ArrowRight /></Link>
        </p>
      </div>
    </section>
  );
}
