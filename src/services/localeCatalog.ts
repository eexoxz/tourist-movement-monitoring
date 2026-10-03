import english from "../locales/en";
import type { Locale } from "./i18n";

export interface LocaleCatalog {
  main: Record<string, string>;
  admin: Record<string, string>;
  coverage: Record<string, string>;
}

const loaders = {
  ms: () => import("../locales/ms"),
  zh: () => import("../locales/zh"),
  ja: () => import("../locales/ja"),
  ko: () => import("../locales/ko"),
  pt: () => import("../locales/pt"),
  ta: () => import("../locales/ta"),
  es: () => import("../locales/es"),
  fr: () => import("../locales/fr"),
};
const catalogs = new Map<Locale, LocaleCatalog>([["en", english]]);
const pending = new Map<Locale, Promise<void>>();

export const englishCatalog = english;

export function getLocaleCatalog(locale: Locale) {
  return catalogs.get(locale);
}

export function loadLocaleCatalog(locale: Locale): Promise<void> {
  if (catalogs.has(locale) || locale === "en") return Promise.resolve();
  const existing = pending.get(locale);
  if (existing) return existing;
  const request = loaders[locale]().then(({ default: catalog }) => {
    catalogs.set(locale, catalog);
  }).finally(() => {
    pending.delete(locale);
  });
  pending.set(locale, request);
  return request;
}

// Keep the previous language visible until a complete catalogue is ready.
export function createLocaleSelection(load = loadLocaleCatalog) {
  let revision = 0;
  return async (locale: Locale, apply: (locale: Locale) => void) => {
    const selectedRevision = ++revision;
    try {
      await load(locale);
    } catch (error) {
      if (selectedRevision === revision) throw error;
      return;
    }
    if (selectedRevision === revision) apply(locale);
  };
}
