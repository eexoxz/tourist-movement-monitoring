import assert from "node:assert/strict";
import { test } from "vitest";
import { planCatalogueImport, validateCatalogue } from "./importPlan.mjs";

const place = {
  id: "my-example-garden", name: "Example Garden", state: "Penang", category: "nature", city: "George Town",
  address: "Example Garden, George Town, Penang, Malaysia", description: "A garden visitor destination.", latitude: 5.42, longitude: 100.33,
  averageVisitMinutes: 60, imageUrl: "/images/catalogue/my-example-garden.jpg", imageAlt: "Example Garden",
  sourceUrl: "https://example.com/garden", imageCredit: { author: "Photographer", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Garden.jpg" },
};

test("imports only new places and does not overwrite an existing record", () => {
  assert.equal(planCatalogueImport([place], []).create.length, 1);
  const existing = [{ ...place, name: "Edited by admin" }];
  assert.equal(planCatalogueImport([place], existing).create.length, 0);
  assert.equal(existing[0].name, "Edited by admin");
});
test("is idempotent and recognises name aliases with different IDs", () => {
  assert.equal(planCatalogueImport([place], [{ id: "admin-id", name: "EXAMPLE-GARDEN" }]).skip.length, 1);
  const first = planCatalogueImport([place], []);
  assert.equal(planCatalogueImport([place], first.create).create.length, 0);
});
test("rejects missing addresses, photographs, references and attribution before any writes", () => {
  for (const field of ["address", "imageUrl", "sourceUrl", "imageCredit"]) {
    const row = { ...place }; delete row[field];
    assert.throws(() => validateCatalogue([row]));
  }
});
test("rejects duplicate IDs, wrong coordinates, path traversal and artificial activity", () => {
  assert.throws(() => validateCatalogue([place, place]));
  for (const changes of [{ latitude: 51 }, { longitude: 0 }, { imageUrl: "/images/catalogue/../../secrets.jpg" }, { activitySummary: {} }]) {
    assert.throws(() => validateCatalogue([{ ...place, ...changes }]));
  }
});
