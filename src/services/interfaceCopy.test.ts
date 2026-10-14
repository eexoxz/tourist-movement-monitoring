import { describe, expect, it } from "vitest";
import { localeOptions } from "./i18n";
import { interfaceKeys, interfaceText } from "./interfaceCopy";

describe("interface refinement language coverage", () => {
  for (const { value: locale } of localeOptions) it(`covers new interface labels in ${locale}`, () => {
    for (const key of interfaceKeys) {
      expect(interfaceText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(interfaceText(locale, key)).not.toBe(interfaceText("en", key));
    }
  });
});
