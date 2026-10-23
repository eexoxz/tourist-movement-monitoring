import { Clock3, Coins, ExternalLink, TriangleAlert } from "lucide-react";
import type { Destination } from "../types";
import { translate, type Locale } from "../services/i18n";
import { hasCustomDestinationFact } from "../services/destinationLocale";
import { getVisitorInformation, groupVisitorPrices, visitorDate, visitorDays, visitorHoursLabel, visitorPriceLabel } from "../services/visitorInformation";
import { visitorText } from "../services/visitorInformationCopy";

export function PlacePracticalInfo({ destination, locale, now = Date.now() }: { destination: Destination; locale: Locale; now?: number }) {
  const info = getVisitorInformation(destination.id);
  const customHours = hasCustomDestinationFact(destination, "openingHours");
  const customPrice = hasCustomDestinationFact(destination, "feeNote");
  const useHours = Boolean(info && !customHours);
  const usePrice = Boolean(info && !customPrice);
  const showSources = info && (info.closure || (useHours && (info.hours?.length || info.hoursNotes?.length)) || (usePrice && info.prices?.length));
  const text = (key: Parameters<typeof visitorText>[1]) => visitorText(locale, key);
  const closure = info?.closure;
  return <section className="place-practical-info">
    {closure && <p className="place-closure-notice"><TriangleAlert size={18} aria-hidden="true" /><span><strong>{text("temporarilyClosed")}</strong><br />{visitorDate(closure.from, locale)} {text("through")} {visitorDate(closure.through, locale)}{now > Date.parse(`${closure.through}T23:59:59+08:00`) && <><br />{text("reopeningUnconfirmed")}</>}</span></p>}
    <dl>
      <div><dt><Clock3 size={16} aria-hidden="true" />{translate(locale, "common.openingHours")}</dt><dd>
        {customHours ? <p>{destination.openingHours}</p> : useHours && info?.hours?.length ? <ul className="place-fact-rows">{info.hours.map((row, index) => <li key={index}><span>{visitorHoursLabel(row, locale)}</span><strong>{row.time}</strong></li>)}</ul> : !closure && !info?.hoursNotes?.length && <p>{text("unknownHours")}</p>}
        {useHours && info?.closedDays?.length && <p>{text("closed")}: {visitorDays(info.closedDays, locale)}</p>}
        {useHours && info?.hoursNotes?.map((note) => <p key={note}>{text(note)}</p>)}
        {useHours && info?.hours?.length && <small>{text("localTime")}</small>}
      </dd></div>
      {!closure && <div><dt><Coins size={16} aria-hidden="true" />{translate(locale, "common.feeNote")}</dt><dd>
        {customPrice ? <p>{destination.feeNote}</p> : usePrice && info?.prices?.length ? <>
          {info.priceScope && <p className="place-price-scope">{text(info.priceScope)}</p>}
          {groupVisitorPrices(info.prices).map(({ residency, rows }) => <div className="place-rate-group" key={residency ?? "all"}>
            {residency && <h4>{text(residency)}</h4>}
            <ul className="place-fact-rows">{rows.map((row, index) => <li key={index}><span>{visitorPriceLabel({ ...row, residency: undefined }, locale)}</span><strong>RM {new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(row.amount)}</strong></li>)}</ul>
          </div>)}
        </> : <p>{text("unknownPrice")}</p>}
        {usePrice && info?.priceNotes?.map((note) => <p key={note}>{text(note)}</p>)}
      </dd></div>}
    </dl>
    {showSources && <footer className="place-fact-sources"><p>{text("checked")}: <time dateTime={info.checkedAt}>{visitorDate(info.checkedAt, locale)}</time></p><p>{text("notice")}</p><div>{info.sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />{text("source")}{info.sources.length > 1 ? ` ${index + 1}` : ""}</a>)}</div></footer>}
  </section>;
}
