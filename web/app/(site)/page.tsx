// The front page: men's singles ranking (the other lists are at /rankings/<list>, lib/rankings.ts).
// Fully static: rendered once per data update.
import { Suspense } from "react";
import Rankings from "@/components/Rankings";
import { RANKING_LISTS } from "@/lib/rankings";

export default function Home() {
  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <h1 className="h1">elodrop</h1>
          <p className="text-2xl max-w-3xl mt-2">
            Singles and doubles ratings for Norwegian badminton, calculated from every tournament and league result on badmintonportalen.no since 2013.
          </p>
        </div>
      </section>
      <Suspense fallback={<div className="base-container px-4 text-gray-600">Loading rankings…</div>}>
        <Rankings list={RANKING_LISTS.men} showInactive={false} />
      </Suspense>
    </>
  );
}

