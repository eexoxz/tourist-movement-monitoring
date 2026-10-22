import { readFileSync, readdirSync } from "node:fs";
import { test, expect } from "vitest";
import { validateCatalogue, planCatalogueImport } from "./importPlan.mjs";

const { places } = JSON.parse(readFileSync(new URL("./locations-2026-10.json", import.meta.url), "utf8"));

test("the release contains validated venues across every state selector group", () => {
  expect(() => validateCatalogue(places)).not.toThrow();
  expect(places.length).toBeGreaterThan(100);
  expect(new Set(places.map(place => place.state)).size).toBe(14);
  expect(planCatalogueImport(places, places).create).toEqual([]);
});

test("every released venue has a real local image asset within the loading budget", () => {
  const files = readdirSync(new URL("../public/images/catalogue/", import.meta.url));
  expect(files.length).toBe(places.length);
  for (const place of places) {
    const bytes = readFileSync(new URL(`../public${place.imageUrl}`, import.meta.url));
    expect(bytes.length, place.id).toBeGreaterThan(1024);
    expect(bytes.length, place.id).toBeLessThanOrEqual(600000);
    const image = bytes[0] === 0xff && bytes[1] === 0xd8
      || bytes.subarray(1, 4).toString() === "PNG"
      || bytes.subarray(8, 12).toString() === "WEBP";
    expect(image, place.id).toBe(true);
  }
});

test("restricted-access venues retain practical guidance without artificial demand", () => {
  for (const place of places) {
    const source = new URL(place.coordinateSourceUrl);
    expect(source.protocol, place.id).toBe("https:");
    expect(["www.wikidata.org", "www.openstreetmap.org", "www.waze.com", "pokokkelapa.wordpress.com"], place.id).toContain(source.hostname);
    expect(source.username, place.id).toBe("");
    expect(source.password, place.id).toBe("");
    expect(place.visitTips.length, place.id).toBe(place.visitorGuidance.length);
    expect(place).not.toHaveProperty("visitorCount");
    expect(place).not.toHaveProperty("activitySummary");
  }
  expect(places.find(place => place.name.startsWith("Sky Mirror")).visitorGuidance).toContain("boat");
  expect(places.find(place => place.name === "Portuguese Settlement seafood area").visitorGuidance).toContain("residential");
});
