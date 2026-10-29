import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { localeOptions, translate } from "../services/i18n";
import { createTouristPassId } from "../services/checkInDeepLink";
import { TouristProfileForm } from "./TouristProfileForm";
import { TouristPassCard } from "./TouristPassCard";

const user = initialData.users.find((candidate) => candidate.role === "tourist")!;
describe("clean profile presentation", () => {
  for (const { value: locale } of localeOptions) it(`preserves profile controls and pass information in ${locale}`, () => {
    const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
    const form = renderToStaticMarkup(createElement(TouristProfileForm, {
      user, locale, title: t("tourist.profile.formTitle"), description: t("tourist.profile.formDescription"),
      primaryLabel: t("tourist.profile.saveProfile"), onSave: () => {},
    }));
    expect(form).not.toContain("<img");
    for (const key of ["tourist.profile.travelPace", "tourist.profile.travellingWith", "tourist.profile.walkingPreference"] as const) expect(form).not.toContain(renderToStaticMarkup(t(key)));
    expect(form.match(/class="preference-chip/g)).toHaveLength(6);
    expect(form).toContain(`<h3>`);
    for (const key of ["tourist.profile.preferredName", "tourist.profile.trackingSettings", "tourist.profile.emergencyContact", "tourist.profile.saveProfile"] as const) expect(form).toContain(renderToStaticMarkup(t(key)));
    expect(form).toContain('type="submit"');
    const pass = renderToStaticMarkup(createElement(TouristPassCard, { user, locale }));
    expect(pass).toContain(createTouristPassId(user));
    expect(pass).toContain('class="pass-identity"');
    expect(pass).toContain('class="pass-preferences"');
    expect(pass).toContain('data:image/svg+xml');
    expect(pass.indexOf('class="tourist-pass-qr"')).toBeLessThan(pass.indexOf('<dl'));
  });
  it("preserves the destination-specific compact check-in pass", () => {
    const destination = initialData.destinations[0];
    const html = renderToStaticMarkup(createElement(TouristPassCard, { user, destination, compact: true }));
    expect(html).toContain('class="tourist-pass-card compact"');
    expect(html).toContain(destination.name);
    expect(html).toContain('data:image/svg+xml');
    expect(html.indexOf('<dl')).toBeLessThan(html.indexOf('class="tourist-pass-qr"'));
    expect(html).not.toContain('class="pass-preferences"');
  });
  it("keeps first-time profile setup skippable", () => {
    const html = renderToStaticMarkup(createElement(TouristProfileForm, {
      user, title: "Set up your profile", description: "Your travel preferences", primaryLabel: "Save profile",
      onSave: () => {}, onSkip: () => {}, secondaryLabel: "Skip for now",
    }));
    expect(html).toContain('type="submit"');
    expect(html).toContain('type="button">Skip for now</button>');
  });
});
