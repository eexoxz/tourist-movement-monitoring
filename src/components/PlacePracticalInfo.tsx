import { Clock3, Coins, ExternalLink, TriangleAlert } from "lucide-react";
import type { Destination } from "../types";
import { translate, type Locale } from "../services/i18n";
import { isVisitSource } from "../services/visitDetails";
import { getDestinationVisitDetails, groupVisitorPrices, visitorDate, visitorDays, visitorHoursLabel, visitorPriceLabel, visitorValue } from "../services/visitorInformation";
import { visitorText } from "../services/visitorInformationCopy";

export function PlacePracticalInfo({ destination, locale, now = Date.now() }: { destination: Destination; locale: Locale; now?: number }) {
  const info = getDestinationVisitDetails(destination);
  const text = (key: Parameters<typeof visitorText>[1]) => visitorText(locale, key);
  const { closure } = info;
  const hasHours = Boolean(info.hours?.length || info.closedDays?.length || info.hoursNotes?.length);
  const hasPrices = Boolean(info.prices?.length || info.priceNotes?.length);
  const sources = info.sources.filter(isVisitSource);
  const formatPrice = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return <section className="place-practical-info">
    {closure && <p className="place-closure-notice"><TriangleAlert size={18} aria-hidden="true" /><span><strong>{text("temporarilyClosed")}</strong><br />{visitorDate(closure.from, locale)} {text("through")} {visitorDate(closure.through, locale)}{now > Date.parse(`${closure.through}T23:59:59+08:00`) && <><br />{text("reopeningUnconfirmed")}</>}</span></p>}
    <dl>
      <div>
        <dt><Clock3 size={16} aria-hidden="true" />{translate(locale, "common.openingHours")}</dt>
        <dd>
          {Boolean(info.hours?.length) && <ul className="place-fact-rows">{info.hours?.map((row, index) => <li key={index}><span>{visitorHoursLabel(row, locale) || text("hours")}</span><strong>{row.time}</strong></li>)}</ul>}
          {Boolean(info.closedDays?.length) && <p>{text("closed")}: {visitorDays(info.closedDays!, locale)}</p>}
          {info.hoursNotes?.map((note, index) => <p key={index}>{visitorValue(note, locale)}</p>)}
          {Boolean(info.hours?.length) && <small>{text("localTime")}</small>}
          {!hasHours && !closure && <p>{text("unknownHours")}</p>}
        </dd>
      </div>
      {!closure && <div>
        <dt><Coins size={16} aria-hidden="true" />{text("fees")}</dt>
        <dd>
          {info.priceScope && <p className="place-price-scope">{visitorValue(info.priceScope, locale)}</p>}
          {groupVisitorPrices(info.prices ?? []).map(({ residency, rows }, index) => <div className="place-rate-group" key={index}>
            {residency && <h4>{visitorValue(residency, locale)}</h4>}
            <ul className="place-fact-rows">{rows.map((row, index) => <li key={index}><span>{visitorPriceLabel({ ...row, residency: undefined }, locale)}</span><strong>RM {formatPrice.format(row.amount)}</strong></li>)}</ul>
          </div>)}
          {info.priceNotes?.map((note, index) => <p key={index}>{visitorValue(note, locale)}</p>)}
          {!hasPrices && <p>{text("unknownPrice")}</p>}
        </dd>
      </div>}
    </dl>
    {sources.length > 0 && <footer className="place-fact-sources">
      {info.checkedAt && <p>{text("checked")}: <time dateTime={info.checkedAt}>{visitorDate(info.checkedAt, locale)}</time></p>}
      <div>{sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />{text("source")}{sources.length > 1 ? ` ${index + 1}` : ""}</a>)}</div>
    </footer>}
  </section>;
}
