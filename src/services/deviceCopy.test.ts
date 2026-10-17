import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DevicePrivacyPanel } from "../components/DevicePrivacyPanel";
import { TrackingStatus } from "../components/TrackingStatus";
import { TripExperience } from "../components/TripExperience";
import { initialData } from "../data/demoData";
import { deviceCopyKeys, deviceText } from "./deviceCopy";
import type { Locale } from "./i18n";

const locales: Locale[] = ["en", "ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"];
describe("device feedback in every supported language", () => {
  it("passes the separate GPS freshness signal through the actual Trips screen", () => {
    const noop = () => {};
    const props = { activeTrip: initialData.trips[0], points: [], destinations: [], nearbyPlaces: [], demand: [], summary: null, trackingMessage: null, isLiveTracking: true, locationRetryAvailable: false, geofenceWarnings: [], locale: "en" as const, onAllowLocation: noop, onStart: noop, onStop: noop, onResume: noop, onManage: noop, onOpenPlace: noop, onSafety: noop };
    const gpsFix = { ...initialData.points[0], source: "browser" as const, recordedAt: new Date().toISOString() };
    expect(renderToStaticMarkup(createElement(TripExperience, { ...props, gpsFix }))).toContain(deviceText("en", "receiving"));
    expect(renderToStaticMarkup(createElement(TripExperience, { ...props, gpsFix, gpsAttention: true }))).toContain(deviceText("en", "attention"));
    expect(renderToStaticMarkup(createElement(TripExperience, props))).toContain(deviceText("en", "waiting"));
  });
  it.each(locales)("has complete, localized copy and rendered controls for %s", (locale) => {
    for (const key of deviceCopyKeys) {
      expect(deviceText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(deviceText(locale, key)).not.toBe(deviceText("en", key));
    }
    const tracking = renderToStaticMarkup(createElement(TrackingStatus, { listening: true, locale }));
    expect(tracking).toContain(deviceText(locale, "waiting").replaceAll("'", "&#x27;"));
    expect(tracking).toContain('role="status"');
    const privacy = renderToStaticMarkup(createElement(DevicePrivacyPanel, { locale, onClear: async () => undefined }));
    expect(privacy).toContain(deviceText(locale, "privacyTitle").replaceAll("'", "&#x27;"));
    expect(privacy).toContain("<summary>");
  });
});
