import type { Locale } from "./i18n";

const locales: Locale[] = ["en", "ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"];
type Pattern = { expression: RegExp; names: string[] };
type Entry = { source: string; translations: Record<Locale, string>; patterns: Partial<Record<Locale, Pattern>> };
const entries = new Map<string, Entry>();
const reverse = new Map<Locale, Map<string, string>>();
const templates: Entry[] = [];

function pattern(text: string): Pattern {
  const names: string[] = [];
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{(\w+)\\\}/g, (_match, name: string) => { names.push(name); return "(.+?)"; });
  return { expression: new RegExp(`^${escaped}$`), names };
}

function renderMatch(entry: Entry, from: Locale, to: Locale, text: string) {
  const compiled = entry.patterns[from] ??= pattern(entry.translations[from]);
  const match = compiled.expression.exec(text);
  if (!match) return;
  const values: Record<string, string> = {};
  for (let i = 0; i < compiled.names.length; i++) {
    const name = compiled.names[i], value = match[i + 1];
    if (values[name] !== undefined && values[name] !== value) return;
    values[name] = value;
  }
  return entry.translations[to].replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token);
}

// Feature modules register only when their existing chunk loads. This bridges
// their app-authored messages without eagerly importing all feature screens.
export function registerFeatureCopy<K extends string>(keys: readonly K[], text: (locale: Locale, key: K) => string) {
  for (const key of keys) {
    const source = text("en", key);
    const translations = Object.fromEntries(locales.map((locale) => [locale, text(locale, key)])) as Record<Locale, string>;
    if (!entries.has(source)) {
      const entry = { source, translations, patterns: {} };
      entries.set(source, entry);
      if (/\{\w+\}/.test(source)) templates.push(entry);
    }
    for (const locale of locales) {
      const lookup = reverse.get(locale) ?? new Map<string, string>();
      if (!lookup.has(translations[locale])) lookup.set(translations[locale], source);
      reverse.set(locale, lookup);
    }
  }
}

export function featureTranslation(locale: Locale, source: string) {
  const direct = entries.get(source);
  if (direct) return direct.translations[locale];
  for (const entry of templates) {
    const translated = renderMatch(entry, "en", locale, source);
    if (translated !== undefined) return translated;
  }
}

export function featureTranslationSource(locale: Locale, text: string) {
  const direct = reverse.get(locale)?.get(text);
  if (direct) return direct;
  for (const entry of templates) {
    const source = renderMatch(entry, locale, "en", text);
    if (source !== undefined) return source;
  }
}

export function registeredFeatureCopy() {
  return [...entries.values()].map(({ source, translations }) => ({ source, translations }));
}
