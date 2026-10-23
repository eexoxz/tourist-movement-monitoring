import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { PlaceDiscovery } from "./PlaceDiscovery";
import { TouristProfileForm } from "./TouristProfileForm";
import { localeOptions, translate } from "../services/i18n";
import { reviewText } from "../services/reviewUpdateCopy";

const noop = () => {};
describe("supervisor-reviewed tourist interface", () => {
  it("does not add district filters or claim a state reference is the user's location", () => {
    const html = renderToStaticMarkup(createElement(PlaceDiscovery, {
      destinations: initialData.destinations, demand: [], recommendations: [], festivals: [], user: initialData.users[0], latestAnalysis: undefined,
      visitedIds: new Set<string>(), referencePoint: initialData.points[0], locale: "en", onSelectDestination: noop, onOpenEvents: noop, isBrowsingArea: true,
    }));
    expect(html).not.toContain("All Malaysia");
    expect(html).not.toContain(">Near me<");
    expect(html).not.toContain("km away");
    expect(html).toContain("Search places");
  });
  for (const { value: locale } of localeOptions) it(`requires identity fields in the editable ${locale} profile`, () => {
    const html = renderToStaticMarkup(createElement(TouristProfileForm, {
      user: { ...initialData.users[0], passportNumber: "", nationality: "" }, title: "Profile", description: "", primaryLabel: "Save", onSave: noop, locale,
    }));
    expect(html).toContain(renderToStaticMarkup(createElement(Fragment, null, reviewText(locale, "identity"))));
    expect(html).toContain(renderToStaticMarkup(createElement(Fragment, null, reviewText(locale, "identityRequired"))));
    expect(html).toMatch(/select required=""/);
    expect(html).toMatch(/<input\b[^>]*required=""[^>]*minLength="5"/);
    expect(html).toContain(translate(locale, "auth.nationality"));
  });
});
