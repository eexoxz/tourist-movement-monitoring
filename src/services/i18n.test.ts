import { describe, expect, it } from "vitest";
import { isLocale, translate } from "./i18n";

describe("i18n", () => {
  it("recognizes supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ms")).toBe(true);
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("translates core navigation labels", () => {
    expect(translate("en", "nav.home")).toBe("Home");
    expect(translate("ms", "nav.home")).toBe("Utama");
    expect(translate("zh", "nav.home")).toBe("首页");
  });
});
