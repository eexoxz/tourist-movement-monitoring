import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { HomeDiscovery } from "./HomeDiscovery";
import { TripExperience } from "./TripExperience";
import { TripDiary } from "./TripDiary";
import { DestinationManager } from "./DestinationManager";
import { UnlistedCheckInForm } from "./UnlistedCheckInForm";
import { UnlistedPlaceReview } from "./UnlistedPlaceReview";
import { sampleUnlistedCheckIns } from "../services/unlistedPlaces";
import { HomeSpotlight } from "./HomeSpotlight";
import { FestivalCalendarPanel } from "./FestivalCalendarPanel";
import { calendarDay } from "../services/useCalendarDay";
import { PlaceDiscovery } from "./PlaceDiscovery";
import { TripActionDialog } from "./TripActionDialog";
import { localeOptions, translate } from "../services/i18n";
import { calculateDestinationDemand } from "../services/analytics";
import { localizeDestinations } from "../services/destinationLocale";
import { PlaceGuide } from "./PlaceGuide";
import { PlaceGuideDialog } from "./PlaceGuideDialog";
import { AdminWorkspace } from "../workspaces/AdminWorkspace";

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
  it("keeps useful visiting information and direct actions in the place guide", () => {
    const destination = initialData.destinations[0];
    const html = renderToStaticMarkup(createElement(PlaceGuide, { destination, locale: "en", distance: "1.2 km away", distanceLabel: "Distance", demand: "Low demand", preference: "Matches your profile", eventRelevance: "Upcoming event", onCheckIn: noop, onOpenEvents: noop, onHide: noop }));
    expect(html).toContain("Plan your visit");
    expect(html).toContain("Opening hours");
    expect(html).toContain("Fee note");
    expect(html).toContain("Check in");
    expect(html).toContain("Directions");
    expect(html).toContain("1.2 km away");
    expect(html).toContain("Low demand");
    expect(html).toContain("More about this place");
    expect(html).toContain(`https://www.openstreetmap.org/directions?to=${destination.latitude}%2C${destination.longitude}`);
    const dialog = renderToStaticMarkup(createElement(PlaceGuideDialog, { title: destination.name, locale: "en", onClose: noop, children: createElement("p", null, "Guide") }));
    expect(dialog).toContain("<dialog");
    expect(dialog).toContain("Close place details");
  });
  it("distinguishes an active recording from a trip needing location recovery", () => {
    const activeTrip = { id: "active", userId: "tourist-demo", status: "active" as const, startedAt: new Date().toISOString(), consentId: "consent" };
    const live = renderToStaticMarkup(createElement(TripExperience, { ...tripProps, activeTrip, isLiveTracking: true }));
    expect(live).toContain("Recording");
    expect(live).toContain("is-recording");
    const startNew = vi.fn(), resume = vi.fn();
    const recovering = renderToStaticMarkup(createElement(TripExperience, { ...tripProps, activeTrip, isLiveTracking: false, onStartNew: startNew, onResume: resume }));
    expect(recovering).toContain("Not recording");
    expect(recovering).toContain("An unfinished trip is saved");
    expect(recovering).toContain("Start a new trip");
    expect(recovering).toContain("Finish saved trip");
    expect(recovering).toContain("Resume tracking");
    expect(recovering).not.toContain("is-recording");
    expect(startNew).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });
  it("keeps admin priority navigation connected to real pending cases and reviews", () => {
    const html = renderToStaticMarkup(createElement(AdminWorkspace, { data: initialData, actor: initialData.users.find((user) => user.role === "admin")!, view: "dashboard", locale: "en", onDataChange: noop, onViewChange: noop, notify: noop }));
    expect(html).toContain("Needs your attention");
    expect(html).toContain("Unlisted places to review");
    expect(html).toContain('id="admin-movement-alerts"');
    expect(html).toContain('class="admin-planning-disclosure"');
    expect(html).toContain('aria-pressed="true"');
  });
  for (const { value: locale } of localeOptions) it(`keeps redesigned Places data and dialog labels in ${locale}`, () => {
    const destination = initialData.destinations[0];
    const html = renderToStaticMarkup(createElement(PlaceDiscovery, {
      destinations: [destination], demand: calculateDestinationDemand(initialData), recommendations: initialData.recommendations,
      user: initialData.users.find((user) => user.id === "tourist-demo")!, latestAnalysis: initialData.analyses[0],
      festivals: [{ id: "card-event", name: "Card event", date: "2026-10-20", scope: "national", states: [], category: "cultural", description: "", destinationIds: [destination.id] }],
      visitedIds: new Set<string>(), referencePoint: initialData.points[0], locale, onSelectDestination: noop, onOpenEvents: noop,
    }));
    expect(html).toContain(localizeDestinations([destination], locale)[0].name);
    expect(html).toContain('class="place-card-address"');
    expect(html).toContain('class="place-card-meta"');
    expect(html).toContain('class="place-card-signals"');
    expect(html).toContain(translate(locale, "tourist.places.eventLinked"));
    expect(html).toContain(translate(locale, "tourist.places.newToYou"));
    expect(html).toContain('aria-pressed="true"');
    const dialog = renderToStaticMarkup(createElement(TripActionDialog, { kind: "stop", label: "", locale, onLabelChange: noop, onConfirm: noop, onCancel: noop }));
    expect(dialog).toContain('aria-describedby="trip-dialog-description"');
    expect(dialog).toContain('class="trip-dialog-actions"');
    expect(dialog).toContain(translate(locale, "tourist.home.stopTrip"));
  });
  it("keeps the rename dialog's field and submit control", () => {
    const html = renderToStaticMarkup(createElement(TripActionDialog, { kind: "rename", label: "My journey", locale: "en", onLabelChange: noop, onConfirm: noop, onCancel: noop }));
    expect(html).toContain('value="My journey"');
    expect(html).toContain("Save changes");
    expect(html).not.toContain('aria-describedby="trip-dialog-description"');
  });
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
    const html = renderToStaticMarkup(createElement(DestinationManager, { destinations: initialData.destinations, locale: "en", notify: noop, onChange: noop, onSave: async () => true }));
    expect(html.match(/class="destination-card editable"/g)).toHaveLength(6);
    expect(html).toContain("Show more");
    expect(html).not.toContain("visit info");
    expect(html).not.toContain("min visit");
    expect(html).toContain("destination-admin-address");
  });
  it("makes unlisted check-ins address-based without consent or guessed coordinates", () => {
    const html = renderToStaticMarkup(createElement(UnlistedCheckInForm, { locale: "en", initialMode: "manual", onLocate: async () => ({}), onSubmit: () => null }));
    expect(html).toContain("Address");
    expect(html).toContain("Select a state");
    expect(html).not.toContain("Latitude");
    expect(html).not.toContain("Longitude");
    expect(html).toContain('minLength="8"');
  });
  it("offers GPS first without requiring a street address or guessing the state", () => {
    const html = renderToStaticMarkup(createElement(UnlistedCheckInForm, { locale: "en", onLocate: async () => ({}), onSubmit: () => null }));
    expect(html).toContain("Use my current location");
    expect(html).toContain("Address details (optional)");
    expect(html).not.toContain('minLength="8"');
    expect(html).not.toContain("Latitude");
  });
  it("does not report an empty review queue when Firebase cannot connect", () => {
    const html = renderToStaticMarkup(createElement(UnlistedPlaceReview, { checkIns: [], destinations: [], locale: "en", placeQueueState: "offline", onCreate: noop, onReview: noop }));
    expect(html).toContain("The review queue could not connect");
    expect(html).not.toContain("No unlisted places are awaiting review");
  });
  it("labels removable samples and defers their maps until reports are expanded", () => {
    const html = renderToStaticMarkup(createElement(UnlistedPlaceReview, { checkIns: sampleUnlistedCheckIns(), destinations: [], locale: "en", onCreate: noop, onReview: noop, onToggleSamples: noop }));
    expect(html).toContain("Remove sample check-ins");
    expect(html).toContain("not real visitor activity");
    expect(html).not.toContain('class="check-in-location-map"');
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
    expect(html).toContain("Finish saved trip");
    expect(html).toContain("Resume tracking");
    expect(html).toContain('data-route-points="3"');
    expect(html).not.toContain("Add test movement");
    expect(html).not.toContain("Latitude");
  });
});
