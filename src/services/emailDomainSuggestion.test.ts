import { describe, expect, it } from "vitest";
import { getEmailDomainSuggestion } from "./emailDomainSuggestion";
import { isValidEmail } from "./accounts";
import { localeOptions } from "./i18n";
import { uiText, hasUiTranslation } from "./uiText";

describe("email-domain typo guidance", () => {
  it("suggests common provider typos while preserving the mailbox and aliases", () => {
    for (const domain of ["gmai.co", "gmal.co", "gmal.com", "gmail.co", "gmail.con", "gmial.com", "gamil.com"]) {
      expect(isValidEmail(`Traveller+trip@${domain}`)).toBe(true);
      expect(getEmailDomainSuggestion(` Traveller+trip@${domain} `)).toEqual({ domain: "gmail.com", email: "Traveller+trip@gmail.com" });
    }
    expect(getEmailDomainSuggestion("guest@outlok.com")?.domain).toBe("outlook.com");
    expect(getEmailDomainSuggestion("guest@hotmial.com")?.domain).toBe("hotmail.com");
    expect(getEmailDomainSuggestion("guest@yaho.com")?.domain).toBe("yahoo.com");
    for (const { value: locale } of localeOptions) for (const source of ["Possible typo: did you mean @{domain}?", "Use @{domain}"]) {
      expect(hasUiTranslation(locale, source)).toBe(true);
      expect(uiText(locale, source, { domain: "gmail.com" })).toContain("@gmail.com");
      expect(uiText(locale, source, { domain: "gmail.com" })).not.toContain("{domain}");
    }
  });
  it("does not reject .co, unfamiliar domains, valid providers or incomplete addresses", () => {
    for (const email of ["guest@gmail.com", "guest@googlemail.com", "guest@yahoo.co.uk", "guest@yahoo.com.my", "guest@outlook.com", "guest@company.co", "guest@university.edu.my", "guest@custom.example", "guest@proton.me", "guest@icloud.com", "guest@gmail.com.example", "@gmai.co", "guest@gmai", "guest@@gmai.co"]) expect(getEmailDomainSuggestion(email)).toBeNull();
    expect(isValidEmail("guest@company.co")).toBe(true);
  });
});
