import { MapPin } from "lucide-react";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { Destination } from "../types";
import { DestinationVisual } from "./DestinationVisual";

export function DestinationTeaser({ destination, locale, distance, onOpen }: {
  destination: Destination;
  locale: Locale;
  distance?: string;
  onOpen: (id: string) => void;
}) {
  return <button className="travel-place-tile" type="button" onClick={() => onOpen(destination.id)}>
    <DestinationVisual destination={destination} locale={locale} compact />
    <span className="travel-place-copy">
      <small>{translate(locale, `category.${destination.category}` as TranslationKey)}</small>
      <strong>{destination.name}</strong>
      <span><MapPin size={14} aria-hidden="true" />{destination.city}{distance && <small>{distance}</small>}</span>
    </span>
  </button>;
}
