import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { hasTouristIdentity, normalizeIdentity } from "../services/touristIdentity";
import { localeOptions, translate } from "../services/i18n";
import { IdentityNumberField } from "./IdentityNumberField";
import { AuthScreen } from "./AuthScreen";
import { TouristProfileForm } from "./TouristProfileForm";

const noop = () => {};
const textMarkup = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));
const authProps = { locale: "en" as const, onLocaleChange: noop, onModeChange: noop, onLogin: async () => ({}), onRegister: async () => ({}), onResendVerification: async () => ({}), onPasswordReset: async () => ({}), notify: noop };

describe("neutral passport and ID guidance", () => {
  it.each(localeOptions)("provides translated, collapsed help in $value without a country-specific example", ({ value: locale }) => {
    const html = renderToStaticMarkup(createElement(IdentityNumberField, { value: "", onChange: noop, locale }));
    for (const key of ["auth.passportHint", "auth.identityPlaceholder", "auth.passportHelpTitle", "auth.passportHelpLocation", "auth.passportHelpAvoid", "auth.passportHelpId", "auth.passportHelpAccuracy"] as const) {
      const copy = translate(locale, key);
      expect(copy).not.toBe(key);
      if (locale !== "en") expect(copy).not.toBe(translate("en", key));
      expect(html).toContain(textMarkup(copy));
    }
    expect(html).toContain('<details class="identity-number-help">');
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|>)/);
    expect(html).not.toContain("A12345678");
    expect(html).not.toContain("undefined");
  });

  it("associates the input with its label and short hint and preserves existing constraints", () => {
    const html = renderToStaticMarkup(createElement(IdentityNumberField, { value: "TEST12345", onChange: noop, locale: "en", invalid: true }));
    const id = html.match(/<input id="([^"]+)"/)![1];
    expect(html).toContain(`<label for="${id}">`);
    expect(html).toContain(`aria-describedby="${id}-hint"`);
    expect(html).toContain(`id="${id}-hint"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('required="" minLength="5" maxLength="28"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('autoCapitalize="characters"');
    expect(html).toContain('spellCheck="false"');
    expect(html).not.toContain('type="number"');
    expect(html).toContain('value="TEST12345"');
  });

  it("shares the help between registration and profile editing without adding it to login", () => {
    const registration = renderToStaticMarkup(createElement(AuthScreen, { ...authProps, mode: "register" }));
    const login = renderToStaticMarkup(createElement(AuthScreen, { ...authProps, mode: "login" }));
    const profile = renderToStaticMarkup(createElement(TouristProfileForm, { user: initialData.users.find((user) => user.role === "tourist")!, title: "Profile", description: "", primaryLabel: "Save", locale: "en", onSave: noop }));
    for (const html of [registration, profile]) {
      expect(html.match(/class="identity-number-help"/g)).toHaveLength(1);
      expect(html).toContain(translate("en", "auth.identityPlaceholder"));
    }
    expect(login).not.toContain("identity-number-help");
    expect(profile).toContain('class="field-pair profile-identity-fields"');
  });

  it.each([
    ["Malaysia", "A12345678"], ["United Kingdom", "123456789"], ["Canada", "A123456BC"], ["China", "EA1234567"], ["Other", "TEST12345"],
  ])("retains flexible entry checks for %s", (nationality, passportNumber) => {
    expect(hasTouristIdentity({ nationality, passportNumber })).toBe(true);
  });

  it("retains normalization and rejects malformed or out-of-bounds entries", () => {
    expect(normalizeIdentity(" ab-12 345 ")).toBe("AB12345");
    for (const passportNumber of ["ABCD", "A".repeat(21), "BAD#123", ""]) expect(hasTouristIdentity({ nationality: "Malaysia", passportNumber })).toBe(false);
  });
});
