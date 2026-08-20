import { describe, expect, it } from "vitest";
import { destinations } from "../data/destinations";
import {
  addDestinationRecord,
  deleteDestinationRecord,
  destinationCategories,
  updateDestinationRecord,
  validateDestination,
} from "./destinationManagement";

describe("destination management service", () => {
  it("validates destination category and coordinates", () => {
    expect(destinationCategories).toContain("heritage");
    expect(
      validateDestination({
        name: "Test Destination",
        city: "Kuala Lumpur",
        category: "invalid",
        latitude: 3.1,
        longitude: 101.7,
        description: "A valid destination description.",
      }).error
    ).toContain("category");
    expect(
      validateDestination({
        name: "Test Destination",
        city: "Kuala Lumpur",
        category: "cultural",
        latitude: 120,
        longitude: 101.7,
        description: "A valid destination description.",
      }).error
    ).toContain("latitude");
  });

  it("adds a valid destination record", () => {
    const result = addDestinationRecord(destinations, {
      name: "National Textile Museum",
      city: "Kuala Lumpur",
      category: "cultural",
      latitude: 3.1467,
      longitude: 101.6942,
      description: "Museum focused on Malaysian textile heritage.",
      averageVisitMinutes: 75,
    });

    expect(result.error).toBeUndefined();
    expect(result.destination?.name).toBe("National Textile Museum");
    expect(result.destinations).toHaveLength(destinations.length + 1);
  });

  it("rejects duplicate destination records in the same city", () => {
    const result = addDestinationRecord(destinations, {
      name: "Merdeka Square",
      city: "Kuala Lumpur",
      category: "heritage",
      latitude: 3.1478,
      longitude: 101.6937,
      description: "Duplicate destination attempt.",
    });

    expect(result.error).toContain("already exists");
  });

  it("updates an existing destination record", () => {
    const result = updateDestinationRecord(destinations, {
      ...destinations[0],
      averageVisitMinutes: 65,
      description: "Updated heritage destination description.",
    });

    expect(result.error).toBeUndefined();
    expect(result.destination?.averageVisitMinutes).toBe(65);
    expect(result.destinations?.find((destination) => destination.id === destinations[0].id)?.averageVisitMinutes).toBe(65);
  });

  it("deletes destination records while keeping at least one destination", () => {
    const result = deleteDestinationRecord(destinations, destinations[0].id);
    const blocked = deleteDestinationRecord([destinations[0]], destinations[0].id);

    expect(result.error).toBeUndefined();
    expect(result.destinations).toHaveLength(destinations.length - 1);
    expect(blocked.error).toContain("At least one");
  });
});
