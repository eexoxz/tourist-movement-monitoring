import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeDiscovery } from "./HomeDiscovery";
import { TrackingStatus } from "./TrackingStatus";
import { ActivityBasis } from "./ActivityBasis";
import { PlaceDiscovery } from "./PlaceDiscovery";
import { AuthScreen } from "./AuthScreen";
import { initialData } from "../data/demoData";
import { localeOptions, translate } from "../services/i18n";
import { travelerStatusText } from "../services/travelerStatusCopy";
import { activityText } from "../services/activityCopy";

const noop = () => {};
const user = initialData.users.find((user) => user.role === "tourist")!;
describe("review fixes", () => {
  for (const { value: locale } of localeOptions) it(`keeps status, activity evidence and sign-in text localized in ${locale}`, () => {
    const html = renderToStaticMarkup(createElement(TrackingStatus, { listening: false, locale, syncStatus: "Saved to local browser storage", point: initialData.points[0] }));
    expect(html).toContain(travelerStatusText(locale, "paused"));
    expect(html).toContain(travelerStatusText(locale, "latest"));
    expect(html).toContain(travelerStatusText(locale, "cloud"));
    const basis = renderToStaticMarkup(createElement(ActivityBasis, { destinations: [], user: { ...user, authUid: "test", sampleActivityEnabled: false }, locale }));
    expect(basis).toContain(travelerStatusText(locale, "basis").replace(/'/g, "&#x27;"));
    expect(translate(locale, "auth.firebaseMode")).not.toContain("Firebase");
  });
  it("prioritizes an active journey before the billboard, but leaves idle Home discovery-first", () => {
    const props = { destinations: initialData.destinations.slice(0, 3), locale: "en" as const, nextFestival: null, isLocal: true, needsLocationConsent: false, onOpenPlace: noop, onViewChange: noop, onAllowLocation: noop, onSafety: noop };
    const active = renderToStaticMarkup(createElement(HomeDiscovery, { ...props, activeTrip: true }));
    expect(active.indexOf('class="home-journey-invitation"')).toBeLessThan(active.indexOf('class="home-spotlight"'));
    expect(active).not.toContain("Stop Trip");
    const idle = renderToStaticMarkup(createElement(HomeDiscovery, { ...props, activeTrip: false }));
    expect(idle.indexOf('class="home-spotlight"')).toBeLessThan(idle.indexOf('class="home-journey-invitation"'));
  });
  it("does not label absent activity evidence as low demand or claim an unselected interest", () => {
    const destination = initialData.destinations[0];
    const props = { destinations: [destination], demand: [], festivals: [], recommendations: [], latestAnalysis: undefined, visitedIds: new Set<string>(), locale: "en" as const, onSelectDestination: noop, onOpenEvents: noop };
    const selected = renderToStaticMarkup(createElement(PlaceDiscovery, { ...props, user: { ...user, travelPreferences: [destination.category] } }));
    expect(selected).toContain("Matches your interest:");
    expect(selected).toContain(activityText("en", "noEvidence"));
    expect(selected).not.toContain("low demand");
    const unselected = renderToStaticMarkup(createElement(PlaceDiscovery, { ...props, user: { ...user, travelPreferences: [] } }));
    expect(unselected).not.toContain("Matches your interest:");
  });
  it("renders a blank password field on sign-in", () => {
    const html = renderToStaticMarkup(createElement(AuthScreen, { mode: "login", locale: "en", onLocaleChange: noop, onModeChange: noop, onLogin: async () => ({}), onRegister: async () => ({}), onResendVerification: async () => ({}), onPasswordReset: async () => ({}), notify: noop }));
    expect(html).toContain('autoComplete="current-password" required="" minLength="6" value=""');
    expect(html).toContain("Sign in");
  });
});
