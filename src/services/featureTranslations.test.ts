import { describe, expect, it } from "vitest";
import { localeOptions, type Locale } from "./i18n";
import { featureTranslation, featureTranslationSource, registerFeatureCopy, registeredFeatureCopy } from "./featureTranslations";
import { notificationSource, uiText } from "./uiText";
import { destinationAdminText } from "./destinationAdminCopy";
import { demoControlsText } from "./demoDatasetControlsCopy";
import { deviceText } from "./deviceCopy";

// Exercise every standalone feature dictionary, including lazy itinerary screens.
import.meta.glob("./*Copy.ts", { eager: true });
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("feature message translation bridge", () => {
  it("covers all registered feature messages and preserves placeholders in every language", () => {
    expect(registeredFeatureCopy().length).toBeGreaterThan(200);
    for (const { source, translations } of registeredFeatureCopy()) for (const { value: locale } of localeOptions) {
      expect(translations[locale]?.trim(), `${locale}: ${source}`).toBeTruthy();
      expect(placeholders(translations[locale]), `${locale}: ${source}`).toEqual(placeholders(source));
    }
  });

  it("keeps photo, device and generated demo messages translatable after any language switch", () => {
    for (const { value: from } of localeOptions) {
      const sources = [destinationAdminText(from, "photoSaved"), deviceText(from, "privacyTitle"), demoControlsText(from, "loaded", { count: 20, points: 80 })];
      for (const message of sources) {
        const stable = notificationSource(from, message);
        for (const { value: to } of localeOptions) {
          expect(uiText(to, stable)).toBe(uiText(to, notificationSource("en", stable)));
          if (to !== "en") expect(uiText(to, stable)).not.toBe(stable);
        }
      }
    }
  });

  it("translates storage modes and combined registration messages without altering user text", () => {
    for (const { value: locale } of localeOptions.filter(({ value }) => value !== "en")) {
      for (const source of ["Firestore collections", "Firestore collections + local backup"]) expect(uiText(locale, source)).not.toBe(source);
      const parts = ["Account created. Check your email for the Firebase verification link, then log in after verifying.", "Your profile is saved on this device and will retry cloud sync when you next log in."];
      expect(uiText(locale, parts.join("\n"))).toBe(parts.map((part) => uiText(locale, part)).join("\n"));
    }
    const privateText = "My own café: {name} <hello>\nSecond line $&";
    expect(uiText("ja", privateText)).toBe(privateText);
    expect(notificationSource("fr", privateText)).toBe(privateText);
  });

  it("preserves captured values, punctuation and repeated placeholders in message templates", () => {
    const messages = Object.fromEntries(localeOptions.map(({ value }) => [value, value === "en" ? "Audit ({name}): {count} + {count}" : `${value} ({name}): {count} + {count}`])) as Record<Locale, string>;
    registerFeatureCopy(["fixture"], (locale) => messages[locale]);
    const source = "Audit ({museum} $& <Cafe>): 20 + 20";
    const translated = featureTranslation("ja", source)!;
    expect(translated).toBe("ja ({museum} $& <Cafe>): 20 + 20");
    expect(featureTranslationSource("ja", translated)).toBe(source);
    expect(featureTranslation("ja", "Audit (Cafe): 20 + 21")).toBeUndefined();
  });
});
