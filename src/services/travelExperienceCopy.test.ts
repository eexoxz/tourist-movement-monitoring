import { describe, expect, it } from "vitest";
import { localeOptions } from "./i18n";
import { travelExperienceKeys, travelText } from "./travelExperienceCopy";

describe("travel experience language coverage", () => {
  for (const { value: locale } of localeOptions) {
    it(`provides every new travel workflow label in ${locale}`, () => {
      for (const key of travelExperienceKeys) {
        expect(travelText(locale, key).trim(), key).not.toBe("");
        if (locale !== "en") expect(travelText(locale, key), key).not.toBe(travelText("en", key));
      }
    });
  }
});
