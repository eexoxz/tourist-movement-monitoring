import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Destination, FestivalEvent } from "../types";
import { translate, type Locale } from "../services/i18n";
import { buildHomeSpotlights } from "../services/homeSpotlights";
import { spotlightText } from "../services/spotlightCopy";
import { travelText } from "../services/travelExperienceCopy";
import { useCalendarDay } from "../services/useCalendarDay";
import { uiText } from "../services/uiText";
import { DestinationVisual } from "./DestinationVisual";
import { animateSpotlightMove } from "../services/spotlightAnimation";

export function HomeSpotlight({ destinations, events = [], locale, onOpenPlace, onOpenEvents }: { destinations: Destination[]; events?: FestivalEvent[]; locale: Locale; onOpenPlace: (id: string) => void; onOpenEvents: (id: string) => void }) {
  const today = useCalendarDay();
  const slides = useMemo(() => buildHomeSpotlights(destinations, events, today), [destinations, events, today]);
  const signature = slides.map((slide) => slide.id).join("|");
  const track = useRef<HTMLDivElement>(null);
  const cancelTransition = useRef<() => void>(() => undefined);
  const [current, setCurrent] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const text = (key: Parameters<typeof spotlightText>[1]) => spotlightText(locale, key);
  const index = Math.min(current, Math.max(0, slides.length - 1));
  const currentIndex = useRef(index);
  currentIndex.current = index;
  const canPlay = slides.length > 1;
  const rotating = canPlay && !interacting && !hidden;

  const goTo = (next: number) => {
    if (!track.current || !slides.length) return;
    const wrapped = (next + slides.length) % slides.length;
    cancelTransition.current();
    cancelTransition.current = animateSpotlightMove(track.current, wrapped, next >= index ? 1 : -1);
    setCurrent(wrapped);
  };

  useEffect(() => {
    const refresh = () => setHidden(document.hidden);
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => { cancelTransition.current(); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  useEffect(() => {
    // Do not advance during a swipe, but never leave autoplay paused after a click.
    const finishGesture = () => setInteracting(false);
    window.addEventListener("pointerup", finishGesture);
    window.addEventListener("pointercancel", finishGesture);
    window.addEventListener("blur", finishGesture);
    return () => { window.removeEventListener("pointerup", finishGesture); window.removeEventListener("pointercancel", finishGesture); window.removeEventListener("blur", finishGesture); };
  }, []);

  useEffect(() => {
    cancelTransition.current();
    setCurrent(0);
    track.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [signature]);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => goTo(index + 1), 8000);
    return () => window.clearTimeout(timer);
  }, [rotating, index, signature]);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const resize = new ResizeObserver(() => {
      cancelTransition.current();
      element.scrollTo({ left: currentIndex.current * element.clientWidth, behavior: "instant" });
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, [signature]);

  if (!slides.length) return null;
  return <section className="home-spotlight" aria-label={text("title")} onKeyDown={(event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); goTo(index + (event.key === "ArrowLeft" ? -1 : 1)); }
  }}>
    <div className="home-billboard">
      <div className="home-spotlight-track" ref={track} onPointerDown={() => { cancelTransition.current(); setInteracting(true); }} onScroll={(event) => {
        if (event.currentTarget.clientWidth) setCurrent(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth));
      }} aria-live={rotating ? "off" : "polite"}>
        {slides.map((slide, slideIndex) => <div className="home-spotlight-slide" key={slide.id} inert={slideIndex !== index} aria-label={`${text("slide")} ${slideIndex + 1} / ${slides.length}`}>
          <DestinationVisual destination={slide.destination} locale={locale} priority={slideIndex === 0} />
          {slide.event && <span className="home-spotlight-photo-note">{uiText(locale, "Location photo")}: {slide.destination.name}</span>}
          <div className="home-billboard-copy">
            <div><span>{slide.event ? translate(locale, "nav.events") : translate(locale, `category.${slide.destination.category}`)} · {slide.event ? <time dateTime={slide.event.date}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${slide.event.date}T00:00:00`))}</time> : slide.destination.city}</span><h2>{slide.event?.name ?? slide.destination.name}</h2></div>
            <button className="secondary-action icon-action" type="button" title={slide.event ? translate(locale, "common.checkEvents") : travelText(locale, "explore")} aria-label={`${slide.event ? translate(locale, "common.checkEvents") : travelText(locale, "explore")}: ${slide.event?.name ?? slide.destination.name}`} onClick={() => slide.event ? onOpenEvents(slide.event.id) : onOpenPlace(slide.destination.id)}><ArrowRight size={22} /></button>
          </div>
        </div>)}
      </div>
      {slides.length > 1 && <><button className="home-spotlight-arrow previous" type="button" aria-label={text("previous")} title={text("previous")} onClick={() => goTo(index - 1)}><ChevronLeft size={23} /></button><button className="home-spotlight-arrow next" type="button" aria-label={text("next")} title={text("next")} onClick={() => goTo(index + 1)}><ChevronRight size={23} /></button></>}
    </div>
    {slides.length > 1 && <div className="home-spotlight-controls"><div className="home-spotlight-dots">{slides.map((slide, slideIndex) => <button key={slide.id} type="button" aria-current={slideIndex === index ? "true" : undefined} aria-label={`${text("slide")} ${slideIndex + 1}: ${slide.event?.name ?? slide.destination.name}`} title={slide.event?.name ?? slide.destination.name} onClick={() => goTo(slideIndex)}><span /></button>)}</div><span className="home-spotlight-counter" aria-hidden="true">{index + 1} / {slides.length}</span></div>}
  </section>;
}
