import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { getTouristWorkspaceData } from "../services/touristWorkspace";
import { localeOptions } from "../services/i18n";
import { tripLayoutKeys, tripLayoutText } from "../services/tripLayoutCopy";
import { TripDiary } from "./TripDiary";

it("keeps saved-trip review actions, clickable stops and comparison in every language without the duplicate explanations", () => {
  const user = initialData.users.find((item) => item.role === "tourist")!;
  const state = getTouristWorkspaceData(initialData, user.id, "");
  const noop = () => {};
  for (const { value: locale } of localeOptions) {
    const html = renderToStaticMarkup(createElement(TripDiary, {
      trips: state.userTrips, recentTrips: state.recentTrips, tripSummaries: state.tripSummaries,
      selectedTrip: state.selectedTrip, selectedTripPoints: state.selectedTripPoints, selectedTripSummary: state.selectedTripSummary,
      selectedTripTitle: "Saved route", selectedTripDestinationNames: state.selectedTripDestinationNames,
      selectedTripRecommendations: state.selectedTripRecommendations, fallbackPoints: state.tripPoints,
      destinations: initialData.destinations, locale, onSelectTrip: noop, onViewRecommendations: noop, onOpenPlace: noop,
      onRenameTrip: noop, onDeleteTrip: noop, itineraryComparison: createElement("p", null, "Plan comparison"),
    }));
    expect(html).toContain("Plan comparison");
    expect(html).toContain('class="trip-options"');
    expect(html).toContain('class="trip-review-metrics"');
    expect(html).toContain('class="trip-visited-places"');
    expect(html).not.toContain('class="trip-guidance-panel"');
    expect(html).not.toContain('class="trip-insight"');
    for (const key of tripLayoutKeys) {
      expect(tripLayoutText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(tripLayoutText(locale, key)).not.toBe(tripLayoutText("en", key));
    }
  }
});
