"use client";

import { useRef, useState } from "react";
import { heroImageUrl, heroSrcSet } from "@/lib/hero";

type Slide = { id: string; alt: string; version: string };

/**
 * The home page photo slider (landing redesign). Swiping works without JavaScript (CSS scroll
 * snap); the arrows need it. To save data, only the first photo loads with the page: the others
 * are added once the visitor swipes or taps an arrow.
 */
export function HeroCarousel({ slides, labels }: { slides: Slide[]; labels: { region: string; previous: string; next: string; slide: string } }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [loadAll, setLoadAll] = useState(false);
  const count = slides.length;

  function go(step: number) {
    const el = scroller.current;
    if (!el) return;
    setLoadAll(true);
    const next = (index + step + count) % count;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  }

  return (
    <section aria-roledescription="carousel" aria-label={labels.region} className="relative">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setLoadAll(true);
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slide.replace("{n}", String(i + 1)).replace("{count}", String(count))}
            className="aspect-[16/7] w-full shrink-0 snap-start bg-azure-100"
          >
            {(i === 0 || loadAll) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl(slide.id, slide.version, 960)}
                srcSet={heroSrcSet(slide.id, slide.version)}
                sizes="(min-width: 1152px) 1152px, 100vw"
                alt={slide.alt}
                width={960}
                height={420}
                fetchPriority={i === 0 ? "high" : undefined}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.previous}
            className="absolute left-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-white hover:bg-ink/60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8 fill-none stroke-current stroke-2">
              <path d="m15 4-8 8 8 8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.next}
            className="absolute right-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-white hover:bg-ink/60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8 fill-none stroke-current stroke-2">
              <path d="m9 4 8 8-8 8" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}
