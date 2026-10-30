import { describe, expect, it } from "vitest";
import { authErrorField, friendlyAuthError } from "./authError";
import { uiText, hasUiTranslation } from "./uiText";
import { localeOptions } from "./i18n";

describe("login feedback", () => {
  it("identifies the relevant field only when the provider identifies it", () => {
    const cases = [
      ["auth/invalid-email", "email", "Enter a valid email address."],
      ["auth/user-not-found", "email", "This email address is not registered. Create an account to continue."],
      ["auth/wrong-password", "password", "Incorrect password. Try again or reset your password."],
    ] as const;
    for (const [code, field, message] of cases) {
      expect(authErrorField({ code })).toBe(field);
      expect(friendlyAuthError({ code }, "Failed")).toBe(message);
      expect(friendlyAuthError(new Error(`Firebase: Error (${code}).`), "Failed")).toBe(message);
      for (const { value: locale } of localeOptions) {
        expect(hasUiTranslation(locale, message)).toBe(true);
        expect(uiText(locale, message).trim()).not.toBe("");
      }
    }
  });
  it("keeps protected and connection errors honest instead of guessing a wrong field", () => {
    for (const code of ["auth/invalid-credential", "auth/invalid-login-credentials"]) {
      expect(authErrorField({ code })).toBe("credentials");
      const message = friendlyAuthError({ code }, "Failed");
      expect(message).not.toContain("not registered");
      expect(message).not.toContain("Incorrect password");
      for (const { value: locale } of localeOptions) expect(hasUiTranslation(locale, message)).toBe(true);
    }
    expect(authErrorField({ code: "auth/network-request-failed" })).toBeUndefined();
    expect(friendlyAuthError({ code: "auth/network-request-failed" }, "Failed")).toContain("Connection failed");
    expect(friendlyAuthError(new Error("Internal details"), "Failed")).toBe("Failed");
  });
});
