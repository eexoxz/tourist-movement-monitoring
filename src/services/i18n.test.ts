import { describe, expect, it } from "vitest";
import { isLocale, localeOptions, translate } from "./i18n";

describe("i18n", () => {
  it("recognizes supported locales", () => {
    expect(localeOptions.map((option) => option.value)).toEqual(["en", "ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"]);
    expect(localeOptions.every((option) => isLocale(option.value))).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("translates core navigation labels", () => {
    expect(translate("en", "nav.home")).toBe("Home");
    expect(translate("ms", "nav.home")).toBe("Utama");
    expect(translate("zh", "nav.home")).toBe("首页");
    expect(translate("ja", "nav.home")).toBe("ホーム");
    expect(translate("ko", "nav.home")).toBe("홈");
    expect(translate("pt", "nav.home")).toBe("Início");
    expect(translate("ta", "nav.home")).toBe("முகப்பு");
    expect(translate("es", "nav.home")).toBe("Inicio");
    expect(translate("fr", "nav.home")).toBe("Accueil");
  });
});
