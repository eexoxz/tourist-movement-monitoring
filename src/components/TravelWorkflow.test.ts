import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { HomeDiscovery } from "./HomeDiscovery";
import { TripExperience } from "./TripExperience";

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
