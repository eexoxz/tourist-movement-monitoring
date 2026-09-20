import { useState } from "react";
import type { Destination } from "../types";

type DestinationVisualProps = {
  destination: Destination;
  compact?: boolean;
};

export function DestinationVisual({ destination, compact = false }: DestinationVisualProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = destination.imageUrl?.trim();
  const alt = destination.imageAlt?.trim() || `${destination.name} location photo`;

  if (!src || imageFailed) {
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
      <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
      {!compact && <figcaption>{destination.name}</figcaption>}
    </figure>
  );
}
