import { translate, translateEnglish, englishTranslationSource, type Locale, type TranslationKey } from "./i18n";
import { translateAdminEnglish, englishAdminSource } from "./adminI18n";
import { coverageText } from "./coverageTranslations";
import { translatedActivitySource, englishActivitySource } from "./activityCopy";
import { translatedSosSource, englishSosSource } from "./sosCopy";
import { translatedEmergencySource, englishEmergencySource } from "./emergencyHelpCopy";

// Only use for app-authored copy, never for names, addresses or user reports.
export function uiText(locale: Locale, source: string, values: Record<string, string | number> = {}) {
  const featureText = translatedActivitySource(locale, source) ?? translatedSosSource(locale, source) ?? translatedEmergencySource(locale, source);
  if (featureText) return featureText;
  if (locale !== "en" && source.startsWith("Password must include ") && source.endsWith(".")) {
    const rules: Record<string, TranslationKey> = { "8 to 20 characters": "auth.passwordRuleLength", "at least one uppercase letter": "auth.passwordRuleUpper", "at least one lowercase letter": "auth.passwordRuleLower", "at least one number": "auth.passwordRuleNumber", "at least one symbol": "auth.passwordRuleSymbol" };
    const missing = source.slice("Password must include ".length, -1).split(", ");
    if (missing.every((rule) => rules[rule])) return uiText(locale, "Password must include {rules}.", { rules: new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(missing.map((rule) => translate(locale, rules[rule]))) });
  }
  const template = translateEnglish(locale, source) ?? translateAdminEnglish(locale, source) ?? coverageText(locale, source) ?? source;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}

export function hasUiTranslation(locale: Locale, source: string) {
  return locale === "en" || Boolean(translateEnglish(locale, source) ?? translateAdminEnglish(locale, source) ?? coverageText(locale, source) ?? translatedActivitySource(locale, source) ?? translatedSosSource(locale, source) ?? translatedEmergencySource(locale, source));
}

// Store app notifications in a stable source language so queued toasts can switch.
export function notificationSource(locale: Locale, text: string) {
  return locale === "en" ? text : englishTranslationSource(locale, text) ?? englishAdminSource(locale, text) ?? englishActivitySource(locale, text) ?? englishSosSource(locale, text) ?? englishEmergencySource(locale, text) ?? text;
}
