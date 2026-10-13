import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { HomeDiscovery } from "./HomeDiscovery";
import { TripExperience } from "./TripExperience";
import { TripDiary } from "./TripDiary";
import { DestinationManager } from "./DestinationManager";
import { UnlistedCheckInForm } from "./UnlistedCheckInForm";
import { HomeSpotlight } from "./HomeSpotlight";
import { FestivalCalendarPanel } from "./FestivalCalendarPanel";
import { calendarDay } from "../services/useCalendarDay";

vi.mock("./MovementMap", () => ({
  MovementMap: (props: { points: unknown[]; displayMode: string }) => createElement("div", { "data-route-points": props.points.length, "data-map-mode": props.displayMode }),
}));

const noop = () => undefined;
const homeProps: ComponentProps<typeof HomeDiscovery> = {
  featured: initialData.destinations[0], destinations: initialData.destinations.slice(0, 4), nextFestival: null,
  activeTrip: false, isLocal: false, needsLocationConsent: false, locale: "en",
  onOpenPlace: noop, onViewChange: noop, onAllowLocation: noop, onSafety: noop,
};
const tripProps: ComponentProps<typeof TripExperience> = {
  activeTrip: null, consent: initialData.consents[0], points: initialData.points.slice(0, 3),
  destinations: initialData.destinations, nearbyPlaces: [], demand: [], summary: null,
  trackingMessage: null, isLiveTracking: false, locationRetryAvailable: false, geofenceWarnings: [], locale: "en",
  onAllowLocation: noop, onStart: noop, onStop: noop, onResume: noop, onManage: noop, onOpenPlace: noop, onSafety: noop,
};

describe("tourist travel workflow boundaries", () => {
  it("keeps nationwide banner picks separate from nearby suggestions", () => {
    const html = renderToStaticMarkup(createElement(HomeDiscovery, { ...homeProps, destinations: [initialData.destinations[0]], spotlightDestinations: initialData.destinations }));
    expect(html).toContain("Kampung Baru");
    expect(html).toContain("Hin Bus Depot");
    expect(html).toContain("Penang Hill");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("Next spotlight");
    expect(html).not.toContain("Pause slideshow");
    expect(html).not.toContain("Play slideshow");
    expect(html.match(/class="home-spotlight-slide"/g)).toHaveLength(3);
    expect(html).toContain('loading="eager"');
    expect(html).toContain('inert=""');
  });
  it("does not show broken carousel controls for an empty or single-place catalogue", () => {
    const props = { locale: "en" as const, onOpenPlace: noop, onOpenEvents: noop };
    expect(renderToStaticMarkup(createElement(HomeSpotlight, { ...props, destinations: [] }))).toBe("");
    const single = renderToStaticMarkup(createElement(HomeSpotlight, { ...props, destinations: initialData.destinations.slice(0, 1) }));
    expect(single).not.toContain("Next spotlight");
    expect(single).not.toContain("home-spotlight-controls");
  });
  it("opens a spotlight event outside the selected area without expanding the entire calendar", () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const events = Array.from({ length: 8 }, (_, index) => ({ id: `focus-${index}`, name: `Festival ${index}`, date: calendarDay(date), scope: "state" as const, states: ["Selangor" as const], category: "cultural" as const, description: "Calendar fixture", destinationIds: [] }));
    const html = renderToStaticMarkup(createElement(FestivalCalendarPanel, { events, destinations: initialData.destinations, locale: "en", referenceState: "Penang", initialEventId: "focus-7" }));
    expect(html).toContain("Festival 7");
    expect(html.indexOf("Festival 7")).toBeLessThan(html.indexOf("Festival 0"));
    expect(html).not.toContain("Festival 6");
    expect(html).toContain("Show full 12-month calendar");
  });
  it("keeps the admin catalogue compact and removes decorative visit badges", () => {
    const html = renderToStaticMarkup(createElement(DestinationManager, { destinations: initialData.destinations, locale: "en", notify: noop, onChange: noop }));
    expect(html.match(/class="destination-card editable"/g)).toHaveLength(6);
    expect(html).toContain("Show more");
    expect(html).not.toContain("visit info");
    expect(html).not.toContain("min visit");
    expect(html).toContain("destination-admin-address");
  });
  it("makes unlisted check-ins address-based without consent or guessed coordinates", () => {
    const html = renderToStaticMarkup(createElement(UnlistedCheckInForm, { locale: "en", hasGps: false, onSubmit: () => null }));
    expect(html).toContain("Address only");
    expect(html).toContain("Select a state");
    expect(html).not.toContain("Latitude");
    expect(html).not.toContain("Longitude");
    expect(html).toContain('type="checkbox" disabled=""');
  });
  it("shows recorded-stop counts consistently instead of counting every nearby place", () => {
    const trip = initialData.trips[0];
    const place = initialData.destinations[0];
    const summary = { tripId: trip.id, pointCount: 1, distanceKm: 0, durationMinutes: 0, visitedDestinationCount: 0, averageAccuracyMeters: 20 };
    const props: ComponentProps<typeof TripDiary> = {
      trips: [trip], recentTrips: [trip], tripSummaries: [summary], selectedTrip: trip, selectedTripPoints: [], selectedTripSummary: summary,
      selectedTripTitle: "Nearby but not visited", selectedTripInsight: "", selectedTripSuggestionStatus: "Waiting", selectedTripDestinationNames: [], selectedTripRecommendations: [],
      fallbackPoints: [{ id: "nearby-only", tripId: trip.id, latitude: place.latitude, longitude: place.longitude, accuracyMeters: 20, recordedAt: new Date().toISOString(), source: "browser" }],
      destinations: initialData.destinations, hasPersonalizedRecommendations: false, locale: "en",
      onSelectTrip: noop, onViewRecommendations: noop, onOpenPlace: noop, onRenameTrip: noop, onDeleteTrip: noop,
    };
    const text = renderToStaticMarkup(createElement(TripDiary, props)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("0 Recognised stops");
    expect(text).not.toContain("1 Recognised stops");
  });
  it("keeps Home focused on discovery with an explicit Trips gateway", () => {
    const html = renderToStaticMarkup(createElement(HomeDiscovery, homeProps));
    expect(html).toContain("Go to Trips");
    expect(html).toContain("Explore this place");
    expect(html).toContain("Safety support");
    expect(html).not.toContain("Start Trip");
    expect(html).not.toContain("Stop Trip");
    expect(html).not.toContain("data-map-mode");
  });

  it("distinguishes regional discovery from actual nearby location context", () => {
    const global = renderToStaticMarkup(createElement(HomeDiscovery, homeProps));
    expect(global).not.toContain("Around you");
    const local = renderToStaticMarkup(createElement(HomeDiscovery, { ...homeProps, isLocal: true }));
    expect(local).toContain("Around you");
  });

  it("shows a dated event only when an event is provided", () => {
    const html = renderToStaticMarkup(createElement(HomeDiscovery, { ...homeProps, nextFestival: {
      id: "test-event", name: "Deepavali", date: "2026-11-08", scope: "national", states: [], category: "religious", description: "", destinationIds: [],
    } }));
    expect(html).toContain('dateTime="2026-11-08"');
    expect(html).toContain("Deepavali");
  });

  it("never presents old trips as the current idle journey", () => {
    const html = renderToStaticMarkup(createElement(TripExperience, tripProps));
    expect(html).toContain("Start Trip");
    expect(html).toContain("Manage trips");
    expect(html).toContain('data-route-points="0"');
    expect(html).toContain('data-map-mode="signals"');
  });

  it("requires permission before showing the recording action", () => {
    const html = renderToStaticMarkup(createElement(TripExperience, { ...tripProps, consent: null }));
    expect(html).toContain("Allow location");
    expect(html).not.toContain("Start Trip");
  });

  it("keeps active-route controls and recovery on Trips, not sample analytics", () => {
    const html = renderToStaticMarkup(createElement(TripExperience, { ...tripProps, activeTrip: { id: "test-trip", userId: "test-user", status: "active", startedAt: new Date().toISOString(), consentId: "test-consent" } }));
    expect(html).toContain("Stop Trip");
    expect(html).toContain("Resume tracking");
    expect(html).toContain('data-route-points="3"');
    expect(html).not.toContain("Add test movement");
    expect(html).not.toContain("Latitude");
  });
});
