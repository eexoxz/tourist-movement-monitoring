import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { localeOptions } from "../services/i18n";
import { interfaceText } from "../services/interfaceCopy";
import type { FestivalEvent } from "../types";
import { FestivalCalendarPanel } from "./FestivalCalendarPanel";
import { FestivalEventDetails } from "./FestivalEventDetails";

const date = new Date();
date.setDate(date.getDate() + 1);
const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const events: FestivalEvent[] = Array.from({ length: 100 }, (_, index) => ({
  id: `render-${index}`, name: `Rendering fixture ${index}`, date: localDate,
  scope: "national", states: [], category: "cultural",
  description: "Details prepared only when opened.",
  destinationIds: initialData.destinations.slice(0, 5).map((destination) => destination.id),
}));
const destinations = new Map(initialData.destinations.map((destination) => [destination.id, destination]));

describe("calendar rendering budget", () => {
  it("keeps a large calendar preview to six summaries without mounting closed photos", () => {
    const html = renderToStaticMarkup(createElement(FestivalCalendarPanel, { events, destinations: initialData.destinations }));
    expect(html.match(/class="festival-card festival-card-cultural"/g)).toHaveLength(6);
    expect(html.match(/class="festival-event-details"/g)).toHaveLength(6);
    expect(html).not.toContain("<img");
    expect(html).not.toContain(events[0].description);
    expect(html).toContain("(94)");
  });

  it("renders only the explicitly focused event photos and keeps their preview bounded", () => {
    const html = renderToStaticMarkup(createElement(FestivalCalendarPanel, { events, destinations: initialData.destinations, initialEventId: "render-99" }));
    expect(html).toContain("Rendering fixture 99");
    expect(html.match(/<img /g)).toHaveLength(3);
    expect(html).toContain(events[0].description);
    expect(html.indexOf("Rendering fixture 99")).toBeLessThan(html.indexOf("Rendering fixture 0"));
  });

  for (const { value: locale } of localeOptions) {
    it(`preserves lazy details and translated labels in ${locale}`, () => {
      const props = { event: events[0], destinationById: destinations, locale };
      const closed = renderToStaticMarkup(createElement(FestivalEventDetails, { ...props, initiallyOpen: false }));
      const opened = renderToStaticMarkup(createElement(FestivalEventDetails, { ...props, initiallyOpen: true }));
      expect(closed).toContain(interfaceText(locale, "details").replace(/'/g, "&#x27;"));
      expect(closed).not.toContain("festival-insight-row");
      expect(closed).not.toContain("<img");
      expect(opened.match(/<img /g)).toHaveLength(3);
      expect(opened).toContain('open=""');
      expect(opened).toContain("festival-planning-note");
    });
  }
});
