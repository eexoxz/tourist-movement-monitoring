import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { addItineraryStop, createItinerary } from "../services/itineraries";
import { snapshotItineraryDay } from "../services/tripItinerary";
import { tripPlanText } from "../services/tripItineraryCopy";
import { localeOptions } from "../services/i18n";
import { ItineraryTripSetup, TripItineraryProgress } from "./TripItineraryTools";

describe("trip itinerary presentation", () => {
  it("keeps optional setup and honest visit states available in all nine languages", () => {
    const user = initialData.users.find((item) => item.role === "tourist")!;
    const plan = { ...addItineraryStop(createItinerary(user.id, "User-written plan"), initialData.destinations[0], 1), revision: 1 };
    const trip = { id: "trip-ui", userId: user.id, status: "active" as const, startedAt: new Date().toISOString(), consentId: "consent", itinerary: snapshotItineraryDay(plan, user.id, 1, new Date().toISOString(), true)! };
    for (const { value: locale } of localeOptions) {
      const setup = renderToStaticMarkup(createElement(ItineraryTripSetup, { entries: [{ plan, dirty: false }], selection: { planId: plan.id, day: 1, reminders: false }, connection: "live", locale, onChange: () => {} }));
      expect(setup).toContain(tripPlanText(locale, "none"));
      expect(setup).toContain(tripPlanText(locale, "reminders"));
      const progress = renderToStaticMarkup(createElement(TripItineraryProgress, { trip, points: [], checkIns: [], destinations: initialData.destinations, locale, onOpenPlace: () => {} }));
      expect(progress).toContain(tripPlanText(locale, "planned"));
      expect(progress).toContain(tripPlanText(locale, "intent"));
      expect(progress).toContain("User-written plan");
    }
  });
});
