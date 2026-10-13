import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Destination, FestivalEvent } from "../types";
import { translate, type Locale } from "../services/i18n";
import { buildHomeSpotlights } from "../services/homeSpotlights";
import { spotlightText } from "../services/spotlightCopy";
import { travelText } from "../services/travelExperienceCopy";
import { useCalendarDay } from "../services/useCalendarDay";
import { uiText } from "../services/uiText";
import { DestinationVisual } from "./DestinationVisual";

export function HomeSpotlight({ destinations, events = [], locale, onOpenPlace, onOpenEvents }: { destinations: Destination[]; events?: FestivalEvent[]; locale: Locale; onOpenPlace: (id: string) => void; onOpenEvents: (id: string) => void }) {
  const today = useCalendarDay();
  const slides = useMemo(() => buildHomeSpotlights(destinations, events, today), [destinations, events, today]);
  const signature = slides.map((slide) => slide.id).join("|");
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const text = (key: Parameters<typeof spotlightText>[1]) => spotlightText(locale, key);
  const index = Math.min(current, Math.max(0, slides.length - 1));
  const currentIndex = useRef(index);
  currentIndex.current = index;
  const canPlay = slides.length > 1 && !reducedMotion;
  const rotating = canPlay && !paused && !hovered && !hidden;

  const goTo = (next: number, manual = true) => {
    if (!track.current || !slides.length) return;
    if (manual) setPaused(true);
    const wrapped = (next + slides.length) % slides.length;
    track.current.scrollTo({ left: wrapped * track.current.clientWidth, behavior: reducedMotion ? "instant" : "smooth" });
    setCurrent(wrapped);
  };

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const refresh = () => { setReducedMotion(motion.matches); setHidden(document.hidden); };
    refresh();
    motion.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { motion.removeEventListener("change", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  useEffect(() => {
    setCurrent(0);
    track.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [signature]);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => goTo(index + 1, false), 8000);
    return () => window.clearTimeout(timer);
  }, [rotating, index, signature]);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const resize = new ResizeObserver(() => element.scrollTo({ left: currentIndex.current * element.clientWidth, behavior: "instant" }));
    resize.observe(element);
    return () => resize.disconnect();
  }, [signature]);

  if (!slides.length) return null;
  return <section className="home-spotlight" aria-label={text("title")} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setPaused(true)} onKeyDown={(event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); goTo(index + (event.key === "ArrowLeft" ? -1 : 1)); }
  }}>
    <div className="home-billboard">
      <div className="home-spotlight-track" ref={track} onPointerDown={() => setPaused(true)} onWheel={() => setPaused(true)} onScroll={(event) => {
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
    {slides.length > 1 && <div className="home-spotlight-controls"><div className="home-spotlight-dots">{slides.map((slide, slideIndex) => <button key={slide.id} type="button" aria-current={slideIndex === index ? "true" : undefined} aria-label={`${text("slide")} ${slideIndex + 1}: ${slide.event?.name ?? slide.destination.name}`} title={slide.event?.name ?? slide.destination.name} onClick={() => goTo(slideIndex)}><span /></button>)}</div><span className="home-spotlight-counter" aria-hidden="true">{index + 1} / {slides.length}</span>{canPlay && <button className="home-spotlight-play" type="button" aria-label={text(paused ? "play" : "pause")} title={text(paused ? "play" : "pause")} onClick={() => setPaused(!paused)}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>}</div>}
  </section>;
}
