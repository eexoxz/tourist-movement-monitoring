import { memo, useEffect, useState } from "react";
import { visitorText } from "../services/visitorInformationCopy";
import { CalendarDays, ChevronDown, ExternalLink } from "lucide-react";
import type { Destination, FestivalEvent } from "../types";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { interfaceText } from "../services/interfaceCopy";
import { uiText } from "../services/uiText";
import { formatFestivalStateSummaryLabel } from "../services/festivals";
import { DestinationVisual } from "./DestinationVisual";

function eventDescription(event: FestivalEvent, locale: Locale) {
  if (event.descriptions?.[locale]) return event.descriptions[locale]!;
  if (locale === "en") return event.description;
  const t = (key: TranslationKey) => translate(locale, key);
  const category = t(`tourist.events.category.${event.category}`);
  const scope = event.scope === "national" ? t("tourist.events.allMalaysia") : uiText(locale, formatFestivalStateSummaryLabel(event));
  const templates: Record<Locale, string> = {
    en: event.description,
    ms: `Acara ${category.toLowerCase()} ini boleh mempengaruhi pergerakan pelancong di ${scope}. Gunakan isyarat ini semasa merancang tarikh dan tempat lawatan.`,
    zh: `这项${category}活动可能会影响 ${scope} 的游客流动。规划日期和地点时，可把它作为参考。`,
    ja: `この${category}イベントは、${scope}周辺の観光客の動きに影響する可能性があります。日程や訪問先を決める参考にできます。`,
    ko: `이 ${category} 이벤트는 ${scope} 지역의 관광객 이동에 영향을 줄 수 있습니다. 날짜와 방문지를 계획할 때 참고하세요.`,
    pt: `Este evento de ${category.toLowerCase()} pode influenciar o movimento turístico em ${scope}. Use este sinal ao planear datas e locais de visita.`,
    ta: `இந்த ${category} நிகழ்வு ${scope} பகுதியில் சுற்றுலா நகர்வை பாதிக்கலாம். பயண தேதி மற்றும் இடங்களை திட்டமிட இதை பயன்படுத்தலாம்.`,
    es: `Este evento de ${category.toLowerCase()} puede influir en el movimiento turístico en ${scope}. Úsalo al planificar fechas y lugares de visita.`,
    fr: `Cet événement ${category.toLowerCase()} peut influencer le mouvement touristique à ${scope}. Utilisez ce signal pour planifier les dates et les lieux de visite.`,
  };
  return templates[locale];
}

function FestivalEventDetailsComponent({ event, destinationById, locale, initiallyOpen }: {
  event: FestivalEvent;
  destinationById: Map<string, Destination>;
  locale: Locale;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  useEffect(() => setOpen(initiallyOpen), [initiallyOpen]);
  // Closed disclosures do not mount photo components or prepare visiting details.
  const destinations = open ? event.destinationIds.flatMap((id) => {
    const destination = destinationById.get(id);
    return destination ? [destination] : [];
  }) : [];
  const planningSummary = destinations.length
    ? `These places may become busier around this event. Compare demand in ${Array.from(new Set(destinations.map((destination) => destination.city))).join(", ")} before planning a route.`
    : "No linked place has been added yet. Use current movement demand to find suitable nearby destinations for this state.";

  return <details className="festival-event-details" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><CalendarDays size={16} />{interfaceText(locale, "details")}<ChevronDown size={16} /></summary>
    {open && <>
      <p>{eventDescription(event, locale)}</p>
      {event.sourceUrl?.startsWith("https://") && <p className="festival-event-source"><a className="secondary-action compact-action" href={event.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />{visitorText(locale, "source")}</a>{event.sourceCheckedAt && <small>{visitorText(locale, "checked")}: <time dateTime={event.sourceCheckedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${event.sourceCheckedAt}T12:00:00Z`))}</time></small>}</p>}
      <div className="festival-insight-row">
        <small className="festival-planning-note">{uiText(locale, planningSummary)}</small>
        {destinations.length > 0 && <div className="festival-destinations">
          {destinations.slice(0, 3).map((destination) => <span key={destination.id}>
            <DestinationVisual destination={destination} compact locale={locale} />{destination.name}
          </span>)}
        </div>}
      </div>
    </>}
  </details>;
}

export const FestivalEventDetails = memo(FestivalEventDetailsComponent);
