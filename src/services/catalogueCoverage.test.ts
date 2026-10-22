import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { discoveryStates } from "../data/discoveryAreas";
import type { Destination } from "../types";
import { getDestinationState } from "./destinationState";
import { getDiscoveryDestinations } from "./discovery";

const release = JSON.parse(readFileSync(new URL("../../catalogue/locations-2026-10.json", import.meta.url), "utf8")) as { places: Destination[] };
const destinations = [...initialData.destinations, ...release.places];

describe("minimum state catalogue coverage", () => {
  it.each(discoveryStates)("offers at least ten real catalogue entries when browsing %s", (state) => {
    const user = {
      ...initialData.users.find((user) => user.role === "tourist")!,
      discoveryLocationMode: "area" as const,
      discoveryAreaId: `state:${state}`,
    };
    const expected = destinations.filter((place) => getDestinationState(place) === state);
    const visible = getDiscoveryDestinations(destinations, user);
    expect(expected.length, state).toBeGreaterThanOrEqual(10);
    expect(visible.map((place) => place.id).sort()).toEqual(expected.map((place) => place.id).sort());
  });

  it("does not count duplicate IDs or names to reach the minimum", () => {
    expect(new Set(destinations.map((place) => place.id)).size).toBe(destinations.length);
    const keys = destinations.map((place) => `${getDestinationState(place)}:${place.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    expect(new Set(keys).size).toBe(destinations.length);
  });
});
