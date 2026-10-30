import { isValidEmail } from "./accounts";

// Advisory only: these are common provider misspellings, not a domain allow-list.
// Unfamiliar and country-specific domains remain valid and usable.
const providerSpellings: Record<string, readonly string[]> = {
  gmail: ["gmail", "gmai", "gmal", "gmil", "gail", "gamil", "gmial", "gnail", "gmaill"],
  outlook: ["outlook", "outlok", "otlook", "outllook", "outloook"],
  hotmail: ["hotmail", "hotmai", "hotmal", "hotmil", "hotmial", "htmail", "hotnail"],
  yahoo: ["yahoo", "yaho", "yahooo", "yhaoo", "yhoo"],
};
const comSpellings = new Set(["com", "co", "con", "cmo", "cm", "comm", "coom", "om"]);

export function getEmailDomainSuggestion(value: string) {
  const email = value.trim();
  if (!isValidEmail(email)) return null;
  const at = email.lastIndexOf("@");
  const domain = email.slice(at + 1).toLowerCase();
  const parts = domain.split(".");
  if (parts.length !== 2 || !comSpellings.has(parts[1])) return null;
  for (const [provider, spellings] of Object.entries(providerSpellings)) {
    const suggestedDomain = `${provider}.com`;
    if (domain !== suggestedDomain && spellings.includes(parts[0])) {
      return { domain: suggestedDomain, email: `${email.slice(0, at)}@${suggestedDomain}` };
    }
  }
  return null;
}
