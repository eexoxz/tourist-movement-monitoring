import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createLocaleSelection, getLocaleCatalog, loadLocaleCatalog } from "./localeCatalog";
import { localeOptions, type Locale } from "./i18n";
import originalHashes from "../locales/catalogueParity.json";

describe("language catalogue loading", () => {
  for (const { value: locale } of localeOptions) {
    it(`preserves the original catalogue payload in ${locale}`, async () => {
      await loadLocaleCatalog(locale);
      const catalog = getLocaleCatalog(locale)!;
      const newSources = new Set(["Language unavailable", "Could not load this language. Check your connection and try again.", "Stop recording this trip?"]);
      const originalCatalog = { ...catalog, coverage: Object.fromEntries(Object.entries(catalog.coverage).filter(([source]) => !newSources.has(source))) };
      const hash = createHash("sha256").update(JSON.stringify(originalCatalog)).digest("hex");
      expect(hash).toBe(originalHashes[locale]);
    });
  }

  it("keeps the old language until the requested language is ready", async () => {
    let finish!: () => void;
    const select = createLocaleSelection(() => new Promise<void>((resolve) => { finish = resolve; }));
    let visible: Locale = "en";
    const request = select("ja", (locale) => { visible = locale; });
    expect(visible).toBe("en");
    finish();
    await request;
    expect(visible).toBe("ja");
  });

  it("does not let a slower download overwrite the latest selection", async () => {
    const finishes = new Map<Locale, () => void>();
    const select = createLocaleSelection((locale) => new Promise<void>((resolve) => { finishes.set(locale, resolve); }));
    let visible: Locale = "en";
    const first = select("ja", (locale) => { visible = locale; });
    const second = select("fr", (locale) => { visible = locale; });
    finishes.get("fr")!();
    await second;
    finishes.get("ja")!();
    await first;
    expect(visible).toBe("fr");
  });

  it("leaves the current language intact after a failed download and allows retry", async () => {
    let failures = 1;
    const select = createLocaleSelection(async () => { if (failures-- > 0) throw new Error("offline"); });
    let visible: Locale = "en";
    await expect(select("ko", (locale) => { visible = locale; })).rejects.toThrow("offline");
    expect(visible).toBe("en");
    await select("ko", (locale) => { visible = locale; });
    expect(visible).toBe("ko");
  });

  it("ignores failures from a language the user has already deselected", async () => {
    let failFirst!: (error: Error) => void;
    const select = createLocaleSelection((locale) => locale === "ja" ? new Promise<void>((_resolve, reject) => { failFirst = reject; }) : Promise.resolve());
    let visible: Locale = "en";
    const first = select("ja", (locale) => { visible = locale; });
    await select("fr", (locale) => { visible = locale; });
    failFirst(new Error("offline"));
    await expect(first).resolves.toBeUndefined();
    expect(visible).toBe("fr");
  });
});
