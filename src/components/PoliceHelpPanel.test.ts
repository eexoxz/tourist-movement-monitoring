import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PoliceHelpPanel } from "./PoliceHelpPanel";
import { emergencyHelpText, type EmergencyHelpCopyKey } from "../services/emergencyHelpCopy";
import { localeOptions } from "../services/i18n";
import type { SosAlert } from "../types";

const alert: SosAlert = { id: "test-sos", userId: "test-user", status: "open", message: "Test request", createdAt: "2026-10-03T10:00:00Z", updatedAt: "2026-10-03T10:00:00Z" };
const airItam = { latitude: 5.4, longitude: 100.28 };

describe("SOS police guidance", () => {
  it("shows address and explicit no-contact notice using the SOS snapshot, not a later location", () => {
    const markup = renderToStaticMarkup(createElement(PoliceHelpPanel, { alert: { ...alert, ...airItam }, fallbackPoint: { latitude: 3.15, longitude: 101.7 }, locale: "en" }));
    expect(markup).toContain("Balai Polis Ayer Itam");
    expect(markup).toContain("Jalan Paya Terubong");
    expect(markup).toContain("Police have not been contacted.");
    expect(markup).toContain("location attached to your SOS");
    expect(markup).toContain("Approximate straight-line distance");
    expect(markup).not.toContain("IPD Dang Wangi");
  });

  it("labels manual browsing as an area centre without adding GPS to the SOS", () => {
    const markup = renderToStaticMarkup(createElement(PoliceHelpPanel, { alert, fallbackPoint: airItam, fallbackIsArea: true, locale: "en" }));
    expect(markup).toContain("Balai Polis Ayer Itam");
    expect(markup).toContain("selected area centre, not your GPS");
    expect(alert.latitude).toBeUndefined();
  });

  it("gives useful empty states without a location or local catalogue coverage", () => {
    const missing = renderToStaticMarkup(createElement(PoliceHelpPanel, { alert, locale: "en" }));
    expect(missing).toContain("Allow location or choose an area");
    expect(missing).not.toContain("href=");
    const uncovered = renderToStaticMarkup(createElement(PoliceHelpPanel, { alert: { ...alert, latitude: 6.12, longitude: 100.37 }, locale: "en" }));
    expect(uncovered).toContain("No police station is listed within 50 km");
    expect(uncovered).not.toContain("Balai Polis Ayer Itam");
  });

  it("translates every new guidance and SOS message in all supported languages", () => {
    const keys: EmergencyHelpCopyKey[] = ["cancel", "confirmAction", "confirm", "recorded", "withLocation", "withoutLocation", "title", "purpose", "notContacted", "distance", "requestLocation", "currentLocation", "areaLocation", "noStation", "noLocation", "viewMap", "directions", "source"];
    for (const { value: locale } of localeOptions) {
      for (const key of keys) {
        expect(emergencyHelpText(locale, key).length).toBeGreaterThan(0);
        if (locale !== "en") expect(emergencyHelpText(locale, key)).not.toBe(emergencyHelpText("en", key));
      }
    }
  });
});
