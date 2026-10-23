import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { destinations } from "../data/destinations";
import { visitorInformation } from "../data/visitorInformation";
import type { Destination } from "../types";
import { localeOptions } from "../services/i18n";
import { localizeDestination } from "../services/destinationLocale";
import { visitorText } from "../services/visitorInformationCopy";
import { groupVisitorPrices, visitorDays, visitorPriceLabel } from "../services/visitorInformation";
import { PlacePracticalInfo } from "./PlacePracticalInfo";
import { AppRecoveryScreen } from "./AppErrorBoundary";
import { recoveryCopy } from "../services/recoveryCopy";

const catalogue = JSON.parse(readFileSync(new URL("../../catalogue/locations-2026-10.json", import.meta.url), "utf8")).places as Destination[];
const all = [...destinations, ...catalogue];
const hill = all.find((destination) => destination.id === "penang-hill")!;
const render = (destination: Destination, locale: Parameters<typeof visitorText>[0] = "en", now?: number) => renderToStaticMarkup(createElement(PlacePracticalInfo, { destination: localizeDestination(destination, locale), locale, now }));

describe("researched attraction practical information", () => {
  it("only refers to existing catalogue IDs with dated HTTPS evidence and valid rates", () => {
    expect(Object.keys(visitorInformation).length).toBeGreaterThanOrEqual(30);
    for (const [id, info] of Object.entries(visitorInformation)) {
      expect(all.some((destination) => destination.id === id), id).toBe(true);
      expect(info.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(info.sources.length).toBeGreaterThan(0);
      for (const url of info.sources) expect(new URL(url).protocol).toBe("https:");
      for (const row of info.prices ?? []) expect(Number.isFinite(row.amount) && row.amount >= 0).toBe(true);
      for (const row of info.hours ?? []) expect(row.time).toMatch(/\d{2}:\d{2}/);
    }
  });

  it.each(localeOptions)("retains real rates and times while translating all labels in $value", ({ value: locale }) => {
    const html = render(hill, locale);
    expect(html).toContain("06:30 - 23:00");
    expect(html).toContain(visitorText(locale, "normalReturn"));
    expect(html).toContain(visitorText(locale, "mykad"));
    expect(html).toContain(new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(16));
    expect(html).toContain("https://www.penanghill.gov.my/index.php/en/tickets");
    expect(html).toMatch(/datetime="2026-10-23"/i);
    expect(html).not.toContain("undefined");
    for (const info of Object.values(visitorInformation)) {
      for (const row of info.hours ?? []) if (row.label) expect(visitorText(locale, row.label)).toBeTruthy();
      for (const row of info.prices ?? []) expect(visitorPriceLabel(row, locale)).not.toContain("undefined");
      for (const note of [...info.hoursNotes ?? [], ...info.priceNotes ?? []]) expect(visitorText(locale, note)).toBeTruthy();
    }
  });

  it.each(localeOptions)("preserves administrator-authored facts in $value", ({ value: locale }) => {
    const custom = { ...hill, openingHours: "10:15 - 14:45 (special event)", feeNote: "Event admission RM 12.50" };
    const html = render(custom, locale);
    expect(html).toContain(custom.openingHours);
    expect(html).toContain(custom.feeNote);
    expect(html).not.toContain("06:30 - 23:00");
    expect(html).not.toContain(visitorText(locale, "checked"));
  });

  it.each(["new-unresearched-place", "constructor", "__proto__"])("does not represent unknown admission as free for %s", (id) => {
    const unknown = { ...hill, id, openingHours: undefined, feeNote: undefined };
    const html = render(unknown);
    expect(html).toContain(visitorText("en", "unknownPrice"));
    expect(html).not.toContain("RM 0");
    expect(html).not.toMatch(/datetime=/i);
  });

  it("uses verified portions without inventing unconfirmed fees or hours", () => {
    const market = all.find((destination) => destination.id === "central-market")!;
    expect(render(market)).toContain("10:00 - 22:00");
    expect(render(market)).toContain(visitorText("en", "unknownPrice"));
    const agnes = all.find((destination) => destination.id === "my-sabah-agnes-keith-house")!;
    expect(render(agnes)).toContain("RM 15.00");
    expect(render(agnes)).toContain(visitorText("en", "unknownHours"));
    expect(render({ ...market, openingHours: "Special hours 11:00 - 15:00" })).not.toContain(visitorText("en", "checked"));
  });

  it("shows closures and does not assume an automatic reopening", () => {
    const royal = all.find((destination) => destination.id === "my-federal-territories-royal-museum-kuala-lumpur")!;
    expect(render(royal, "en", Date.parse("2026-10-23"))).toContain(visitorText("en", "temporarilyClosed"));
    expect(render(royal, "en", Date.parse("2027-02-02"))).toContain(visitorText("en", "reopeningUnconfirmed"));
    expect(render(royal)).not.toContain("RM 0");
  });

  it("formats Malaysian weekdays without depending on the device timezone", () => {
    expect(visitorDays([0, 1, 5], "en")).toBe("Sun / Mon / Fri");
    expect(visitorDays([0, 1, 5], "zh")).not.toBe(visitorDays([0, 1, 5], "en"));
  });

  it("groups equivalent ticket eligibility once without losing rates", () => {
    const prices = visitorInformation["penang-hill"].prices!;
    const groups = groupVisitorPrices(prices);
    expect(groups.map((group) => group.residency)).toEqual(["mykad", "standard"]);
    expect(groups.flatMap((group) => group.rows)).toEqual(prices);
    expect(groups[0].rows).toHaveLength(3);
  });
});

describe("screen recovery presentation", () => {
  it.each(localeOptions)("provides a translated recovery action in $value", ({ value: locale }) => {
    const html = renderToStaticMarkup(createElement(AppRecoveryScreen, { locale }));
    expect(html).toContain('role="alert"');
    expect(html).toContain(recoveryCopy(locale).retry.replaceAll("'", "&#x27;"));
    expect(html).not.toContain("undefined");
  });
});
