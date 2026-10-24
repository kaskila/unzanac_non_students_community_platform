"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A YouTube video that costs ~15 KB until someone asks for it (docs/PLAN.md §3.1): a thumbnail
 * with a play button. Only on tap is the youtube-nocookie.com player (~1 MB) inserted.
 * The thumbnail itself waits until the visitor scrolls near it: the browser's own lazy loading
 * starts up to ~2500px early, which would put it on the home page's critical path.
 */
export function TapToPlay({
  embedUrl,
  thumbnailUrl,
  title,
  playLabel,
}: {
  embedUrl: string;
  thumbnailUrl: string | null;
  title: string;
  playLabel: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [near, setNear] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = button.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-ink">
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      ref={button}
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`${playLabel}: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-azure-900"
    >
      {thumbnailUrl && near && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" width={320} height={180} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex min-h-14 items-center gap-2 rounded-full bg-azure-900 px-5 font-semibold text-white shadow group-hover:bg-azure-700">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
          {playLabel}
        </span>
      </span>
    </button>
  );
}
