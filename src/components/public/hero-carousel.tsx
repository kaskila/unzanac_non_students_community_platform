"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CarouselSlide } from "@/lib/hero";

const INTERVAL_MS = 6000;
const SIZES = "(min-width: 1152px) 1152px, 100vw";
const PRELOAD_MS = 1500; // fetch the next photo this long before it slides in

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCE_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Autoplay is allowed unless the visitor asked for less motion or uses the browser's data saver. */
function autoplayAllowed() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return !window.matchMedia(REDUCE_MOTION).matches && !saveData;
}

type Labels = { region: string; previous: string; next: string; slide: string; pause: string; play: string };

/**
 * The home page photo slider. Photos change every 6 seconds; swiping works without JavaScript
 * (CSS scroll snap), the arrows and autoplay need it.
 * - Data: only the first photo loads with the page; each next photo is fetched shortly before it
 *   is shown (or when the visitor swipes), so leaving early never downloads the rest.
 * - Accessibility (WCAG 2.2.2): a pause button; autoplay also pauses while the pointer or keyboard
 *   focus is on the slider, and never starts for "reduce motion" or data-saver users.
 */
export function HeroCarousel({ slides, labels }: { slides: CarouselSlide[]; labels: Labels }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set([0]));
  // Server render: not playing (no settings known yet); the browser then applies the visitor's settings.
  const allowed = useSyncExternalStore(subscribeToMotion, autoplayAllowed, () => false);
  const [choice, setChoice] = useState<boolean | null>(null); // the pause/play button, once pressed
  const playing = choice ?? allowed;
  const [hovered, setHovered] = useState(false);
  const count = slides.length;

  const load = (...indices: number[]) =>
    setLoaded((prev) => (indices.every((i) => prev.has(i)) ? prev : new Set([...prev, ...indices])));

  function show(next: number) {
    const el = scroller.current;
    if (!el) return;
    const target = (next + count) % count;
    load(target);
    el.scrollTo({ left: target * el.clientWidth, behavior: window.matchMedia(REDUCE_MOTION).matches ? "auto" : "smooth" });
    setIndex(target);
  }

  // Autoplay: preload the next photo, then slide to it. Restarts whenever the photo changes.
  useEffect(() => {
    if (!playing || hovered || count < 2) return;
    const next = (index + 1) % count;
    const preload = setTimeout(() => load(next), INTERVAL_MS - PRELOAD_MS);
    const advance = setTimeout(() => {
      if (document.visibilityState === "visible") show(next);
    }, INTERVAL_MS);
    return () => {
      clearTimeout(preload);
      clearTimeout(advance);
    };
    // show/load only use refs and state setters; the timers restart on index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, hovered, index, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.region}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHovered(false)}
    >
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const current = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          load(current);
          if (current !== index) setIndex(current);
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-live={playing ? "off" : "polite"}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slide.replace("{n}", String(i + 1)).replace("{count}", String(count))}
            className="aspect-[16/7] w-full shrink-0 snap-start bg-azure-100"
          >
            {loaded.has(i) && (
              <picture>
                {slide.avifSrcSet && <source type="image/avif" srcSet={slide.avifSrcSet} sizes={SIZES} />}
                <img
                  src={slide.src}
                  srcSet={slide.srcSet}
                  sizes={SIZES}
                  alt={slide.alt}
                  width={960}
                  height={420}
                  fetchPriority={i === 0 ? "high" : undefined}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </picture>
            )}
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => show(index - 1)}
            aria-label={labels.previous}
            className="absolute left-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-white hover:bg-ink/60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8 fill-none stroke-current stroke-2">
              <path d="m15 4-8 8 8 8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => show(index + 1)}
            aria-label={labels.next}
            className="absolute right-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-white hover:bg-ink/60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8 fill-none stroke-current stroke-2">
              <path d="m9 4 8 8-8 8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setChoice(!playing)}
            aria-label={playing ? labels.pause : labels.play}
            className="absolute bottom-2 right-2 flex size-11 items-center justify-center rounded-full bg-ink/40 text-white hover:bg-ink/60"
          >
            {playing ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-current">
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </>
      )}
    </section>
  );
}
