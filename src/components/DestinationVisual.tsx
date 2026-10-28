import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Destination } from "../types";
import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { destinationPhotoCredit, storedDestinationPhoto } from "../services/destinationPhoto";
import { destinationAdminText } from "../services/destinationAdminCopy";

type DestinationVisualProps = {
  destination: Destination;
  compact?: boolean;
  locale: Locale;
  priority?: boolean;
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

function DestinationVisualComponent({ destination, compact = false, locale, priority = false }: DestinationVisualProps) {
  const src = destination.imageUrl?.trim();
  const stored = Boolean(storedDestinationPhoto(src));
  const [loadedPhoto, setLoadedPhoto] = useState<{ source: string; dataUrl: string | null }>();
  const [retry, setRetry] = useState(0);
  const figure = useRef<HTMLElement>(null);
  const displaySrc = useMemo(() => stored ? loadedPhoto?.source === src ? loadedPhoto?.dataUrl ?? "" : "" : src ? resizeCommonsImageUrl(src, compact ? 360 : 760) : "", [compact, src, stored, loadedPhoto]);
  const [imageFailed, setImageFailed] = useState(() => Boolean(displaySrc && failedImageUrls.has(displaySrc)));
  const alt = destination.imageAlt?.trim() || `${destination.name} · ${uiText(locale, "Location photo")}`;
  const credit = destinationPhotoCredit(destination);

  useEffect(() => {
    if (!stored || !src) return;
    let stopped = false;
    let observer: IntersectionObserver | undefined;
    const load = () => {
      observer?.disconnect();
      void import("../services/destinationPhotoUpload").then(({ loadDestinationPhoto }) => loadDestinationPhoto(src)).then((dataUrl) => {
        if (!stopped) setLoadedPhoto({ source: src, dataUrl });
      }).catch(() => { if (!stopped) setLoadedPhoto({ source: src, dataUrl: null }); });
    };
    if (priority || typeof IntersectionObserver === "undefined") load();
    else {
      observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) load(); }, { rootMargin: "200px" });
      if (figure.current) observer.observe(figure.current);
    }
    return () => { stopped = true; observer?.disconnect(); };
  }, [src, stored, priority, retry]);

  useEffect(() => {
    setImageFailed(Boolean(displaySrc && failedImageUrls.has(displaySrc)));
  }, [displaySrc]);

  if (!displaySrc || imageFailed) {
    return (
      <figure ref={figure} className={compact ? "destination-visual compact empty" : "destination-visual empty"}>
        <div className="destination-photo-empty">
          <strong>{destination.name}</strong>
          <span>{stored ? destinationAdminText(locale, loadedPhoto?.source === src ? "unavailable" : "loading") : uiText(locale, "Photo not added")}</span>
          {stored && !compact && loadedPhoto?.source === src && <button type="button" className="destination-photo-retry" aria-label={destinationAdminText(locale, "retry")} onClick={(event) => { event.stopPropagation(); setLoadedPhoto(undefined); setRetry((value) => value + 1); }}>{destinationAdminText(locale, "retry")}</button>}
        </div>
      </figure>
    );
  }

  return (
    <figure ref={figure} className={compact ? "destination-visual compact" : "destination-visual"}>
      <img
        src={displaySrc}
        alt={alt}
        title={credit ? `${credit.label} · ${credit.href}` : undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : compact ? "low" : "auto"}
        sizes={compact ? "96px" : "(max-width: 760px) 100vw, 760px"}
        referrerPolicy="no-referrer"
        onError={() => {
          failedImageUrls.add(displaySrc);
          setImageFailed(true);
        }}
      />
      {!compact && <figcaption>{destination.name}</figcaption>}
      {credit && !compact && <a className="destination-photo-credit" href={credit.href} target="_blank" rel="noopener noreferrer" title={credit.label} aria-label={`${uiText(locale, "Location photo")}: ${credit.label}`}><span aria-hidden="true">©</span><span>{credit.label}</span></a>}
    </figure>
  );
}

export const DestinationVisual = memo(DestinationVisualComponent);
