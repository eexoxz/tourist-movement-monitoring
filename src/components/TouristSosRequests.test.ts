import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TouristSosRequests } from "./TouristSosRequests";
import { localeOptions } from "../services/i18n";
import { sosText, type SosCopyKey } from "../services/sosCopy";
import type { SosAlert } from "../types";

const alert: SosAlert = { id: "one", userId: "test", status: "open", message: "Test", createdAt: "2026-10-03T10:00:00Z", updatedAt: "2026-10-03T10:00:00Z" };
const render = (alerts: SosAlert[], locale = "en" as const) => renderToStaticMarkup(createElement(TouristSosRequests, { alerts, locale, onClose: () => {} }));

describe("tourist SOS controls", () => {
  it("exposes actions for all three old duplicate requests", () => {
    const markup = render([alert, { ...alert, id: "two", status: "reviewing" }, { ...alert, id: "three" }]);
    expect(markup.match(/Cancel request/g)).toHaveLength(3);
    expect(markup.match(/Help received<\/button>/g)).toHaveLength(3);
  });
  it("keeps closed history separate with a truthful reason and no closure buttons", () => {
    const markup = render([{ ...alert, status: "resolved", closureReason: "cancelled" }]);
    expect(markup).toContain("Request cancelled");
    expect(markup).toContain("Closed requests");
    expect(markup).not.toContain("Cancel request</button>");
    expect(render([{ ...alert, status: "resolved" }])).toContain("Help received / resolved");
  });
  it("bounds the initial list but offers access to every request", () => {
    const markup = render(Array.from({ length: 10 }, (_, index) => ({ ...alert, id: String(index) })));
    expect(markup.match(/Cancel request/g)).toHaveLength(3);
    expect(markup).toContain("Show all requests");
  });
  it("provides all new copy in every supported language", () => {
    const keys: SosCopyKey[] = ["cancelRequest", "helpReceived", "cancelled", "resolved", "confirmCancel", "confirmResolve", "confirm", "keepOpen", "activeExists", "saved", "savedDetail", "requests", "history", "showMore", "showLess", "newRequest", "syncUnavailable", "syncDetail", "syncPending"];
    for (const { value: locale } of localeOptions) {
      const markup = renderToStaticMarkup(createElement(TouristSosRequests, { alerts: [alert], locale, onClose: () => {} }));
      expect(markup).toContain(sosText(locale, "cancelRequest"));
      for (const key of keys) {
        expect(sosText(locale, key)).toBeTruthy();
        if (locale !== "en") expect(sosText(locale, key)).not.toBe(sosText("en", key));
      }
    }
  });
});
