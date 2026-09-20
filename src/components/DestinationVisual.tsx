import { useState } from "react";
import type { Destination } from "../types";

type DestinationVisualProps = {
  destination: Destination;
  compact?: boolean;
};

const failedImageUrls = new Set<string>();

function resizeCommonsImageUrl(src: string, width: number) {
  try {
    const url = new URL(src);
    if (url.hostname === "commons.wikimedia.org" && url.pathname.includes("/wiki/Special:FilePath/")) {
      url.searchParams.set("width", width.toString());
      return url.toString();
    }
  } catch {
    return src;
  }

  return src;
}

export function DestinationVisual({ destination, compact = false }: DestinationVisualProps) {
  const src = destination.imageUrl?.trim();
  const displaySrc = src ? resizeCommonsImageUrl(src, compact ? 360 : 760) : "";
  const [imageFailed, setImageFailed] = useState(() => Boolean(displaySrc && failedImageUrls.has(displaySrc)));
  const alt = destination.imageAlt?.trim() || `${destination.name} location photo`;

  if (!displaySrc || imageFailed) {
    return (
      <figure className={compact ? "destination-visual compact empty" : "destination-visual empty"}>
        <div className="destination-photo-empty">
          <strong>{destination.name}</strong>
          <span>Photo not added</span>
        </div>
      </figure>
    );
  }

  return (
    <figure className={compact ? "destination-visual compact" : "destination-visual"}>
      <img
        src={displaySrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        fetchPriority={compact ? "low" : "auto"}
        referrerPolicy="no-referrer"
        onError={() => {
          failedImageUrls.add(displaySrc);
          setImageFailed(true);
        }}
      />
      {!compact && <figcaption>{destination.name}</figcaption>}
    </figure>
  );
}
