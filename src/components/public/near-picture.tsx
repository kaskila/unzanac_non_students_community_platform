"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A picture (AVIF with WebP fallback) that downloads only when the visitor scrolls near it.
 * The browser's own lazy loading starts far earlier (up to ~2500px), which would put images
 * just below the first screen on the home page's data budget. Until then a box of the same
 * shape keeps the layout steady.
 */
export function NearPicture({
  avifSrcSet,
  srcSet,
  src,
  sizes,
  width,
  height,
  alt,
  className,
}: {
  avifSrcSet: string;
  srcSet: string;
  src: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
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

  return (
    <div ref={box} style={{ aspectRatio: `${width} / ${height}` }} className={className}>
      {near ? (
        <picture>
          <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
          <img src={src} srcSet={srcSet} sizes={sizes} width={width} height={height} alt={alt} decoding="async" className="h-full w-full object-contain" />
        </picture>
      ) : (
        <span role="img" aria-label={alt} className="block h-full w-full" />
      )}
    </div>
  );
}
