import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { Locale } from "./i18n";
import { localizeDestination, localizeDestinations } from "./destinationLocale";

const nonEnglishLocales: Locale[] = ["ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"];

describe("destination localization", () => {
  const destination = initialData.destinations.find((row) => row.id === "kek-lok-si-temple")!;

  it("keeps English as the source catalogue copy", () => {
    expect(localizeDestination(destination, "en")).toBe(destination);
  });

  it.each(nonEnglishLocales)("localizes tourist-facing destination copy for %s", (locale) => {
    const localized = localizeDestination(destination, locale);

    expect(localized.description).not.toBe(destination.description);
    expect(localized.openingHours).toBeTruthy();
    expect(localized.openingHours).not.toBe(destination.openingHours);
    expect(localized.feeNote).toBeTruthy();
    expect(localized.feeNote).not.toBe(destination.feeNote);
    expect(localized.visitTips?.length).toBeGreaterThan(0);
    expect(localized.visitTips?.join(" ")).not.toBe(destination.visitTips?.join(" "));
  });

  it("localizes the full destination list without dropping ids or images", () => {
    const localized = localizeDestinations(initialData.destinations, "ja");

    expect(localized).toHaveLength(initialData.destinations.length);
    expect(localized.map((destination) => destination.id)).toEqual(initialData.destinations.map((destination) => destination.id));
    expect(localized.every((destination) => destination.imageUrl)).toBe(true);
  });

  it("uses localized Chinese names where natural translated names are available", () => {
    const localized = localizeDestination(destination, "zh");

    expect(localized.name).toBe("极乐寺");
  });
});
