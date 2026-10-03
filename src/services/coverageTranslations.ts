import type { Locale } from "./i18n";
import { englishCatalog, getLocaleCatalog } from "./localeCatalog";
const aliases: Record<string, string> = {
  "Email does not look right": "Enter a valid email address.",
  "Name is missing": "Enter a name with at least two characters.",
  "Enter at least two characters for the tourist profile name.": "Enter a name with at least two characters.",
  "Password is too short": "Password must be at least 6 characters.",
  "Use at least 6 characters before continuing.": "Password must be at least 6 characters.",
  "Passwords do not match.": "Passwords do not match",
  "Nationality missing": "Choose your nationality from the list.",
  "Passport number missing": "Enter a valid passport number using letters or numbers.",
  "Login ready": "Logged in",
  "Enter a valid email address before resending verification.": "Enter a valid email address.",
  "Enter a valid email address before requesting a password reset.": "Enter a valid email address.",
  "Enter the email address for the Firebase account.": "Enter the email address used for this Firebase account.",
  "Password required": "Enter the password for this account before resending verification.",
  "Enter this account password before requesting another verification email.": "Enter the password for this account before resending verification.",
  "Destination saved.": "Destination saved",
  "Destination updated.": "Destination updated",
  "Destination deleted.": "Destination deleted",
  "Destination could not be saved.": "Destination not saved",
  "Destination could not be updated.": "Destination not updated",
  "Destination could not be deleted.": "Destination not deleted",
  "Choose an attraction before checking in.": "Choose an attraction and try again.",
  "Check out from your current attraction before checking in somewhere else.": "You already have an active attraction visit. Check out before scanning another place.",
  "No active check-in was found.": "No active check-in",
  "Enter a valid passport number using 5 to 20 letters or numbers.": "Use 5 to 20 letters or numbers from the passport.",
  "Unable to create tourist account.": "Registration failed",
  "Start a trip before adding a local test route.": "Start a trip first",
  "A trip is already being recorded.": "Tracking already active",
  "Start a trip before saving a movement point.": "Start a trip first",
  "No active trip is being recorded.": "No active trip",
  "Firebase registration failed.": "Registration failed",
  "Firebase password reset is not configured.": "Reset failed",
};
const templates = Object.keys(englishCatalog.coverage).filter((source) => /\{\w+\}/.test(source)).map((source) => {
  const names: string[] = [];
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{(\w+)\\\}/g, (_match, name: string) => { names.push(name); return "(.+?)"; });
  return { source, names, pattern: new RegExp(`^${escaped}$`) };
});

export const supplementalSources = [...Object.keys(englishCatalog.coverage), ...Object.keys(aliases)];

export function coverageText(locale: Locale, source: string): string | undefined {
  if (locale === "en") return source;
  const copy = getLocaleCatalog(locale)?.coverage;
  if (!copy) return undefined;
  const direct = copy[aliases[source] ?? source];
  if (direct) return direct;
  for (const template of templates) {
    const match = template.pattern.exec(source);
    if (!match) continue;
    const values = Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]]));
    return copy[template.source]?.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
  }
  return undefined;
}
