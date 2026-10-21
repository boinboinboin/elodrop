"use client";

// A carousel (Embla): 1 slide at a time on phones, 2 from tablet width (md), 3 from desktop (lg),
// moving one slide at a time. Swipe or drag it, or use the arrows; the dots show (and jump to) each
// position. The slides are rendered by the caller (on the server); only the scrolling happens here.
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "@/components/Icons";

const buttonClass =
  "inline-flex items-center justify-center w-10 h-10 border border-black transition-colors duration-200 hover:bg-black hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-inherit";

export default function Carousel({ slides, label }: { slides: ReactNode[]; label: string }) {
  // trimSnaps: no empty space after the last slide
  const [viewport, api] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  // The current position and the number of positions (which changes with the slides shown at a time)
  const subscribe = useCallback(
    (onChange: () => void) => {
      api?.on("select", onChange).on("reInit", onChange);
      return () => void api?.off("select", onChange).off("reInit", onChange);
    },
    [api],
  );
  const current = useSyncExternalStore(subscribe, () => api?.selectedScrollSnap() ?? 0, () => 0);
  const count = useSyncExternalStore(subscribe, () => api?.scrollSnapList().length ?? 0, () => 0);

  return (
    <section aria-roledescription="carousel" aria-label={label}>
      <div className="overflow-hidden" ref={viewport}>
        {/* The gap between slides: padding on the slides, taken back by the container's margin */}
        <div className="flex -ml-4 touch-pan-y">
          {slides.map((slide, i) => (
            <div key={i} className="min-w-0 shrink-0 basis-full md:basis-1/2 lg:basis-1/3 pl-4" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
              {slide}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex gap-2" role="group" aria-label="Positions">
          {count > 1 &&
            Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 cursor-pointer ${i === current ? "bg-black" : "bg-gray-300 hover:bg-gray-500"}`}
                aria-label={`Position ${i + 1} of ${count}`}
                aria-current={i === current ? "true" : undefined}
              />
            ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => api?.scrollPrev()} disabled={current === 0} className={buttonClass} aria-label="Previous">
            <ArrowLeft />
          </button>
          <button type="button" onClick={() => api?.scrollNext()} disabled={current >= count - 1} className={buttonClass} aria-label="Next">
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}
