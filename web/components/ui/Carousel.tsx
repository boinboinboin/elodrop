"use client";

// A carousel (Embla): 1 slide at a time on phones, 2 from tablet width (md), 3 from desktop (lg),
// moving one slide at a time. Swipe or drag it, or use the arrows; the dots show (and jump to) each
// position. The slides are rendered by the caller (on the server); only the scrolling happens here.
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "@/components/SVG";
import { ICON_BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

export default function Carousel({ slides, label }: { slides: ReactNode[]; label: string }) {
  const { t } = useI18n();
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
            <div key={i} className="min-w-0 shrink-0 basis-full md:basis-1/2 lg:basis-1/3 pl-4" role="group" aria-roledescription="slide" aria-label={t("common.carousel.slide", { position: i + 1, count: slides.length })}>
              {slide}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        {/* Each dot is a 24px button (a size a finger can tap) around the small dot that shows; on the narrowest
            phones ten of them and the arrows don't fit on one line, so they wrap */}
        <div className="flex flex-wrap min-w-0 -mx-1.5" role="group" aria-label={t("common.carousel.positions")}>
          {count > 1 &&
            Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                className="group w-6 h-6 flex items-center justify-center cursor-pointer"
                aria-label={t("common.carousel.position", { position: i + 1, count })}
                aria-current={i === current ? "true" : undefined}
              >
                <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${i === current ? "bg-black" : "bg-gray-300 group-hover:bg-gray-500"}`} />
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => api?.scrollPrev()} disabled={current === 0} className={ICON_BUTTON} aria-label={t("common.carousel.previous")}>
            <ArrowLeft />
          </button>
          <button type="button" onClick={() => api?.scrollNext()} disabled={current >= count - 1} className={ICON_BUTTON} aria-label={t("common.carousel.next")}>
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}
